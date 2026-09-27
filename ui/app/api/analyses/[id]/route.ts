export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getAdminClient } from "@/lib/supabase/admin";

interface RouteParams {
  params: Promise<{ id: string }>;
}

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
    if (!id) {
      return NextResponse.json({ error: "Analysis ID is required" }, { status: 400 });
    }

    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const admin = getAdminClient();
    if (!admin) {
      return NextResponse.json({ error: "Database client unavailable" }, { status: 500 });
    }

    const { data: record, error } = await admin
      .from("analyses")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error || !record) {
      return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, analysis: record });
  } catch (err) {
    console.error("Analysis GET handler error:", err);
    return NextResponse.json({ error: "Failed to retrieve analysis" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Analysis ID is required" }, { status: 400 });
    }

    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const admin = getAdminClient();
    if (!admin) {
      return NextResponse.json({ error: "Database client unavailable" }, { status: 500 });
    }

    const body = await req.json();

    // Sanitize and extract authorized manual outcome fields
    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (body.published_at !== undefined) {
      updates.published_at = body.published_at ? new Date(body.published_at).toISOString() : null;
    }
    if (body.published_url !== undefined) {
      updates.published_url = typeof body.published_url === "string" ? body.published_url.trim() || null : null;
    }
    if (body.actual_views !== undefined) {
      updates.actual_views = body.actual_views !== null && !isNaN(Number(body.actual_views))
        ? Math.max(0, Math.floor(Number(body.actual_views)))
        : null;
    }
    if (body.actual_retention_percent !== undefined) {
      updates.actual_retention_percent = body.actual_retention_percent !== null && !isNaN(Number(body.actual_retention_percent))
        ? Math.min(100, Math.max(0, Number(body.actual_retention_percent)))
        : null;
    }
    if (body.actual_watch_time_seconds !== undefined) {
      updates.actual_watch_time_seconds = body.actual_watch_time_seconds !== null && !isNaN(Number(body.actual_watch_time_seconds))
        ? Math.max(0, Number(body.actual_watch_time_seconds))
        : null;
    }

    // Authoritative update: must match BOTH analysis id and authenticated user_id (RLS Isolation)
    const { data: updatedRows, error: updateError } = await admin
      .from("analyses")
      .update(updates)
      .eq("id", id)
      .eq("user_id", user.id)
      .select("id, published_at, published_url, actual_views, actual_retention_percent, actual_watch_time_seconds");

    if (updateError) {
      console.error("Database outcome update error:", updateError);
      return NextResponse.json({ error: "Failed to update outcome" }, { status: 500 });
    }

    if (!updatedRows || updatedRows.length === 0) {
      return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Outcome updated successfully",
      outcome: updatedRows[0],
    });
  } catch (err) {
    console.error("Analysis PATCH handler error:", err);
    return NextResponse.json({ error: "Failed to update outcome" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { error: "Analysis ID is required" },
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
      console.error("Supabase admin client is not configured.");
      return NextResponse.json(
        { error: "Failed to delete analysis" },
        { status: 500 }
      );
    }

    // Authoritative deletion: must match BOTH analysis id and authenticated user_id
    const { data: deletedRows, error: deleteError } = await admin
      .from("analyses")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)
      .select("id");

    if (deleteError) {
      console.error("Database deletion error:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete analysis" },
        { status: 500 }
      );
    }

    // If no row was deleted, it either does not exist or belongs to another user
    if (!deletedRows || deletedRows.length === 0) {
      return NextResponse.json(
        { error: "Analysis not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Analysis deleted",
    });
  } catch (err) {
    console.error("Analysis delete handler error:", err);
    return NextResponse.json(
      { error: "Failed to delete analysis" },
      { status: 500 }
    );
  }
}
