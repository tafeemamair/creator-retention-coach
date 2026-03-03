import { NextResponse } from "next/server";
import { analyzeRetention } from "../../../lib/analyze";

function getCookieValue(cookieHeader: string, key: string): string | undefined {
  const cookies = cookieHeader
    .split(";")
    .map((cookie) => cookie.trim())
    .filter(Boolean);

  for (const cookie of cookies) {
    const [name, ...rest] = cookie.split("=");
    if (name === key) {
      return rest.join("=");
    }
  }

  return undefined;
}

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
  const freeUseRaw = getCookieValue(cookieHeader, "free_used");
  const freeUseCount = freeUseRaw ? parseInt(freeUseRaw, 10) : 0;
  const safeFreeUseCount = Number.isNaN(freeUseCount) ? 0 : freeUseCount;
  const isPaid = getCookieValue(cookieHeader, "paid") === "true";

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

  if (safeFreeUseCount >= FREE_LIMIT) {
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
    `free_used=${safeFreeUseCount + 1}; Path=/; Max-Age=2592000; SameSite=Lax`
  );

  return response;
}
