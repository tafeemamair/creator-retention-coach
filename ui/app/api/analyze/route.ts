import { NextResponse } from "next/server";
import { analyzeRetention } from "../../../lib/analyze";

type PreviewData = {
  estimatedDuration: string;
  hookScore: number;
  retentionRisk: string;
  dropOffEstimate: string;
};

function buildPreviewData(script: string): PreviewData {
  const lines = script
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const words = script.split(/\s+/).filter(Boolean);
  const estimatedSeconds = Math.max(8, Math.round((words.length / 150) * 60));
  const estimatedDuration = `${Math.floor(estimatedSeconds / 60)}m ${estimatedSeconds % 60}s`;

  const hook = lines.slice(0, 2).join(" ").trim();
  const hookWordCount = hook.split(/\s+/).filter(Boolean).length;
  const hookHasCuriosity = /(\?|why|what|how|discover|secret|mistake|you’ll never|imagine|surprising)/i.test(
    hook
  );
  const hookHasPowerVerb = /^(imagine|what if|here’s why|let’s|picture this|watch this|did you know|stop|don’t)/i.test(
    hook
  );

  let hookBaseScore = 4;
  if (hookHasCuriosity) hookBaseScore += 3;
  if (hookHasPowerVerb) hookBaseScore += 2;
  if (hookWordCount > 20) hookBaseScore -= 2;
  if (hookWordCount > 0 && hookWordCount <= 15) hookBaseScore += 1;
  const hookScore = Math.max(0, Math.min(10, hookBaseScore));

  const hasLongLine = lines.some((line) => line.split(/\s+/).filter(Boolean).length > 30);
  const noQuestionOrYou = !/(\?|\byou\b|\byour\b|\bwe\b|let’s)/i.test(script);

  let retentionRisk = "Low";
  if (hasLongLine || hookScore <= 4) retentionRisk = "Medium";
  if ((hasLongLine && noQuestionOrYou) || hookScore <= 2) retentionRisk = "High";

  const dropOffSecond = Math.max(5, Math.round(estimatedSeconds * 0.3));

  return {
    estimatedDuration,
    hookScore,
    retentionRisk,
    dropOffEstimate: `Around second ${dropOffSecond}`,
  };
}

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

  const preview = buildPreviewData(script);

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
      preview,
    });
  }

  // 4️⃣ FREE LIMIT CHECK
  const FREE_LIMIT = 2;

  if (safeFreeUseCount >= FREE_LIMIT) {
    return NextResponse.json({
      blocked: true,
      price: 49,
      message: `Free limit of ${FREE_LIMIT} uses reached. Unlock full analysis for ₹49.`,
      preview,
    });
  }

  // 5️⃣ FREE PREVIEW ANALYSIS
  const result = await analyzeRetention(script, { full: false });

  const response = NextResponse.json({
    blocked: false,
    result,
    preview,
  });

  // 6️⃣ INCREMENT FREE USAGE COUNT
  response.headers.set(
    "Set-Cookie",
    `free_used=${safeFreeUseCount + 1}; Path=/; Max-Age=2592000; SameSite=Lax`
  );

  return response;
}
