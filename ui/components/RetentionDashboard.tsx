"use client";

import RetentionGraph from "./RetentionGraph";
import ScoreCards from "./ScoreCards";

export type DashboardData = {
  score: number;
  metrics: { hook: number; pacing: number; emotion: number; value: number; cta: number };
  dropoffPrediction: { second: number; reason: string };
  retentionTimeline: Array<{ second: number; retention: number }>;
  dropOffRisks: Array<{ line: string; reason: string }>;
};

export default function RetentionDashboard({ data }: { data: DashboardData }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <ScoreCards score={data.score} metrics={data.metrics} />

      <div className="rounded-xl border bg-white p-4 shadow-sm md:col-span-2">
        <h3 className="mb-2 font-semibold">Drop-Off Timeline</h3>
        <RetentionGraph data={data.retentionTimeline} />
        <p className="mt-2 text-sm text-slate-600">
          Predicted drop-off around <span className="font-semibold">{data.dropoffPrediction.second}s</span> — {data.dropoffPrediction.reason}
        </p>
      </div>

      <div className="rounded-xl border bg-white p-4 shadow-sm md:col-span-2">
        <h3 className="mb-2 font-semibold">Line-Level Drop-Off Risks</h3>
        {data.dropOffRisks.length ? (
          <ul className="space-y-2 text-sm text-slate-700">
            {data.dropOffRisks.map((risk) => (
              <li key={`${risk.line}-${risk.reason}`} className="rounded-lg border border-slate-200 p-3">
                <p className="font-medium text-slate-900">“{risk.line}”</p>
                <p className="mt-1 text-slate-600">{risk.reason}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-600">No obvious high-risk lines detected.</p>
        )}
      </div>
    </div>
  );
}
