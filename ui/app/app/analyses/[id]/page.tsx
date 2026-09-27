import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import SavedAnalysisReportView from "@/components/analyses/SavedAnalysisReportView";
import { DeleteAnalysisButton } from "@/components/analyses/DeleteAnalysisButton";
import type { FullAnalysis, Platform } from "@/lib/analyze";

interface AnalysisDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function AnalysisDetailPage({ params }: AnalysisDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  let user = null;
  if (supabase) {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  }

  if (!user) {
    redirect(`/auth/login?next=/app/analyses/${id}`);
  }

  const admin = getAdminClient();
  if (!admin) {
    notFound();
  }

  // Authoritative Query: Must belong to auth user (RLS Isolation)
  const { data: analysisRecord, error } = await admin
    .from("analyses")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !analysisRecord) {
    notFound();
  }

  // Fetch parent title if this is an explicit revision
  let parentTitle: string | null = null;
  if (analysisRecord.parent_analysis_id) {
    const { data: parentRecord } = await admin
      .from("analyses")
      .select("id, title")
      .eq("id", analysisRecord.parent_analysis_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (parentRecord) {
      parentTitle = parentRecord.title;
    }
  }

  const fullAnalysis = analysisRecord.analysis_result as FullAnalysis;
  const platform = (analysisRecord.platform as Platform) || "YouTube Shorts";

  const initialOutcome = {
    published_at: analysisRecord.published_at,
    published_url: analysisRecord.published_url,
    actual_views: analysisRecord.actual_views,
    actual_retention_percent: analysisRecord.actual_retention_percent,
    actual_watch_time_seconds: analysisRecord.actual_watch_time_seconds,
  };

  return (
    <div className="space-y-6">
      {/* Header Back Link & Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <Link
            href="/app/analyses"
            className="text-xs font-semibold text-slate-400 hover:text-slate-200 flex items-center gap-1.5 transition-colors mb-2"
          >
            <span>←</span> Back to My Analyses
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">{analysisRecord.title}</h1>
            {analysisRecord.parent_analysis_id && (
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
                Revision
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-slate-400">
            <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-medium border border-slate-700">
              {analysisRecord.platform}
            </span>
            <span>•</span>
            <span>Analyzed on {new Date(analysisRecord.created_at).toLocaleDateString()}</span>
            {analysisRecord.parent_analysis_id && parentTitle && (
              <>
                <span>•</span>
                <span className="text-slate-300">
                  Revision of:{" "}
                  <Link
                    href={`/app/analyses/${analysisRecord.parent_analysis_id}`}
                    className="text-indigo-400 hover:underline font-medium"
                  >
                    {parentTitle}
                  </Link>
                </span>
                <span>•</span>
                <Link
                  href={`/app/analyses/compare?id1=${analysisRecord.parent_analysis_id}&id2=${analysisRecord.id}`}
                  className="text-indigo-400 hover:text-indigo-300 font-semibold"
                >
                  Compare with Parent ⚖️
                </Link>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href={`/app/analyze?parent_id=${analysisRecord.id}`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-600 hover:text-white transition-all text-xs font-semibold shadow-sm"
          >
            <span>📝 Create Revision</span>
          </Link>
          <DeleteAnalysisButton
            analysisId={analysisRecord.id}
            analysisTitle={analysisRecord.title}
            variant="header"
            redirectOnSuccess={true}
          />
          <Link
            href="/app/analyze"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all shadow-md"
          >
            <span>⚡ Analyze New Script</span>
          </Link>
        </div>
      </div>

      {/* Lineage Context Banner if this is a Revision */}
      {analysisRecord.parent_analysis_id && (
        <div className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <span className="text-base">📝</span>
            <div>
              <span className="font-bold text-white">Explicit Revision: </span>
              <span className="text-slate-300">
                This analysis was revised from &ldquo;{parentTitle || "Parent Analysis"}&rdquo;.
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={`/app/analyses/${analysisRecord.parent_analysis_id}`}
              className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition"
            >
              View Parent Report →
            </Link>
            <Link
              href={`/app/analyses/compare?id1=${analysisRecord.parent_analysis_id}&id2=${analysisRecord.id}`}
              className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition shadow-sm"
            >
              Compare Deltas ⚖️
            </Link>
          </div>
        </div>
      )}

      {/* Embedded Verified Dashboard View */}
      <div className="bg-slate-900/50 rounded-3xl border border-slate-800 p-6 shadow-xl space-y-6">
        <SavedAnalysisReportView
          analysisId={analysisRecord.id}
          initialAnalysis={fullAnalysis}
          initialScript={analysisRecord.script}
          initialPlatform={platform}
          parentAnalysisId={analysisRecord.parent_analysis_id}
          parentTitle={parentTitle}
          initialOutcome={initialOutcome}
        />
      </div>
    </div>
  );
}
