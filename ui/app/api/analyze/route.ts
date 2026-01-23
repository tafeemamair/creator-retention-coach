import { NextResponse } from "next/server";
import { analyzeRetention } from "../../../lib/analyze";

let freeUsageCount = 0;

export async function POST(req: Request) {
  const body = await req.json();

  // BASIC VALIDATION
  return NextResponse.json(
    { error: "Please paste a script before analyzing." },
    { status: 400 }
  );



  // FREE TIER LIMIT (₹49 paywall)
  if (freeUsageCount >= 1) {
    return NextResponse.json({
      blocked: true,
      price: 49,
      message: "Free limit reached. Unlock full analysis for ₹49."
    });
  }

  freeUsageCount++;

  const result = await analyzeRetention(body);

  return NextResponse.json({
    blocked: false,
    result
  });
}
