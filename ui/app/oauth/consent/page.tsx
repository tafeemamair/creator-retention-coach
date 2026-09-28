import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import Link from "next/link";

interface ConsentPageProps {
  searchParams: Promise<{
    authorization_id?: string;
    client_id?: string;
    redirect_uri?: string;
    response_type?: string;
    scope?: string;
    state?: string;
    code_challenge?: string;
    code_challenge_method?: string;
    resource?: string;
    error?: string;
  }>;
}

async function getSupabaseServerClient() {
  const cookieStore = await cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-project.supabase.co";
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    "placeholder-anon-key";

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Ignored in Server Components
        }
      },
    },
  });
}

export default async function OAuthConsentPage({ searchParams }: ConsentPageProps) {
  const params = await searchParams;
  const {
    authorization_id,
    client_id = "ChatGPT / OpenAI",
    scope = "retention:analyze user:credits",
    error: incomingError,
  } = params;

  const supabase = await getSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 1. Preserve authenticated-user check: Redirect to login preserving authorization_id and params
  if (!user) {
    const currentQuery = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v) currentQuery.set(k, v);
    });
    const nextUrl = `/oauth/consent?${currentQuery.toString()}`;
    redirect(`/auth/login?next=${encodeURIComponent(nextUrl)}`);
  }

  // 2. Fetch OAuth authorization details from Supabase if authorization_id is provided
  let authDetails: any = null;
  if (authorization_id && (supabase.auth as any).oauth?.getAuthorizationDetails) {
    try {
      const detailsRes = await (supabase.auth as any).oauth.getAuthorizationDetails(authorization_id);
      if (detailsRes?.data?.redirect_url) {
        // If Supabase indicates consent was already granted or instant redirect, follow it directly
        redirect(detailsRes.data.redirect_url);
      }
      if (detailsRes?.data) {
        authDetails = detailsRes.data;
      }
    } catch (err: any) {
      // If Next.js redirect was thrown, let it bubble up
      if (err?.digest?.startsWith("NEXT_REDIRECT")) {
        throw err;
      }
      console.error("[OAuth Consent] Failed to get authorization details:", err?.message || err);
    }
  }

  const clientName = authDetails?.client?.name || authDetails?.client?.client_name || client_id || "ChatGPT / OpenAI";
  const rawScopes = authDetails?.scopes || (scope ? scope.split(" ").filter(Boolean) : ["retention:analyze", "user:credits"]);
  const requestedScopes: string[] = Array.isArray(rawScopes) ? rawScopes : ["retention:analyze", "user:credits"];

  // 3. Server Actions for Approval and Denial using Supabase OAuth APIs
  async function handleApprove() {
    "use server";
    if (!authorization_id) {
      redirect("/app");
    }

    const actionSupabase = await getSupabaseServerClient();

    try {
      if ((actionSupabase.auth as any).oauth?.approveAuthorization) {
        const { data, error } = await (actionSupabase.auth as any).oauth.approveAuthorization(authorization_id, {
          skipBrowserRedirect: true,
        });

        if (error) {
          console.error("[OAuth Consent] approveAuthorization error:", error);
          redirect(`/oauth/consent?authorization_id=${encodeURIComponent(authorization_id)}&error=${encodeURIComponent(error.message)}`);
        }

        if (data?.redirect_url) {
          redirect(data.redirect_url);
        }
      }
    } catch (err: any) {
      if (err?.digest?.startsWith("NEXT_REDIRECT")) {
        throw err;
      }
      console.error("[OAuth Consent] Server action exception during approval:", err);
      redirect(`/oauth/consent?authorization_id=${encodeURIComponent(authorization_id)}&error=${encodeURIComponent(err?.message || "Approval failed")}`);
    }

    redirect("/app");
  }

  async function handleDeny() {
    "use server";
    if (!authorization_id) {
      redirect("/app");
    }

    const actionSupabase = await getSupabaseServerClient();

    try {
      if ((actionSupabase.auth as any).oauth?.denyAuthorization) {
        const { data, error } = await (actionSupabase.auth as any).oauth.denyAuthorization(authorization_id, {
          skipBrowserRedirect: true,
        });

        if (error) {
          console.error("[OAuth Consent] denyAuthorization error:", error);
          redirect(`/oauth/consent?authorization_id=${encodeURIComponent(authorization_id)}&error=${encodeURIComponent(error.message)}`);
        }

        if (data?.redirect_url) {
          redirect(data.redirect_url);
        }
      }
    } catch (err: any) {
      if (err?.digest?.startsWith("NEXT_REDIRECT")) {
        throw err;
      }
      console.error("[OAuth Consent] Server action exception during denial:", err);
      redirect(`/oauth/consent?authorization_id=${encodeURIComponent(authorization_id)}&error=${encodeURIComponent(err?.message || "Denial failed")}`);
    }

    redirect("/app");
  }

  return (
    <main className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 py-12 selection:bg-indigo-500 selection:text-white">
      <div className="w-full max-w-md mx-auto p-8 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl text-slate-100">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-semibold text-indigo-400 mb-3">
            <span>OAuth 2.1 Authorization</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Authorize Access</h1>
          <p className="text-sm text-slate-400 mt-2">
            <span className="font-semibold text-slate-200">{clientName}</span> is requesting permission to access your Creator Retention Coach account.
          </p>
        </div>

        {incomingError && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/50 border border-red-800/80 text-xs text-red-200">
            {incomingError}
          </div>
        )}

        {/* Authenticated Account Info */}
        <div className="mb-6 p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 flex items-center justify-between">
          <div>
            <p className="text-slate-500">Signed in as</p>
            <p className="font-mono text-slate-200 font-semibold">{user.email || user.id}</p>
          </div>
          <Link href="/auth/logout" className="text-indigo-400 hover:text-indigo-300 font-semibold underline">
            Switch
          </Link>
        </div>

        {/* Requested Permissions / Scopes */}
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Requested Permissions</p>
          <div className="space-y-2.5">
            {requestedScopes.map((sc) => (
              <div key={sc} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-start gap-3">
                <span className="text-emerald-400 font-bold text-sm">✓</span>
                <div>
                  <p className="text-xs font-mono font-semibold text-slate-200">{sc}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {sc === "retention:analyze"
                      ? "Execute video script retention audits and consume credits on your behalf."
                      : sc === "user:credits"
                      ? "View your available credit balance and account tier status."
                      : `Access resources authorized under scope '${sc}'.`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Consent Actions: Approve & Deny */}
        <div className="space-y-3">
          {/* Approval Form */}
          <form action={handleApprove}>
            <button
              type="submit"
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all shadow-md shadow-indigo-600/20 active:scale-[0.99]"
            >
              Authorize {clientName}
            </button>
          </form>

          {/* Denial Form */}
          <form action={handleDeny}>
            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm transition-all active:scale-[0.99]"
            >
              Cancel & Deny
            </button>
          </form>
        </div>

        <p className="text-[11px] text-slate-500 text-center mt-6">
          You can revoke access at any time from your Creator Retention Coach settings.
        </p>
      </div>
    </main>
  );
}

