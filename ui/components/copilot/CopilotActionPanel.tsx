"use client";

import { useState } from "react";
import type { FullAnalysis, Platform } from "@/lib/analyze";
import type {
  CopilotAction,
  CopilotResult,
  CopilotActionItem,
} from "@/lib/copilot";
import { applyHookToScript, applyCtaToScript } from "@/lib/copilot";
import { CopyButton } from "../ui/CopyButton";
import { Button } from "../ui/Button";

interface CopilotActionPanelProps {
  script: string;
  setScript: (script: string) => void;
  analysis: FullAnalysis;
  platform: Platform;
  onApplied?: () => void;
  onReviewInEditor?: () => void;
}

export function CopilotActionPanel({
  script,
  setScript,
  analysis,
  platform,
  onApplied,
  onReviewInEditor,
}: CopilotActionPanelProps) {
  const [activeAction, setActiveAction] = useState<CopilotAction | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<CopilotResult | null>(null);
  const [appliedIndex, setAppliedIndex] = useState<number | null>(null);
  const [appliedFeedback, setAppliedFeedback] = useState<string | null>(null);

  const detectedLanguage = analysis.detectedLanguage || "en";
  const targetLanguage = analysis.targetLanguage || detectedLanguage;

  const handleExecuteAction = async (action: CopilotAction) => {
    setActiveAction(action);
    setLoading(true);
    setError("");
    setResult(null);
    setAppliedIndex(null);
    setAppliedFeedback(null);

    try {
      const res = await fetch("/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          script: script.trim(),
          analysis,
          platform,
          targetLanguage,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(
          errorData.message || errorData.error || "Failed to execute Copilot action."
        );
      }

      const data = (await res.json()) as CopilotResult;
      setResult(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleApply = (item: CopilotActionItem, index: number) => {
    if (activeAction === "generate_hooks") {
      const updatedScript = applyHookToScript(script, item.text);
      setScript(updatedScript);
      setAppliedIndex(index);
      setAppliedFeedback(
        `Applied "${item.style}" hook to your script's opening line.`
      );
      if (onApplied) onApplied();
    } else if (activeAction === "improve_cta") {
      const updatedScript = applyCtaToScript(script, item.text);
      setScript(updatedScript);
      setAppliedIndex(index);
      setAppliedFeedback(
        `Applied "${item.style}" CTA to your script's concluding line.`
      );
      if (onApplied) onApplied();
    }
  };

  return (
    <section className="rounded-2xl border border-indigo-500/20 bg-gradient-to-b from-indigo-950/30 to-slate-900/60 p-5 sm:p-6 shadow-xl space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
              <span>⚡</span> Creator Copilot
            </span>
            <span className="text-xs text-slate-500">•</span>
            <span className="text-xs text-slate-400 font-medium">
              Language: <strong className="text-white uppercase">{targetLanguage}</strong>
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
            Bounded Retention Actions
          </h3>
          <p className="text-xs text-slate-400">
            Generate targeted, context-aware optimizations based on your retention score.
          </p>
        </div>

        {/* Action Trigger Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant={activeAction === "generate_hooks" && !result ? "primary" : "secondary"}
            size="sm"
            onClick={() => handleExecuteAction("generate_hooks")}
            loading={loading && activeAction === "generate_hooks"}
            disabled={loading}
            className="text-xs"
          >
            ⚡ Generate Hooks
          </Button>
          <Button
            variant={activeAction === "improve_cta" && !result ? "primary" : "secondary"}
            size="sm"
            onClick={() => handleExecuteAction("improve_cta")}
            loading={loading && activeAction === "improve_cta"}
            disabled={loading}
            className="text-xs"
          >
            🎯 Improve CTA
          </Button>
        </div>
      </div>

      {/* Applied Feedback Banner */}
      {appliedFeedback && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 animate-fadeIn">
          <div className="flex items-center gap-2">
            <span>✓</span>
            <span>{appliedFeedback}</span>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <span className="text-[11px] text-emerald-400/80 font-normal">
              Active in Draft
            </span>
            {onReviewInEditor && (
              <button
                type="button"
                onClick={onReviewInEditor}
                className="text-[11px] font-bold text-white bg-emerald-600/40 hover:bg-emerald-600/60 border border-emerald-500/40 px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
              >
                Review in Script Editor ↑
              </button>
            )}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center justify-between">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError("")}
            className="text-rose-400 hover:text-white cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Structured Result Cards */}
      {result && result.items.length > 0 && (
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold text-slate-300">
              Generated {result.action === "generate_hooks" ? "Hook" : "CTA"} Variations:
            </span>
            <span>Click &ldquo;Apply to Script Draft&rdquo; to update your editor</span>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {result.items.map((item, idx) => {
              const isApplied = appliedIndex === idx;
              return (
                <div
                  key={idx}
                  className={`flex flex-col justify-between p-4 rounded-xl border transition-all ${
                    isApplied
                      ? "bg-emerald-950/20 border-emerald-500/50 shadow-emerald-500/5 shadow-md"
                      : "bg-slate-950/80 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                        {item.style}
                      </span>
                      {isApplied && (
                        <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1">
                          ✓ Active in Draft
                        </span>
                      )}
                    </div>

                    <p className="text-xs sm:text-sm text-slate-200 font-medium leading-relaxed font-sans">
                      &ldquo;{item.text}&rdquo;
                    </p>

                    <p className="text-[11px] text-slate-400 italic leading-normal">
                      💡 {item.rationale}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-3 mt-3 border-t border-slate-800/80">
                    <CopyButton text={item.text} label="Copy" size="sm" className="text-xs" />
                    <button
                      type="button"
                      onClick={() => handleApply(item, idx)}
                      className={`flex-1 text-xs font-semibold py-1.5 px-2.5 rounded-lg transition-colors cursor-pointer text-center ${
                        isApplied
                          ? "bg-emerald-600/30 text-emerald-300 border border-emerald-500/40"
                          : "bg-indigo-600 hover:bg-indigo-500 text-white"
                      }`}
                    >
                      {isApplied ? "Applied ✓" : "Apply to Script"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
