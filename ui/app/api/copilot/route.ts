export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { validateScript } from "@/lib/validation";
import {
  isValidCopilotAction,
  executeCopilotAction,
  type CopilotContext,
} from "@/lib/copilot";
import type { FullAnalysis } from "@/lib/analyze";

export async function POST(req: Request) {
  try {
    // 1. Authenticate user session
    type CookieStoreType = Awaited<ReturnType<typeof cookies>>;
    let cookieStore: CookieStoreType | null = null;
    try {
      cookieStore = await cookies();
    } catch {
      // Outside dynamic context
    }

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      "https://placeholder-project.supabase.co";
    const supabaseAnonKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return cookieStore ? cookieStore.getAll() : [];
        },
        setAll(cookiesToSet) {
          try {
            if (cookieStore) {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            }
          } catch {
            // Ignored
          }
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required to use Creator Copilot actions" },
        { status: 401 }
      );
    }

    // 2. Validate request payload
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid request payload" },
        { status: 400 }
      );
    }

    const { action, script, analysis, targetLanguage, platform } = body;

    // Validate Action
    if (!isValidCopilotAction(action)) {
      return NextResponse.json(
        {
          error: `Unsupported Copilot action. Supported actions: 'generate_hooks', 'improve_cta'`,
        },
        { status: 400 }
      );
    }

    // Validate Script
    const scriptValidation = validateScript(script);
    if (!scriptValidation.valid) {
      return NextResponse.json(
        { error: scriptValidation.error || "Invalid script content" },
        { status: 400 }
      );
    }

    // Validate Analysis context presence
    if (!analysis || typeof analysis !== "object" || !analysis.metrics) {
      return NextResponse.json(
        { error: "Missing or invalid analysis snapshot context" },
        { status: 400 }
      );
    }

    const context: CopilotContext = {
      script: (script as string).trim(),
      analysis: analysis as FullAnalysis,
      targetLanguage: typeof targetLanguage === "string" ? targetLanguage : undefined,
      platform: typeof platform === "string" ? platform : undefined,
    };

    // 3. Execute bounded Copilot action
    const result = await executeCopilotAction(context, action);

    return NextResponse.json(result);
  } catch (err) {
    console.error("Copilot route error:", err);
    return NextResponse.json(
      { error: "Failed to execute Creator Copilot action" },
      { status: 500 }
    );
  }
}
