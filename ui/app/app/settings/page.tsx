import Link from "next/link";

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-2xl font-bold text-white tracking-tight">Account Settings</h1>
        <p className="text-xs text-slate-400 mt-1">Manage workspace preferences and authentication.</p>
      </div>

      <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-6">
        <div>
          <h2 className="text-sm font-bold text-white mb-1">Authentication & Security</h2>
          <p className="text-xs text-slate-400">
            Your account is secured via Supabase Auth (Google OAuth & Email Magic Link).
          </p>
        </div>

        <div className="border-t border-slate-800 pt-6">
          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">
            Session Management
          </h3>
          <form action="/auth/logout" method="POST">
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 hover:bg-rose-500 hover:text-white transition-all text-xs font-bold"
            >
              Sign Out of All Sessions
            </button>
          </form>
        </div>

        <div className="border-t border-slate-800 pt-6 flex items-center justify-between text-xs text-slate-500">
          <span>Need help with your account?</span>
          <Link href="/contact" className="text-indigo-400 hover:text-indigo-300 underline">
            Contact Support
          </Link>
        </div>
      </div>
    </div>
  );
}
