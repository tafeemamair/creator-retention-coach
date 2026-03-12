import { NextResponse } from "next/server";
import { analyzeRetention, type FullAnalysis, type PreviewAnalysis } from "../../../lib/analyze";

const PLATFORM_OPTIONS = ["YouTube Shorts", "TikTok", "Instagram Reels"] as const;

function getCookieValue(cookieHeader: string, key: string): string | undefined {
  return cookieHeader
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${key}=`))
    ?.split("=")
    .slice(1)
    .join("=");
}

function normalizePlatform(input: unknown): (typeof PLATFORM_OPTIONS)[number] {
  if (typeof input !== "string") return "YouTube Shorts";
  return PLATFORM_OPTIONS.includes(input as (typeof PLATFORM_OPTIONS)[number])
    ? (input as (typeof PLATFORM_OPTIONS)[number])
    : "YouTube Shorts";
}

function computeWeightedScore(metrics: PreviewAnalysis["metrics"]): number {
  return Math.round(
    metrics.hook * 0.3 +
      metrics.pacing * 0.25 +
      metrics.emotion * 0.2 +
      metrics.value * 0.15 +
      metrics.cta * 0.1,
  );
}

function scriptWithContext(script: string, platform: string): string {
  return [
    script.trim(),
    "",
    `Optimize this script for retention on ${platform}.`,
    "Maximum 120 words.",
    "One sentence per line.",
    "Short punchy sentences suitable for Shorts.",
  ].join("\n");
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return await Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error("Analysis timeout.")), ms);
    }),
  ]);
}

export async function POST(req: Request) {
  const body = await req.json();
  const script = body?.script as string;
  const platform = normalizePlatform(body?.platform);

  if (!script?.trim()) {
    return NextResponse.json({ message: "Please paste a script before analyzing." }, { status: 400 });
  }

  const contextScript = scriptWithContext(script, platform);
  const previewRaw = (await analyzeRetention(contextScript, { full: false })) as PreviewAnalysis;
  const preview: PreviewAnalysis = {
    ...previewRaw,
    score: computeWeightedScore(previewRaw.metrics),
  };

  const cookieHeader = req.headers.get("cookie") || "";
  const freeUseCount = Number.parseInt(getCookieValue(cookieHeader, "free_used") || "0", 10) || 0;
  const isPaid = getCookieValue(cookieHeader, "paid") === "true";

  if (isPaid) {
    const analysisRaw = (await withTimeout(analyzeRetention(contextScript, { full: true }), 4000)) as FullAnalysis;
    const analysis: FullAnalysis = {
      ...analysisRaw,
      score: computeWeightedScore(analysisRaw.metrics),
    };

    return NextResponse.json({ blocked: false, preview, analysis, platform });
  }

  const FREE_LIMIT = 2;
  if (freeUseCount >= FREE_LIMIT) {
    return NextResponse.json({
      blocked: true,
      preview,
      price: 49,
      platform,
      message: "Free limit reached. Unlock full retention dashboard and rewrites for ₹49.",
    });
  }

  const response = NextResponse.json({ blocked: false, preview, platform });
  response.headers.set("Set-Cookie", `free_used=${freeUseCount + 1}; Path=/; Max-Age=2592000; SameSite=Lax`);
  return response;
}
