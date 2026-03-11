import { NextResponse } from "next/server";
import { analyzeRetention, type PreviewAnalysis } from "../../../lib/analyze";

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

  const preview = (await analyzeRetention(script, { full: false })) as PreviewAnalysis;

  const cookieHeader = req.headers.get("cookie") || "";
  const freeUseCount = Number.parseInt(getCookieValue(cookieHeader, "free_used") || "0", 10) || 0;
  const FREE_LIMIT = 2;

  const response = NextResponse.json({
    preview,
    message:
      freeUseCount >= FREE_LIMIT
        ? "Free preview unlocked. Upgrade for ₹49 to access the full retention dashboard and rewrites."
        : "Free preview ready. Upgrade for ₹49 to unlock full analysis.",
  });

  response.headers.set("Set-Cookie", `free_used=${freeUseCount + 1}; Path=/; Max-Age=2592000; SameSite=Lax`);
  return response;
}
