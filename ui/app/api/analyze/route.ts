import { NextResponse } from "next/server";
import { analyzeRetention } from "../../../lib/analyze";

export async function POST(req: Request) {
  const body = await req.json();
  const script = body?.script;

  // 1️⃣ BASIC VALIDATION
  if (!script || !script.trim()) {
    return NextResponse.json(
      { error: "Please paste a script before analyzing." },
      { status: 400 }
    );
  }

  // 2️⃣ READ COOKIE
  const cookieHeader = req.headers.get("cookie") || "";
  const hasUsedFree = cookieHeader.includes("free_used=true");

  if (hasUsedFree) {
    return NextResponse.json({
      blocked: true,
      price: 49,
      message: "Free limit reached. Unlock full analysis for ₹49."
    });
  }

  // 3️⃣ RUN ANALYSIS
  const result = await analyzeRetention(script);

  // 4️⃣ SET COOKIE (mark free usage consumed)
  const response = NextResponse.json({
    blocked: false,
    result
  });

  response.headers.set(
    "Set-Cookie",
    "free_used=true; Path=/; Max-Age=2592000" // 30 days
  );

  return response;
}

