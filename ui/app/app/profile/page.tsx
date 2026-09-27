import Image from "next/image";
import { getAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export default async function ProfilePage() {
  const supabase = await createClient();
  let user = null;
  if (supabase) {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  }

  const userId = user?.id;
  const admin = getAdminClient();

  let displayName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split("@")[0] || "Creator";
  let avatarUrl = user?.user_metadata?.avatar_url;
  let createdAt = user?.created_at ? new Date(user.created_at).toLocaleDateString() : "Active";

  if (userId && admin) {
    const { data: profile } = await admin
      .from("profiles")
      .select("display_name, avatar_url, created_at")
      .eq("id", userId)
      .single();

    if (profile) {
      if (profile.display_name) displayName = profile.display_name;
      if (profile.avatar_url) avatarUrl = profile.avatar_url;
      if (profile.created_at) createdAt = new Date(profile.created_at).toLocaleDateString();
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-2xl font-bold text-white tracking-tight">Creator Profile</h1>
        <p className="text-xs text-slate-400 mt-1">Manage your identity and account details.</p>
      </div>

      <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-6">
        <div className="flex items-center gap-5">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={displayName}
              width={64}
              height={64}
              className="w-16 h-16 rounded-2xl object-cover border border-slate-700"
              unoptimized
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-indigo-600/30">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h2 className="text-lg font-bold text-white">{displayName}</h2>
            <p className="text-xs text-slate-400">{user?.email}</p>
          </div>
        </div>

        <div className="divide-y divide-slate-800 border-t border-b border-slate-800 py-2">
          <div className="py-3 flex items-center justify-between text-xs">
            <span className="text-slate-400 font-semibold">User ID</span>
            <span className="font-mono text-slate-300">{user?.id}</span>
          </div>
          <div className="py-3 flex items-center justify-between text-xs">
            <span className="text-slate-400 font-semibold">Email Address</span>
            <span className="text-slate-300">{user?.email}</span>
          </div>
          <div className="py-3 flex items-center justify-between text-xs">
            <span className="text-slate-400 font-semibold">Member Since</span>
            <span className="text-slate-300">{createdAt}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
