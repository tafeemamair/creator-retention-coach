import Link from "next/link";
import { getAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { fetchCreatorHistoricalInsights, deriveHistoricalInsights } from "@/lib/historicalInsights";
import { CreatorHistoricalInsightsCard } from "@/components/workspace/CreatorHistoricalInsightsCard";

export default async function DashboardPage() {
  const supabase = await createClient();
  let user = null;
  if (supabase) {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  }

  const userId = user?.id;
  const admin = getAdminClient();

  let paidCredits = 0;
  let freeUsed = false;
  let recentAnalyses: Array<{
    id: string;
    title: string;
    platform: string;
    overall_score: number;
    created_at: string;
  }> = [];
  let historicalInsights = deriveHistoricalInsights([]);

  if (userId && admin) {
    const { data: ent } = await admin
      .from("entitlements")
      .select("free_analysis_used, paid_credits")
      .eq("user_id", userId)
      .single();

    if (ent) {
      paidCredits = Number(ent.paid_credits) || 0;
      freeUsed = Boolean(ent.free_analysis_used);
    }

    const { data: analyses } = await admin
      .from("analyses")
      .select("id, title, platform, overall_score, created_at, analysis_result")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(15);

    if (analyses) {
      recentAnalyses = analyses.slice(0, 5);
      historicalInsights = deriveHistoricalInsights(analyses);
    }
  }

  const creatorName =
    user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split("@")[0] || "Creator";

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="p-8 rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-semibold text-indigo-400 mb-3">
            <span>Creator Workspace</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Welcome back, {creatorName}
          </h1>
          <p className="text-sm text-slate-400 mt-2 max-w-xl">
            Analyze your short-form video scripts, diagnose hook and pacing risks, and review predicted retention timelines.
          </p>
        </div>

        <Link
          href="/app/analyze"
          className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-all shadow-lg shadow-indigo-600/30 active:scale-[0.98] shrink-0"
        >
          <span className="text-lg">⚡</span>
          <span>Analyze New Script</span>
        </Link>
      </div>

      {/* Status & Credits Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Free Analysis Status */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Free Analysis Status
          </div>
          <div className="flex items-center justify-between mt-3">
            <div>
              <div className="text-2xl font-bold text-white">
                {freeUsed ? "Used (1/1)" : "1 Available (0/1 Used)"}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {freeUsed
                  ? "Your initial full report entitlement has been consumed."
                  : "You have 1 complimentary full retention analysis ready to use."}
              </p>
            </div>
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
                freeUsed ? "bg-slate-800 text-slate-500" : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
              }`}
            >
              {freeUsed ? "✓" : "🎁"}
            </div>
          </div>
        </div>

        {/* Paid Credits Balance */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Paid Report Credits
          </div>
          <div className="flex items-center justify-between mt-3">
            <div>
              <div className="text-2xl font-bold text-white">
                {paidCredits} {paidCredits === 1 ? "Credit" : "Credits"}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {paidCredits > 0
                  ? "Credits never expire and cover full analyses with script rewrites."
                  : "Need more analyses? Choose a credit pack in the analysis studio."}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center text-lg">
              💳
            </div>
          </div>
        </div>
      </div>

      {/* Historical Creator Retention Trends & Insights */}
      <CreatorHistoricalInsightsCard insights={historicalInsights} />

      {/* Recent Analyses Section */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-white">Recent Analyses</h2>
            <p className="text-xs text-slate-400 mt-0.5">Your latest short-form script evaluations</p>
          </div>
          <Link
            href="/app/analyses"
            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            View All →
          </Link>
        </div>

        {recentAnalyses.length === 0 ? (
          <div className="p-12 text-center border border-dashed border-slate-800 rounded-xl">
            <div className="text-3xl mb-3">📝</div>
            <h3 className="text-sm font-semibold text-slate-200">No analyses yet</h3>
            <p className="text-xs text-slate-400 mt-1 mb-4">
              Paste or write your first short-form video script to generate a retention report.
            </p>
            <Link
              href="/app/analyze"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all shadow-md"
            >
              <span>⚡ Analyze Your First Script</span>
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {recentAnalyses.map((item) => (
              <div
                key={item.id}
                className="py-4 first:pt-0 last:pb-0 flex items-center justify-between gap-4 hover:bg-slate-850/50 rounded-xl px-2 transition-colors"
              >
                <div className="min-w-0">
                  <Link
                    href={`/app/analyses/${item.id}`}
                    className="text-sm font-semibold text-white hover:text-indigo-400 transition-colors truncate block"
                  >
                    {item.title}
                  </Link>
                  <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                    <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-medium">
                      {item.platform}
                    </span>
                    <span>•</span>
                    <span>{new Date(item.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <div className="text-xs text-slate-400">Score</div>
                    <div
                      className={`text-base font-bold ${
                        item.overall_score >= 80
                          ? "text-emerald-400"
                          : item.overall_score >= 60
                          ? "text-amber-400"
                          : "text-rose-400"
                      }`}
                    >
                      {item.overall_score}/100
                    </div>
                  </div>
                  <Link
                    href={`/app/analyses/${item.id}`}
                    className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors text-xs font-semibold"
                  >
                    View →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
