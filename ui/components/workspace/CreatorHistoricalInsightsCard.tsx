import type { HistoricalInsights } from "@/lib/historicalInsights";

interface CreatorHistoricalInsightsCardProps {
  insights: HistoricalInsights;
}

export function CreatorHistoricalInsightsCard({ insights }: CreatorHistoricalInsightsCardProps) {
  if (!insights.hasSufficientData) {
    if (insights.totalAnalyses === 0) {
      return null;
    }

    return (
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-md space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center text-lg shrink-0">
            📈
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Creator Historical Patterns</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {insights.message}
            </p>
          </div>
        </div>

        {insights.platformBreakdown && insights.platformBreakdown.length > 0 && (
          <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-400 font-medium">Platform Baseline:</span>
            {insights.platformBreakdown.map((item) => (
              <div
                key={item.platform}
                className="inline-flex flex-wrap items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300"
              >
                <span className="font-semibold text-white">{item.platform}</span>
                <span className="text-slate-500">•</span>
                <span className="font-bold text-indigo-400">{item.averageScore} Score</span>
                {item.benchmark && (
                  <>
                    <span className="text-slate-500">•</span>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                        item.benchmark.status === "on_target"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : item.benchmark.status === "solid_baseline"
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                      }`}
                    >
                      {item.benchmark.statusLabel}
                    </span>
                    <span className="text-[11px] text-slate-500 hidden sm:inline">
                      (Target: {item.benchmark.targetScore}+)
                    </span>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  const { scoreTrajectory, dominantWeakestMetric, topRecurringDropOffCause, platformBreakdown } =
    insights;

  return (
    <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-semibold text-indigo-400 mb-1.5">
            <span>Historical Creator Analytics</span>
          </div>
          <h2 className="text-lg font-bold text-white tracking-tight">
            Retention Trends & Platform Benchmarks
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Derived from your last {insights.totalAnalyses} analyzed scripts
          </p>
        </div>

        {scoreTrajectory && (
          <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 shrink-0">
            <span className="text-xs font-semibold text-slate-400">Trajectory:</span>
            <div className="flex items-center gap-1.5">
              <span
                className={`text-sm font-bold flex items-center gap-1 ${
                  scoreTrajectory.direction === "improving"
                    ? "text-emerald-400"
                    : scoreTrajectory.direction === "declining"
                    ? "text-rose-400"
                    : "text-amber-400"
                }`}
              >
                {scoreTrajectory.direction === "improving" && "▲"}
                {scoreTrajectory.direction === "declining" && "▼"}
                {scoreTrajectory.direction === "stable" && "▶"}
                {scoreTrajectory.delta > 0 ? `+${scoreTrajectory.delta}` : scoreTrajectory.delta} pts
              </span>
              <span className="text-[11px] text-slate-500">
                ({scoreTrajectory.earliestScore} → {scoreTrajectory.latestScore})
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Average Score */}
        <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Historical Average
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span
              className={`text-2xl font-black ${
                insights.averageScore >= 80
                  ? "text-emerald-400"
                  : insights.averageScore >= 60
                  ? "text-amber-400"
                  : "text-rose-400"
              }`}
            >
              {insights.averageScore}
            </span>
            <span className="text-xs text-slate-500 font-medium">/ 100</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Across {insights.totalAnalyses} analyzed scripts
          </p>
        </div>

        {/* Dominant Weakest Metric */}
        <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Primary Focus Area
          </span>
          <div className="mt-1">
            {dominantWeakestMetric ? (
              <>
                <div className="text-sm font-bold text-amber-300 truncate">
                  {dominantWeakestMetric.label}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Lowest score in <strong className="text-slate-200">{dominantWeakestMetric.frequencyPercent}%</strong> of scripts ({dominantWeakestMetric.count}/{insights.totalAnalyses})
                </p>
              </>
            ) : (
              <div className="text-xs text-slate-400 mt-1">Balanced metric distribution</div>
            )}
          </div>
        </div>

        {/* Top Recurring Friction Cause */}
        <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Top Recurring Friction
          </span>
          <div className="mt-1">
            {topRecurringDropOffCause ? (
              <>
                <div className="text-xs font-semibold text-rose-300 line-clamp-1">
                  {topRecurringDropOffCause.reason}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Flagged in <strong className="text-slate-200">{topRecurringDropOffCause.count}</strong> drop-off predictions
                </p>
              </>
            ) : (
              <div className="text-xs text-slate-400 mt-1">No concentrated friction pattern</div>
            )}
          </div>
        </div>
      </div>

      {/* Platform Performance Benchmarks */}
      {platformBreakdown.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-slate-800/60">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Platform Retention Benchmarks
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {platformBreakdown.map((item) => (
              <div
                key={item.platform}
                className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white text-xs">{item.platform}</span>
                  {item.benchmark && (
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        item.benchmark.status === "on_target"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : item.benchmark.status === "solid_baseline"
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                      }`}
                    >
                      {item.benchmark.statusLabel}
                    </span>
                  )}
                </div>

                <div className="flex items-baseline justify-between text-xs">
                  <div className="text-slate-400">
                    Average: <strong className="text-white font-bold">{item.averageScore}/100</strong>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {item.count} {item.count === 1 ? "script" : "scripts"}
                  </div>
                </div>

                {item.benchmark && (
                  <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-900">
                    <span>Target: {item.benchmark.targetScore}+</span>
                    <span className="text-slate-400">{item.benchmark.primaryWeightFocus}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
