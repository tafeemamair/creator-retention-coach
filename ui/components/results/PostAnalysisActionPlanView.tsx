"use client";

import { useMemo, useState } from "react";
import type { FullAnalysis } from "@/lib/analyze";
import { generateActionPlan, type ActionPlanItem } from "@/lib/actionPlan";
import { CopyButton } from "../ui/CopyButton";

interface PostAnalysisActionPlanViewProps {
  analysis: FullAnalysis;
}

export function PostAnalysisActionPlanView({ analysis }: PostAnalysisActionPlanViewProps) {
  const [completedActions, setCompletedActions] = useState<Record<string, boolean>>({});

  const plan = useMemo(() => {
    return generateActionPlan(analysis);
  }, [analysis]);

  if (!plan || plan.items.length === 0) {
    return null;
  }

  const toggleAction = (id: string) => {
    setCompletedActions((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const formattedPlanText = [
    `# Creator Retention Action Plan`,
    `Summary: ${plan.summary}`,
    `Total Action Items: ${plan.totalActions} (${plan.highPriorityCount} High Priority)\n`,
    ...plan.items.map(
      (item, idx) =>
        `${idx + 1}. [${item.priority.toUpperCase()}] ${item.title}\n` +
        `   • Issue: ${item.description}\n` +
        `   • Recommended Fix: ${item.recommendedFix}` +
        (item.targetLine ? `\n   • Target Line: "${item.targetLine}"` : "")
    ),
  ].join("\n");

  const completedCount = Object.values(completedActions).filter(Boolean).length;

  return (
    <section
      id="post-analysis-action-plan"
      className="rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-slate-900 via-indigo-950/20 to-slate-900 p-5 sm:p-6 shadow-xl space-y-4"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-indigo-400 animate-pulse" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Step-by-Step Creator Action Plan
            </h3>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
              {plan.totalActions} {plan.totalActions === 1 ? "Action" : "Actions"}
            </span>
          </div>
          <p className="text-xs text-slate-300 mt-1 leading-relaxed max-w-2xl">
            {plan.summary}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {plan.totalActions > 0 && (
            <span className="text-xs font-mono text-slate-400 mr-1">
              {completedCount}/{plan.totalActions} Completed
            </span>
          )}
          <CopyButton
            text={formattedPlanText}
            label="Copy Action Plan"
            copiedLabel="Action Plan Copied!"
            size="sm"
            className="text-xs"
          />
        </div>
      </div>

      {/* Action Items List */}
      <div className="space-y-3 pt-1">
        {plan.items.map((item: ActionPlanItem, index: number) => {
          const isDone = Boolean(completedActions[item.id]);

          return (
            <div
              key={item.id}
              onClick={() => toggleAction(item.id)}
              className={`group p-4 rounded-xl border transition-all cursor-pointer select-none ${
                isDone
                  ? "bg-slate-950/40 border-slate-800/60 opacity-60"
                  : item.priority === "high"
                  ? "bg-slate-950/90 border-rose-500/30 hover:border-rose-500/50 shadow-sm"
                  : item.priority === "medium"
                  ? "bg-slate-950/90 border-amber-500/30 hover:border-amber-500/50 shadow-sm"
                  : "bg-slate-950/90 border-slate-800 hover:border-slate-700 shadow-sm"
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Interactive Checkbox */}
                <button
                  type="button"
                  aria-label={`Mark action #${index + 1} complete`}
                  className={`mt-0.5 h-5 w-5 rounded-md border flex items-center justify-center transition-colors shrink-0 ${
                    isDone
                      ? "bg-emerald-500 border-emerald-400 text-white font-bold text-xs"
                      : "border-slate-700 bg-slate-900 group-hover:border-indigo-400 text-transparent"
                  }`}
                >
                  ✓
                </button>

                <div className="space-y-2 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-slate-500">#{index + 1}</span>
                      <h4
                        className={`text-sm font-semibold transition-colors ${
                          isDone ? "line-through text-slate-400" : "text-white group-hover:text-indigo-200"
                        }`}
                      >
                        {item.title}
                      </h4>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-medium text-slate-400 px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                        {item.categoryLabel}
                      </span>
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                          item.priority === "high"
                            ? "bg-rose-500/10 text-rose-300 border border-rose-500/30"
                            : item.priority === "medium"
                            ? "bg-amber-500/10 text-amber-300 border border-amber-500/30"
                            : "bg-slate-800 text-slate-400 border border-slate-700"
                        }`}
                      >
                        {item.priority} Priority
                      </span>
                    </div>
                  </div>

                  {item.targetLine && (
                    <div className="text-xs text-slate-300 border-l-2 border-indigo-500/60 pl-2.5 py-0.5 font-mono italic">
                      &ldquo;{item.targetLine}&rdquo;
                    </div>
                  )}

                  <p className="text-xs text-slate-300 leading-relaxed">
                    <strong className="text-slate-400 font-semibold">Diagnosis: </strong>
                    {item.description}
                  </p>

                  <div className="p-2.5 rounded-lg bg-indigo-950/30 border border-indigo-500/20 text-xs text-indigo-200 leading-relaxed flex items-start gap-2">
                    <span className="text-indigo-400 font-bold shrink-0">Action:</span>
                    <span>{item.recommendedFix}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
