import { NextResponse } from "next/server";
import { analyzeRetention, type FullAnalysis } from "../../../lib/analyze";

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

  if (!script?.trim()) {
    return NextResponse.json({ message: "Please paste a script before analyzing." }, { status: 400 });
  }

  const cookieHeader = req.headers.get("cookie") || "";
  const isPaid = getCookieValue(cookieHeader, "paid") === "true";

  if (!isPaid) {
    return NextResponse.json(
      {
        blocked: true,
        message: "Please upgrade for ₹49 to unlock full analysis, script rewrites, and title suggestions.",
      },
      { status: 402 },
    );
  }

  const analysis = (await analyzeRetention(script, { full: true })) as FullAnalysis;
  return NextResponse.json({ blocked: false, analysis });
}
