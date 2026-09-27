export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getAdminClient } from "@/lib/supabase/admin";
import { verifyEntitlement, verifyAnonymousToken } from "@/lib/entitlement";
import { getCreditRecord, getFreeEntitlementRecord, getAuthUserLedger, syncAuthUserLedger } from "@/lib/ledger";

function getCookieValue(cookieHeader: string, key: string): string | undefined {
  return cookieHeader
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${key}=`))
    ?.split("=")
    .slice(1)
    .join("=");
}

export async function GET(req: Request) {
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

    // 1. Authenticated User Flow
    if (user) {
      const admin = getAdminClient();
      let freeUsed = false;
      let paidCredits = 0;

      if (admin) {
        const { data: entRecord } = await admin
          .from("entitlements")
          .select("free_analysis_used, paid_credits")
          .eq("user_id", user.id)
          .single();

        if (entRecord) {
          freeUsed = Boolean(entRecord.free_analysis_used);
          paidCredits = Number(entRecord.paid_credits) || 0;
          await syncAuthUserLedger(user.id, { freeUsed, paidCredits });
        }
      } else {
        const cached = await getAuthUserLedger(user.id);
        if (cached) {
          freeUsed = cached.freeUsed;
          paidCredits = cached.paidCredits;
        }
      }

      return NextResponse.json({
        authenticated: true,
        user: {
          id: user.id,
          email: user.email,
        },
        entitled: paidCredits > 0 || !freeUsed,
        freeUsed,
        freeRemaining: freeUsed ? 0 : 1,
        creditsRemaining: paidCredits,
        totalCredits: paidCredits + (freeUsed ? 0 : 1),
      });
    }

    // 2. Anonymous / Visitor Flow (Phase 1 Baseline)
    const cookieHeader = req.headers.get("cookie") || "";

    // Check paid entitlement cookie
    const entitlementCookie = getCookieValue(cookieHeader, "paid_entitlement");
    if (entitlementCookie) {
      const entitlement = verifyEntitlement(entitlementCookie);
      if (entitlement && entitlement.orderId) {
        const record = await getCreditRecord(entitlement.orderId);
        if (record) {
          const isExpired = Date.now() > record.expiresAt;
          if (isExpired) {
            return NextResponse.json({
              authenticated: false,
              entitled: false,
              expired: true,
              creditsRemaining: 0,
              totalCredits: record.totalCredits,
              freeRemaining: 0,
            });
          }

          return NextResponse.json({
            authenticated: false,
            entitled: true,
            creditsRemaining: record.creditsRemaining,
            totalCredits: record.totalCredits,
            plan: record.plan,
            expiresAt: record.expiresAt,
            freeRemaining: 0,
          });
        }
      }
    }

    // Check anonymous free entitlement
    const rawAnonCookie = getCookieValue(cookieHeader, "crc_anon_id");
    const parsedAnonToken = verifyAnonymousToken(rawAnonCookie);

    let freeUsed = false;
    if (parsedAnonToken) {
      const freeRecord = await getFreeEntitlementRecord(parsedAnonToken.anonId);
      if (freeRecord) {
        freeUsed = true;
      }
    }

    return NextResponse.json({
      authenticated: false,
      entitled: !freeUsed,
      creditsRemaining: 0,
      totalCredits: 0,
      freeUsed,
      freeRemaining: freeUsed ? 0 : 1,
    });
  } catch (err) {
    console.error("GET /api/entitlement error:", err);
    return NextResponse.json({ authenticated: false, entitled: false, freeRemaining: 1 });
  }
}
