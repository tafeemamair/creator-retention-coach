export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getAdminClient } from "@/lib/supabase/admin";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const ALLOWED_USEFULNESS = new Set(["yes", "somewhat", "no"]);
const ALLOWED_COMPONENTS = new Set([
  "Hook",
  "Drop-off prediction",
  "Rewrites",
  "Action plan",
  "Score",
]);
const ALLOWED_REVISION_HELP = new Set(["yes", "somewhat", "no"]);
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function getAuthenticatedUser() {
  type CookieStoreType = Awaited<ReturnType<typeof cookies>>;
  let cookieStore: CookieStoreType | null = null;
  try {
    cookieStore = await cookies();
  } catch {
    // Outside Next.js dynamic request context (e.g. unit test execution)
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
          // Ignored in route handler
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

export async function GET(_req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    if (!id || !UUID_REGEX.test(id)) {
      return NextResponse.json(
        { error: "Valid analysis ID is required" },
        { status: 400 }
      );
    }

    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const admin = getAdminClient();
    if (!admin) {
      return NextResponse.json(
        { error: "Database client unavailable" },
        { status: 500 }
      );
    }

    const { data: record, error } = await admin
      .from("analysis_feedback")
      .select("*")
      .eq("analysis_id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Failed to fetch feedback:", error);
      return NextResponse.json(
        { error: "Failed to retrieve feedback" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, feedback: record || null });
  } catch (err) {
    console.error("Feedback GET handler error:", err);
    return NextResponse.json(
      { error: "Failed to retrieve feedback" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    if (!id || !UUID_REGEX.test(id)) {
      return NextResponse.json(
        { error: "Valid analysis ID is required" },
        { status: 400 }
      );
    }

    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const admin = getAdminClient();
    if (!admin) {
      return NextResponse.json(
        { error: "Database client unavailable" },
        { status: 500 }
      );
    }

    // Verify analysis exists and belongs strictly to authenticated creator
    const { data: analysisRecord, error: analysisError } = await admin
      .from("analyses")
      .select("id, user_id")
      .eq("id", id)
      .maybeSingle();

    if (analysisError || !analysisRecord) {
      return NextResponse.json(
        { error: "Analysis not found" },
        { status: 404 }
      );
    }

    if (analysisRecord.user_id !== user.id) {
      return NextResponse.json(
        { error: "Unauthorized: analysis belongs to another creator" },
        { status: 403 }
      );
    }

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON request body" },
        { status: 400 }
      );
    }

    const usefulness = body?.usefulness;
    if (!usefulness || !ALLOWED_USEFULNESS.has(usefulness)) {
      return NextResponse.json(
        {
          error:
            "Invalid usefulness rating. Must be 'yes', 'somewhat', or 'no'.",
        },
        { status: 400 }
      );
    }

    // Validate optional useful components
    let usefulComponents: string[] | null = null;
    if (Array.isArray(body?.useful_components) || Array.isArray(body?.usefulComponents)) {
      const rawList = (body.useful_components || body.usefulComponents) as unknown[];
      const filtered = rawList
        .filter((item): item is string => typeof item === "string" && ALLOWED_COMPONENTS.has(item));
      usefulComponents = filtered.length > 0 ? filtered : null;
    }

    // Validate optional comment with 500 character limit
    let comment: string | null = null;
    if (typeof body?.comment === "string") {
      const trimmed = body.comment.trim();
      if (trimmed.length > 500) {
        return NextResponse.json(
          { error: "Comment exceeds maximum limit of 500 characters" },
          { status: 400 }
        );
      }
      comment = trimmed.length > 0 ? trimmed : null;
    }

    // Validate optional revision help
    let revisionHelp: string | null = null;
    const rawRevisionHelp = body?.revision_help ?? body?.revisionHelp;
    if (rawRevisionHelp !== undefined && rawRevisionHelp !== null && rawRevisionHelp !== "") {
      if (!ALLOWED_REVISION_HELP.has(String(rawRevisionHelp))) {
        return NextResponse.json(
          {
            error:
              "Invalid revision help rating. Must be 'yes', 'somewhat', or 'no'.",
          },
          { status: 400 }
        );
      }
      revisionHelp = String(rawRevisionHelp);
    }

    // Atomic upsert into analysis_feedback on conflict (user_id, analysis_id)
    const { data: feedbackRecord, error: upsertError } = await admin
      .from("analysis_feedback")
      .upsert(
        {
          user_id: user.id,
          analysis_id: id,
          usefulness,
          useful_components: usefulComponents,
          comment,
          revision_help: revisionHelp,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,analysis_id" }
      )
      .select("*")
      .single();

    if (upsertError || !feedbackRecord) {
      console.error("Failed to save feedback:", upsertError);
      return NextResponse.json(
        { error: "Failed to save analysis feedback" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      feedback: feedbackRecord,
    });
  } catch (err) {
    console.error("Feedback POST handler error:", err);
    return NextResponse.json(
      { error: "Failed to save feedback" },
      { status: 500 }
    );
  }
}
