export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { analyzeRetention, type PreviewAnalysis } from "../../../lib/analyze";
import { verifyEntitlement } from "../../../lib/entitlement";
import { getCreditRecord } from "../../../lib/ledger";
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
  const body = await req.json();
  const script = body?.script as string;
  const platform = body?.platform as string;

  const validation = validateScript(script);
  if (!validation.valid) {
    return NextResponse.json({ message: validation.error }, { status: 400 });
  }

  const cookieHeader = req.headers.get("cookie") || "";

  // Check if user has a valid active paid entitlement
  let hasValidPaidEntitlement = false;
  const entitlementCookie = getCookieValue(cookieHeader, "paid_entitlement");
  if (entitlementCookie) {
    const entitlement = verifyEntitlement(entitlementCookie);
    if (entitlement) {
      try {
        const record = await getCreditRecord(entitlement.orderId);
        if (record && record.creditsRemaining > 0 && record.expiresAt > Date.now()) {
          hasValidPaidEntitlement = true;
        }
      } catch (err) {
        console.warn("Failed to check credit record for preview exemption:", err);
      }
    }
  }

  // Generate lightweight preview
  const preview = (await analyzeRetention(script.trim(), { full: false, platform })) as PreviewAnalysis;

  return NextResponse.json({
    blocked: false,
    preview,
    isPaidUser: hasValidPaidEntitlement,
    message: "Retention preview ready.",
  });
}
