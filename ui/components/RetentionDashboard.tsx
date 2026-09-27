"use client";

import RetentionGraph from "./RetentionGraph";
import ScoreCards from "./ScoreCards";

export type DashboardData = {
  score: number;
  metrics: { hook: number; pacing: number; emotion: number; value: number; cta: number };
  dropoffPrediction: { second: number; reason: string };
  retentionTimeline: Array<{ second: number; retention: number }>;
  dropOffRisks: Array<{ line: string; risk?: "Low" | "Medium" | "High"; reason: string; fix?: string }>;
};

export default function RetentionDashboard({ data }: { data: DashboardData }) {
  return (
    <div className="space-y-6">
      {/* 1 & 2: Retention Score and 5-Signal Metric Breakdown */}
      <div className="grid gap-5 md:grid-cols-2">
        <ScoreCards score={data.score} metrics={data.metrics} />
      </div>

      {/* 3: Predicted Retention Timeline */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 sm:p-6 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Predicted Drop-Off Timeline Curve
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Simulated viewer retention second-by-second based on sentence pacing and risk friction.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400">0s – 30s</span>
        </div>

        <RetentionGraph data={data.retentionTimeline} />

        {/* Drop-Off Moment Alert */}
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-4 flex items-start gap-3">
          <span className="text-base text-amber-400 mt-0.5 shrink-0">⚠️</span>
          <div className="space-y-0.5 text-xs">
            <span className="font-bold text-amber-300">
              Critical Drop-off Point: Second {data.dropoffPrediction.second}
            </span>
            <p className="text-slate-300 leading-relaxed">
              {data.dropoffPrediction.reason}
            </p>
          </div>
        </div>
      </div>

      {/* 4: Line-Level Drop-Off Risks */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 sm:p-6 shadow-lg space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Line-Level Drop-Off Risks & Diagnostics
          </h3>
          <span className="text-xs font-mono text-slate-400">
            {data.dropOffRisks?.length || 0} friction points
          </span>
        </div>

        {data.dropOffRisks && data.dropOffRisks.length > 0 ? (
          <div className="space-y-3">
            {data.dropOffRisks.map((risk, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-slate-800 bg-slate-950/80 p-4 space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-rose-300 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded">
                    {risk.risk || "High"} Risk
                  </span>
                  <span className="text-xs text-slate-500 font-mono">Sentence #{idx + 1}</span>
                </div>

                <p className="text-xs sm:text-sm font-semibold text-slate-200 border-l-2 border-rose-500/60 pl-3">
                  &ldquo;{risk.line}&rdquo;
                </p>

                <div className="grid sm:grid-cols-2 gap-3 text-xs pt-1 border-t border-slate-800/60">
                  <div className="space-y-1">
                    <span className="text-slate-400 font-semibold">Why Viewers Leave:</span>
                    <p className="text-slate-300 leading-relaxed">{risk.reason}</p>
                  </div>
                  {risk.fix && (
                    <div className="space-y-1">
                      <span className="text-emerald-400 font-semibold">Recommended Fix:</span>
                      <p className="text-slate-300 leading-relaxed">{risk.fix}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-slate-950 text-xs text-slate-400 text-center">
            No obvious high-risk drop-off friction detected in this script.
          </div>
        )}
      </div>
    </div>
  );
}
