import { headers } from "next/headers";
import { redirect } from "next/navigation";
import AppSidebar from "@/components/workspace/AppSidebar";
import AppHeader from "@/components/workspace/AppHeader";
import { getAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  let user = null;
  if (supabase) {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  }

  if (!user) {
    const headersList = await headers();
    const currentPath = headersList.get("x-pathname") || "/app";
    redirect(`/auth/login?next=${encodeURIComponent(currentPath)}`);
  }

  let displayName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "Creator";
  let avatarUrl = user.user_metadata?.avatar_url;
  let paidCredits = 0;
  let freeUsed = false;

  const admin = getAdminClient();
  if (admin) {
    const { data: profile } = await admin
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("id", user.id)
      .single();

    if (profile) {
      if (profile.display_name) displayName = profile.display_name;
      if (profile.avatar_url) avatarUrl = profile.avatar_url;
    }

    const { data: ent } = await admin
      .from("entitlements")
      .select("free_analysis_used, paid_credits")
      .eq("user_id", user.id)
      .single();

    if (ent) {
      paidCredits = Number(ent.paid_credits) || 0;
      freeUsed = Boolean(ent.free_analysis_used);
    }
  } else {
    const { getAuthUserLedger } = await import("@/lib/ledger");
    const cached = await getAuthUserLedger(user.id);
    if (cached) {
      freeUsed = cached.freeUsed;
      paidCredits = cached.paidCredits;
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex selection:bg-indigo-500 selection:text-white">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
        <AppHeader
          userEmail={user.email}
          displayName={displayName}
          avatarUrl={avatarUrl}
          creditsRemaining={paidCredits}
          freeRemaining={freeUsed ? 0 : 1}
        />
        <main className="flex-1 p-4 sm:p-6 md:p-8 pb-24 md:pb-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
