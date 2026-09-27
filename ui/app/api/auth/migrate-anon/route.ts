export const runtime = "nodejs";

import { NextResponse } from "next/server";
import crypto from "crypto";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getAdminClient } from "@/lib/supabase/admin";
import { verifyAnonymousToken, verifyEntitlement } from "@/lib/entitlement";
import { getRedisClient, getFreeEntitlementRecord, syncAuthUserLedger } from "@/lib/ledger";
import { validateScript } from "@/lib/validation";
import { analyzeRetention, type FullAnalysis } from "@/lib/analyze";

function getCookieValue(cookieHeader: string, key: string): string | undefined {
  return cookieHeader
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${key}=`))
    ?.split("=")
    .slice(1)
    .join("=");
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-project.supabase.co";
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignored
          }
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Authentication required for state migration." }, { status: 401 });
    }

    const userId = user.id;
    const cookieHeader = req.headers.get("cookie") || "";
    const redis = getRedisClient();
    const admin = getAdminClient();

    let body: { script?: string; platform?: string } = {};
    try {
      body = (await req.json()) as { script?: string; platform?: string };
    } catch {
      // Empty body is acceptable
    }

    let freeMigrated = false;
    let paidCreditsMigrated = 0;
    let analysisMigrated = false;

    // 1. Process Anonymous Free Entitlement Migration
    const rawAnonCookie = getCookieValue(cookieHeader, "crc_anon_id");
    const parsedAnonToken = verifyAnonymousToken(rawAnonCookie);

    if (parsedAnonToken && redis) {
      const anonId = parsedAnonToken.anonId;
      const replayKey = `migrated_anon:${anonId}`;

      // Check replay defense
      const alreadyClaimed = await redis.get<string>(replayKey);
      if (!alreadyClaimed) {
        const freeRecord = await getFreeEntitlementRecord(anonId);
        if (freeRecord) {
          // Mark target user's free entitlement as used
          if (admin) {
            await admin
              .from("entitlements")
              .update({ free_analysis_used: true, updated_at: new Date().toISOString() })
              .eq("user_id", userId);
          }
          freeMigrated = true;
        }
        await redis.set(replayKey, userId, { ex: 2592000 });
      }
    }

    // 2. Process Verified Paid Entitlement Migration
    const rawPaidCookie = getCookieValue(cookieHeader, "paid_entitlement");
    const parsedPaidToken = verifyEntitlement(rawPaidCookie);

    if (parsedPaidToken && admin) {
      const orderId = parsedPaidToken.orderId;

      // Authoritatively verify order in payment_orders table
      const { data: orderRecord } = await admin
        .from("payment_orders")
        .select("*")
        .eq("order_id", orderId)
        .single();

      if (orderRecord && orderRecord.status === "paid" && !orderRecord.claimed_by_user_id) {
        const creditsToTransfer = parsedPaidToken.creditsRemaining ?? orderRecord.credits;

        // Atomically claim the order and increment user's balance
        const { error: claimErr } = await admin
          .from("payment_orders")
          .update({ claimed_by_user_id: userId, updated_at: new Date().toISOString() })
          .eq("order_id", orderId)
          .is("claimed_by_user_id", null);

        if (!claimErr) {
          const { data: entRecord } = await admin
            .from("entitlements")
            .select("paid_credits")
            .eq("user_id", userId)
            .single();

          const currentCredits = entRecord?.paid_credits ?? 0;
          const newCredits = currentCredits + creditsToTransfer;

          await admin
            .from("entitlements")
            .update({ paid_credits: newCredits, updated_at: new Date().toISOString() })
            .eq("user_id", userId);

          paidCreditsMigrated = creditsToTransfer;
        }
      }
    }

    // 3. Process Active Analysis History Migration
    if (body.script && typeof body.script === "string" && admin) {
      const script = body.script.trim();
      const platform = body.platform || "YouTube Shorts";
      const validation = validateScript(script);

      if (validation.valid) {
        const scriptHash = crypto.createHash("sha256").update(script).digest("hex");

        // Check if analysis already exists in DB
        const { data: existingAnalysis } = await admin
          .from("analyses")
          .select("id")
          .eq("user_id", userId)
          .eq("script_hash", scriptHash)
          .eq("platform", platform)
          .single();

        if (!existingAnalysis) {
          // Generate verified server-side analysis
          const fullAnalysis = (await analyzeRetention(script, { full: true, platform })) as FullAnalysis;
          const title = script.split("\n")[0].substring(0, 60) || "Untitled Script";

          await admin.from("analyses").insert({
            user_id: userId,
            title,
            script,
            language: "en",
            platform,
            overall_score: fullAnalysis.score,
            analysis_result: fullAnalysis,
            predicted_timeline: fullAnalysis.retentionTimeline,
            script_hash: scriptHash,
          });

          analysisMigrated = true;
        }
      }
    }

    // 4. Sync Redis Hot Cache from DB
    if (admin) {
      const { data: finalEnt } = await admin
        .from("entitlements")
        .select("free_analysis_used, paid_credits")
        .eq("user_id", userId)
        .single();

      if (finalEnt) {
        await syncAuthUserLedger(userId, {
          freeUsed: finalEnt.free_analysis_used,
          paidCredits: finalEnt.paid_credits,
        });
      }
    }

    // 5. Respond and clear anonymous cookies
    const response = NextResponse.json({
      success: true,
      freeMigrated,
      paidCreditsMigrated,
      analysisMigrated,
    });

    const isHttps =
      req.headers.get("x-forwarded-proto") === "https" ||
      new URL(req.url).protocol === "https:";
    const secureFlag = isHttps ? "; Secure" : "";

    response.headers.append(
      "Set-Cookie",
      `crc_anon_id=; Path=/; Max-Age=0; HttpOnly${secureFlag}; SameSite=Lax`
    );
    response.headers.append(
      "Set-Cookie",
      `paid_entitlement=; Path=/; Max-Age=0; HttpOnly${secureFlag}; SameSite=Lax`
    );

    return response;
  } catch (err) {
    console.error("Migration endpoint error:", err);
    return NextResponse.json({ error: "Failed to migrate anonymous state." }, { status: 500 });
  }
}
