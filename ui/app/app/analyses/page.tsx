import Link from "next/link";
import { getAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { deriveHistoricalInsights } from "@/lib/historicalInsights";
import { CreatorHistoricalInsightsCard } from "@/components/workspace/CreatorHistoricalInsightsCard";
import { AnalysisArchiveClient } from "@/components/analyses/AnalysisArchiveClient";
import { DeleteAnalysisButton } from "@/components/analyses/DeleteAnalysisButton"; // Used in list table: <DeleteAnalysisButton

export default async function MyAnalysesPage() {
  const supabase = await createClient();
  let user = null;
  if (supabase) {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  }

  const userId = user?.id;
  const admin = getAdminClient();

  let analyses: Array<{
    id: string;
    title: string;
    platform: string;
    overall_score: number;
    created_at: string;
    script: string;
    analysis_result?: any;
    parent_analysis_id?: string | null;
  }> = [];

  if (userId && admin) {
    const { data } = await admin
      .from("analyses")
      .select("id, title, platform, overall_score, created_at, script, analysis_result, parent_analysis_id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (data) {
      analyses = data;
    }
  }

  const historicalInsights = deriveHistoricalInsights(analyses);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">My Saved Analyses</h1>
          <p className="text-xs text-slate-400 mt-1">
            Access and review your historical retention scorecards, risks, and rewrites.
          </p>
        </div>

        <Link
          href="/app/analyze"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all shadow-md"
        >
          <span>⚡ New Analysis</span>
        </Link>
      </div>

      {/* Historical Insights Summary Card */}
      {analyses.length >= 2 && (
        <CreatorHistoricalInsightsCard insights={historicalInsights} />
      )}

      {analyses.length === 0 ? (
        <div className="p-16 text-center border border-dashed border-slate-800 rounded-3xl bg-slate-900/50">
          <div className="text-4xl mb-3">📜</div>
          <h2 className="text-base font-bold text-white">No saved analyses found</h2>
          <p className="text-xs text-slate-400 mt-1 mb-6 max-w-sm mx-auto">
            When you analyze scripts in your workspace, your reports and retention timelines will be saved here.
          </p>
          <Link
            href="/app/analyze"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/30"
          >
            <span>Analyze Your First Script</span>
          </Link>
        </div>
      ) : (
        <AnalysisArchiveClient initialAnalyses={analyses} />
      )}
    </div>
  );
}

