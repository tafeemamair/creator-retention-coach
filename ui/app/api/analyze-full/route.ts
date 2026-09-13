import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { analyzeRetention, type FullAnalysis } from "../../../lib/analyze";
import { ENTITLEMENT_COOKIE, verifyEntitlementToken } from "../../../lib/payment";

export async function POST(req: Request) {
  const body = await req.json();
  const script = body?.script as string;

  if (!script?.trim()) {
    return NextResponse.json({ message: "Please paste a script before analyzing." }, { status: 400 });
  }

  const sessionSecret = process.env.PAYMENT_SESSION_SECRET;
  const entitlement = (await cookies()).get(ENTITLEMENT_COOKIE)?.value;

  if (!sessionSecret || !verifyEntitlementToken(entitlement, sessionSecret)) {
    return NextResponse.json(
      {
        blocked: true,
        message: "Please complete the ₹49 payment to unlock full analysis, script rewrites, and title suggestions.",
      },
      { status: 402 },
    );
  }

  const analysis = (await analyzeRetention(script, { full: true })) as FullAnalysis;
  return NextResponse.json({ blocked: false, analysis });
}
