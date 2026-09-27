"use client";

import Link from "next/link";
import { compareScriptAnalyses, type AnalysisRecordInput } from "@/lib/comparison";

interface AnalysisComparisonViewProps {
  recordA: AnalysisRecordInput;
  recordB: AnalysisRecordInput;
}

export function AnalysisComparisonView({ recordA, recordB }: AnalysisComparisonViewProps) {
  const comparison = compareScriptAnalyses(recordA, recordB);
  const { scriptA, scriptB, scoreDelta, overallStatus, metricDeltas, timelineComparison, summary } =
    comparison;

  return (
    <div className="space-y-6">
      {/* Back Link & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <Link
            href="/app/analyses"
            className="text-xs font-semibold text-slate-400 hover:text-slate-200 flex items-center gap-1.5 transition-colors mb-2"
          >
            <span>←</span> Back to My Analyses
          </Link>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-semibold text-indigo-400 mb-1.5">
            <span>Deterministic Retention Diff</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Script Retention Comparison
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/app/analyses/${scriptA.id}`}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
          >
            Report A →
          </Link>
          <Link
            href={`/app/analyses/${scriptB.id}`}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
          >
            Report B →
          </Link>
        </div>
      </div>

      {/* Main Score Comparison Card */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950/30 to-slate-900 border border-slate-800 shadow-xl space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          {/* Version A Card */}
          <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-bold uppercase tracking-wider text-[10px]">
                Script A (Baseline)
              </span>
              <span className="text-slate-400">{scriptA.platform}</span>
            </div>
            <h3 className="font-bold text-white text-base truncate" title={scriptA.title}>
              {scriptA.title}
            </h3>
            <div className="flex items-baseline gap-2 pt-1">
              <span className="text-3xl font-black text-white">{scriptA.overallScore}</span>
              <span className="text-xs text-slate-500 font-medium">/ 100 Score</span>
            </div>
            <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-900 flex justify-between">
              <span>{scriptA.wordCount} words</span>
              <span>{new Date(scriptA.createdAt).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Delta Indicator */}
          <div className="text-center space-y-2 p-4 rounded-2xl bg-slate-950/50 border border-slate-800/80">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Retention Delta
            </span>
            <div
              className={`text-4xl font-extrabold flex items-center justify-center gap-1 ${
                overallStatus === "improved"
                  ? "text-emerald-400"
                  : overallStatus === "declined"
                  ? "text-rose-400"
                  : "text-slate-400"
              }`}
            >
              {scoreDelta > 0 ? `+${scoreDelta}` : scoreDelta}
              <span className="text-base font-semibold">pts</span>
            </div>
            <p className="text-xs text-slate-300 font-medium">
              {overallStatus === "improved"
                ? "Retention score improved"
                : overallStatus === "declined"
                ? "Retention score declined"
                : "Identical retention score"}
            </p>
          </div>

          {/* Version B Card */}
          <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 font-bold uppercase tracking-wider text-[10px] border border-indigo-500/30">
                Script B (Comparison)
              </span>
              <span className="text-slate-400">{scriptB.platform}</span>
            </div>
            <h3 className="font-bold text-white text-base truncate" title={scriptB.title}>
              {scriptB.title}
            </h3>
            <div className="flex items-baseline gap-2 pt-1">
              <span className="text-3xl font-black text-indigo-400">{scriptB.overallScore}</span>
              <span className="text-xs text-slate-500 font-medium">/ 100 Score</span>
            </div>
            <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-900 flex justify-between">
              <span>{scriptB.wordCount} words</span>
              <span>{new Date(scriptB.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Deterministic Interpretation & Observations */}
        <div className="p-4 rounded-2xl bg-slate-950/90 border border-indigo-500/20 space-y-2">
          <div className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-2">
            <span>💡 Deterministic Analysis Summary</span>
          </div>
          <p className="text-sm font-semibold text-white">{summary.headline}</p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            {summary.keyObservations.map((obs, idx) => (
              <li
                key={idx}
                className="text-xs text-slate-300 flex items-start gap-2 bg-slate-900/50 p-2.5 rounded-xl border border-slate-800"
              >
                <span className="text-indigo-400 shrink-0">•</span>
                <span>{obs}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Metric Breakdown Deltas */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-lg font-bold text-white">5 Core Retention Signal Deltas</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Direct comparison across hook, pacing, emotional resonance, value delivery, and CTA
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {Object.values(metricDeltas).map((m) => (
            <div
              key={m.key}
              className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 flex flex-col justify-between"
            >
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  {m.label}
                </span>
                <div className="flex items-baseline justify-between mt-2">
                  <div className="text-xs text-slate-400">
                    <span>A: <strong className="text-slate-200">{m.scoreA}</strong></span>
                    <span className="mx-1.5 text-slate-600">→</span>
                    <span>B: <strong className="text-white">{m.scoreB}</strong></span>
                  </div>
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-md tabular-nums ${
                      m.status === "improved"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : m.status === "declined"
                        ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                        : "bg-slate-800 text-slate-400 border border-slate-700"
                    }`}
                  >
                    {m.delta > 0 ? `+${m.delta}` : m.delta} pts
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-900 text-[11px] text-slate-500">
                {m.status === "improved" && "▲ Positive Gain"}
                {m.status === "declined" && "▼ Regression"}
                {m.status === "unchanged" && "▶ Steady"}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Retention Timeline Comparison Table */}
      {timelineComparison.length > 0 && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-lg font-bold text-white">Predicted Retention Timeline Comparison</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Second-by-second expected viewer drop-off progression
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase font-semibold border-b border-slate-800">
                <tr>
                  <th scope="col" className="px-4 py-3">Timestamp</th>
                  <th scope="col" className="px-4 py-3">Script A Retention</th>
                  <th scope="col" className="px-4 py-3">Script B Retention</th>
                  <th scope="col" className="px-4 py-3 text-right">Differential</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {timelineComparison.map((pt) => (
                  <tr key={pt.second} className="hover:bg-slate-800/30">
                    <td className="px-4 py-2.5 font-mono text-slate-200">
                      {pt.second}s mark
                    </td>
                    <td className="px-4 py-2.5 tabular-nums">
                      {pt.retentionA}%
                    </td>
                    <td className="px-4 py-2.5 tabular-nums text-white font-medium">
                      {pt.retentionB}%
                    </td>
                    <td className="px-4 py-2.5 text-right font-bold tabular-nums">
                      <span
                        className={
                          pt.delta > 0
                            ? "text-emerald-400"
                            : pt.delta < 0
                            ? "text-rose-400"
                            : "text-slate-500"
                        }
                      >
                        {pt.delta > 0 ? `+${pt.delta}%` : `${pt.delta}%`}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Side-by-Side Script Content Excerpts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-bold text-white text-xs">Script A Content</span>
            <span className="text-[11px] text-slate-400">{scriptA.wordCount} words</span>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 leading-relaxed font-sans max-h-72 overflow-y-auto whitespace-pre-wrap">
            {scriptA.script}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-bold text-white text-xs">Script B Content</span>
            <span className="text-[11px] text-slate-400">{scriptB.wordCount} words</span>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 leading-relaxed font-sans max-h-72 overflow-y-auto whitespace-pre-wrap">
            {scriptB.script}
          </div>
        </div>
      </div>
    </div>
  );
}
