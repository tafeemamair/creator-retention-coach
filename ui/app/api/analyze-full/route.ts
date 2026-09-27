export const runtime = "nodejs";

import { NextResponse } from "next/server";
import crypto from "crypto";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getAdminClient } from "@/lib/supabase/admin";
import { analyzeRetention, type FullAnalysis } from "../../../lib/analyze";
import {
  verifyEntitlement,
  verifyAnonymousToken,
  createAnonymousToken,
  signPayload,
  type EntitlementPayload,
} from "../../../lib/entitlement";
import {
  consumeCredit,
  rollbackCredit,
  consumeFreeEntitlement,
  rollbackFreeEntitlement,
  getCreditRecord,
  consumeAuthUserCredit,
  rollbackAuthUserCredit,
  markScriptAnalyzedInHotCache,
  syncAuthUserLedger,
} from "../../../lib/ledger";
import { validateScript } from "../../../lib/validation";

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
    const body = await req.json();
    const script = body?.script as string;
    const platform = (body?.platform as string) || "YouTube Shorts";
    const targetLanguage = body?.targetLanguage as string | undefined;
    const parentId = typeof body?.parentId === "string" && body.parentId.trim()
      ? body.parentId.trim()
      : typeof body?.parent_analysis_id === "string" && body.parent_analysis_id.trim()
      ? body.parent_analysis_id.trim()
      : undefined;

    const validation = validateScript(script);
    if (!validation.valid) {
      return NextResponse.json({ message: validation.error }, { status: 400 });
    }

    const scriptTrimmed = script.trim();
    const scriptHash = crypto.createHash("sha256").update(scriptTrimmed).digest("hex");
    const cookieHeader = req.headers.get("cookie") || "";

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

    // Reject unauthenticated requests attempting to create revisions
    if (parentId && !user) {
      return NextResponse.json(
        { error: "Authentication required to create a revision" },
        { status: 401 }
      );
    }

    const admin = getAdminClient();

    // ==============================================================================
    // 1. AUTHENTICATED CREATOR WORKSPACE FLOW
    // ==============================================================================
    if (user) {
      const userId = user.id;

      // 1a. Validate parent_analysis_id if provided: must belong to authenticated user
      let validatedParentId: string | null = null;
      if (parentId) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (typeof parentId !== "string" || !uuidRegex.test(parentId)) {
          return NextResponse.json(
            { error: "Malformed parent analysis ID" },
            { status: 400 }
          );
        }

        if (admin) {
          const { data: parentRecord, error: parentError } = await admin
            .from("analyses")
            .select("id, user_id")
            .eq("id", parentId)
            .maybeSingle();

          if (parentError || !parentRecord) {
            return NextResponse.json(
              { error: "Parent analysis not found" },
              { status: 404 }
            );
          }

          if (parentRecord.user_id !== userId) {
            return NextResponse.json(
              { error: "Unauthorized: parent analysis belongs to another user" },
              { status: 403 }
            );
          }

          validatedParentId = parentRecord.id;
        }
      }

      // 1b. Check DB uniqueness / existing analysis for same-script idempotency
      if (admin) {
        const { data: existingSaved } = await admin
          .from("analyses")
          .select("*")
          .eq("user_id", userId)
          .eq("script_hash", scriptHash)
          .eq("platform", platform)
          .single();

        if (existingSaved && existingSaved.analysis_result) {
          await markScriptAnalyzedInHotCache(userId, scriptHash, platform);
          let paidCredits = 0;
          const { data: entRecord } = await admin
            .from("entitlements")
            .select("paid_credits")
            .eq("user_id", userId)
            .maybeSingle();
          if (entRecord && typeof entRecord.paid_credits === "number") {
            paidCredits = entRecord.paid_credits;
          }
          return NextResponse.json({
            blocked: false,
            analysisId: existingSaved.id,
            analysis: existingSaved.analysis_result,
            isFreeAnalysis: false,
            idempotent: true,
            creditsRemaining: paidCredits,
            message: "Idempotent re-analysis: 0 credits consumed.",
          });
        }
      }

      // 1c. Atomically check and reserve credit in Redis hot ledger
      let consumeResult = await consumeAuthUserCredit(userId, scriptHash, platform);

      if (!consumeResult.success && consumeResult.status === "sync_required" && admin) {
        // Hydrate Redis from PostgreSQL authoritative record
        const { data: entRecord } = await admin
          .from("entitlements")
          .select("free_analysis_used, paid_credits")
          .eq("user_id", userId)
          .single();

        if (entRecord) {
          await syncAuthUserLedger(userId, {
            freeUsed: entRecord.free_analysis_used,
            paidCredits: entRecord.paid_credits,
          });
          consumeResult = await consumeAuthUserCredit(userId, scriptHash, platform);
        }
      }

      if (!consumeResult.success) {
        if (consumeResult.status === "concurrency_locked") {
          return NextResponse.json(
            { blocked: true, error: "Concurrency lock", message: consumeResult.error },
            { status: 409 }
          );
        }
        return NextResponse.json(
          {
            blocked: true,
            error: "No credits remaining",
            message: "You have used your available analysis credits. Choose a plan to continue.",
            freeUsed: true,
            creditsRemaining: 0,
          },
          { status: 402 }
        );
      }

      // 1d. Execute AI Retention Analysis Engine
      let analysis: FullAnalysis;
      try {
        analysis = (await analyzeRetention(scriptTrimmed, { full: true, platform, targetLanguage })) as FullAnalysis;
      } catch (analysisErr) {
        console.error("AI Analysis execution failed for user:", userId, analysisErr);
        // Atomic Rollback
        if (consumeResult.status === "consumed_free") {
          await rollbackAuthUserCredit(userId, scriptHash, "free", platform);
        } else if (consumeResult.status === "consumed_paid") {
          await rollbackAuthUserCredit(userId, scriptHash, "paid", platform);
        }
        return NextResponse.json(
          { error: "Failed to generate retention analysis. Please try again." },
          { status: 500 }
        );
      }

      // 1e. Commit Analysis and Entitlement to PostgreSQL
      let savedAnalysisId: string | null = null;
      if (admin) {
        try {
          const title = scriptTrimmed.split("\n")[0].substring(0, 60) || "Untitled Script";

          // Insert or update analysis record
          const { data: savedRecord } = await admin.from("analyses").upsert(
            {
              user_id: userId,
              title,
              script: scriptTrimmed,
              language: analysis.detectedLanguage || "en",
              detected_language: analysis.detectedLanguage || "en",
              target_language: analysis.targetLanguage || analysis.detectedLanguage || "en",
              platform,
              overall_score: analysis.score,
              analysis_result: analysis,
              predicted_timeline: analysis.retentionTimeline,
              script_hash: scriptHash,
              parent_analysis_id: validatedParentId || null,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id,script_hash,platform" }
          ).select("id").maybeSingle();

          if (savedRecord?.id) {
            savedAnalysisId = savedRecord.id;
          }

          // Update authoritative entitlement in DB
          if (consumeResult.status === "consumed_free") {
            await admin
              .from("entitlements")
              .update({ free_analysis_used: true, updated_at: new Date().toISOString() })
              .eq("user_id", userId);
          } else if (consumeResult.status === "consumed_paid") {
            const { data: curEnt } = await admin
              .from("entitlements")
              .select("paid_credits")
              .eq("user_id", userId)
              .single();

            const updatedBal = Math.max(0, (curEnt?.paid_credits ?? 1) - 1);
            await admin
              .from("entitlements")
              .update({ paid_credits: updatedBal, updated_at: new Date().toISOString() })
              .eq("user_id", userId);
          }

          // Mark hot idempotency cache
          await markScriptAnalyzedInHotCache(userId, scriptHash, platform);
        } catch (dbErr) {
          console.error("Failed to commit analysis to PostgreSQL:", dbErr);
          // Rollback Redis reservation
          if (consumeResult.status === "consumed_free") {
            await rollbackAuthUserCredit(userId, scriptHash, "free", platform);
          } else if (consumeResult.status === "consumed_paid") {
            await rollbackAuthUserCredit(userId, scriptHash, "paid", platform);
          }
          return NextResponse.json(
            { error: "Failed to save analysis to workspace. Credit was preserved." },
            { status: 500 }
          );
        }
      }

      return NextResponse.json({
        blocked: false,
        analysisId: savedAnalysisId,
        analysis,
        isFreeAnalysis: consumeResult.status === "consumed_free",
        freeUsed: true,
        freeRemaining: 0,
        creditsRemaining: consumeResult.record?.paidCredits ?? 0,
        totalCredits: (consumeResult.record?.paidCredits ?? 0) + (consumeResult.record?.freeUsed ? 0 : 1),
      });
    }

    // ==============================================================================
    // 2. ANONYMOUS / VISITOR FLOW (PHASE 1 BASELINE PRESERVED)
    // ==============================================================================

    // 2a. Check if user holds a valid paid entitlement cookie
    const entitlementCookie = getCookieValue(cookieHeader, "paid_entitlement");
    const entitlement = verifyEntitlement(entitlementCookie);

    let isPaidUser = false;
    let paidOrderId: string | null = null;

    if (entitlement && entitlement.orderId) {
      const record = await getCreditRecord(entitlement.orderId);
      if (record && record.creditsRemaining > 0 && record.expiresAt > Date.now()) {
        isPaidUser = true;
        paidOrderId = entitlement.orderId;
      }
    }

    // 2b. Identify Anonymous Token for Free Entitlement
    let anonId: string;
    let newAnonCookieToSet: string | null = null;

    const rawAnonCookie = getCookieValue(cookieHeader, "crc_anon_id");
    const parsedAnonToken = verifyAnonymousToken(rawAnonCookie);

    if (parsedAnonToken) {
      anonId = parsedAnonToken.anonId;
    } else {
      const created = createAnonymousToken();
      anonId = created.anonId;
      newAnonCookieToSet = created.signedCookie;
    }

    // 2c. Atomically consume credit (Paid Credit or 1 Free Analysis)
    let consumeType: "paid" | "free" = "free";
    let paidConsumeRecord: (ReturnType<typeof consumeCredit> extends Promise<infer R> ? R : never) | undefined = undefined;
    let freeConsumeRecord: (ReturnType<typeof consumeFreeEntitlement> extends Promise<infer R> ? R : never) | undefined = undefined;

    if (isPaidUser && paidOrderId) {
      consumeType = "paid";
      paidConsumeRecord = await consumeCredit(paidOrderId, scriptHash);

      if (!paidConsumeRecord.success) {
        if (paidConsumeRecord.status === "no_credits") {
          return NextResponse.json(
            {
              blocked: true,
              error: "No credits remaining",
              message: "No report credits remaining. Please choose a plan to continue.",
            },
            { status: 402 }
          );
        }
        if (paidConsumeRecord.status === "expired") {
          return NextResponse.json(
            {
              blocked: true,
              error: "Credit pack has expired",
              message: "Your credit pack has expired. Please choose a plan to continue.",
            },
            { status: 402 }
          );
        }
        return NextResponse.json(
          {
            blocked: true,
            error: "Entitlement error",
            message: "Active entitlement could not be verified. Please purchase a plan.",
          },
          { status: 402 }
        );
      }
    } else {
      consumeType = "free";
      freeConsumeRecord = await consumeFreeEntitlement(anonId, scriptHash);

      if (!freeConsumeRecord.success) {
        return NextResponse.json(
          {
            blocked: true,
            error: "Free analysis limit reached",
            message: "You have used your 1 free full analysis report. Choose a plan below to continue.",
            freeUsed: true,
          },
          { status: 402 }
        );
      }
    }

    // 2d. Generate Full Analysis Report
    let analysis: FullAnalysis;
    try {
      analysis = (await analyzeRetention(scriptTrimmed, { full: true, platform, targetLanguage })) as FullAnalysis;
    } catch (analysisErr) {
      console.error("Analysis execution failed:", analysisErr);

      // Safe Rollback
      if (consumeType === "paid" && paidOrderId && paidConsumeRecord!.status === "consumed") {
        try {
          await rollbackCredit(paidOrderId, scriptHash);
        } catch (rollbackErr) {
          console.error("Failed to rollback paid credit:", rollbackErr);
        }
      } else if (consumeType === "free" && freeConsumeRecord!.status === "granted") {
        try {
          await rollbackFreeEntitlement(anonId);
        } catch (rollbackErr) {
          console.error("Failed to rollback free entitlement:", rollbackErr);
        }
      }

      return NextResponse.json(
        { error: "Failed to generate retention analysis. Please try again." },
        { status: 500 }
      );
    }

    // 2e. Build Response for Anonymous User
    const isFree = consumeType === "free";
    const paidRecord = !isFree && paidConsumeRecord && "record" in paidConsumeRecord ? paidConsumeRecord.record : undefined;

    const responsePayload = {
      blocked: false,
      analysis,
      isFreeAnalysis: isFree,
      freeUsed: isFree ? true : false,
      freeRemaining: 0,
      creditsRemaining: isFree ? 0 : (paidRecord?.creditsRemaining ?? 0),
      totalCredits: isFree ? 1 : (paidRecord?.totalCredits ?? 1),
      plan: isFree ? "free" : (paidRecord?.plan ?? "single"),
    };

    const response = NextResponse.json(responsePayload);

    const isHttps =
      req.headers.get("x-forwarded-proto") === "https" ||
      new URL(req.url).protocol === "https:";
    const secureFlag = isHttps ? "; Secure" : "";

    // Set anonymous tracking cookie if newly issued
    if (newAnonCookieToSet) {
      response.headers.set(
        "Set-Cookie",
        `crc_anon_id=${newAnonCookieToSet}; Path=/; Max-Age=2592000; HttpOnly${secureFlag}; SameSite=Lax`
      );
    }

    // If paid credit was consumed, sync entitlement cookie
    if (!isFree && paidConsumeRecord!.status === "consumed" && entitlement) {
      const issueTime = Date.now();
      const expiryTime = paidConsumeRecord!.record.expiresAt;
      const maxAgeSeconds = Math.max(0, Math.floor((expiryTime - issueTime) / 1000));

      const updatedPayload: EntitlementPayload = {
        orderId: entitlement.orderId,
        paymentId: entitlement.paymentId,
        plan: paidConsumeRecord!.record.plan,
        creditsRemaining: paidConsumeRecord!.record.creditsRemaining,
        totalCredits: paidConsumeRecord!.record.totalCredits,
        issueTime: entitlement.issueTime,
        expiryTime,
        version: 1,
      };

      const updatedCookie = signPayload(updatedPayload);

      response.headers.set(
        "Set-Cookie",
        `paid_entitlement=${updatedCookie}; Path=/; Max-Age=${maxAgeSeconds}; HttpOnly${secureFlag}; SameSite=Lax`
      );
    }

    return response;
  } catch (error) {
    console.error("Analyze full handler error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
