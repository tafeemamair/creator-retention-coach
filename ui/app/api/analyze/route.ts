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

  // 2️⃣ READ COOKIES
  const cookieHeader = req.headers.get("cookie") || "";
  const freeUseMatch = cookieHeader.match(/free_used=(\d+)/);
  const freeUseCount = freeUseMatch ? parseInt(freeUseMatch[1], 10) : 0;
  const isPaid = cookieHeader.includes("paid=true");

  // 3️⃣ IF PAID → FULL ANALYSIS
  if (isPaid) {
    const result = await analyzeRetention(script, { full: true });
    return NextResponse.json({
      blocked: false,
      result,
    });
  }

  // 4️⃣ FREE LIMIT CHECK
  const FREE_LIMIT = 2;

  if (freeUseCount >= FREE_LIMIT) {
    return NextResponse.json({
      blocked: true,
      price: 49,
      message: `Free limit of ${FREE_LIMIT} uses reached. Unlock full analysis for ₹49.`,
    });
  }

  // 5️⃣ FREE PREVIEW ANALYSIS
  const result = await analyzeRetention(script, { full: false });

  const response = NextResponse.json({
    blocked: false,
    result,
  });

  // 6️⃣ INCREMENT FREE USAGE COUNT
  response.headers.set(
    "Set-Cookie",
    `free_used=${freeUseCount + 1}; Path=/; Max-Age=2592000; SameSite=Lax`
  );

  return response;
}