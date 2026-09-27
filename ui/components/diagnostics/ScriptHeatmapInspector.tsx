"use client";

import { useState, useMemo } from "react";
import type { DropOffRisk } from "@/lib/analyze";
import { splitIntoSentences } from "@/lib/analyze";
import { Button } from "../ui/Button";

export interface AnalyzedSentence {
  index: number;
  text: string;
  risk: "High" | "Medium" | "Low";
  reason: string;
  fix: string;
  isOriginalMatch: boolean;
}

export function matchSentencesWithRisks(
  sentences: string[],
  dropOffRisks: DropOffRisk[]
): AnalyzedSentence[] {
  const matchedRiskIndices = new Set<number>();

  return sentences.map((sentence, idx) => {
    const cleanSentence = sentence.trim().toLowerCase();

    // 1. Try exact text match not yet consumed
    let matchIdx = dropOffRisks.findIndex(
      (r, rIdx) => !matchedRiskIndices.has(rIdx) && r.line.trim().toLowerCase() === cleanSentence
    );

    // 2. If positional match is available when lengths match
    if (matchIdx === -1 && dropOffRisks.length === sentences.length && !matchedRiskIndices.has(idx)) {
      matchIdx = idx;
    }

    // 3. Substring containment fallback
    if (matchIdx === -1) {
      matchIdx = dropOffRisks.findIndex(
        (r, rIdx) =>
          !matchedRiskIndices.has(rIdx) &&
          (cleanSentence.includes(r.line.trim().toLowerCase()) ||
            r.line.trim().toLowerCase().includes(cleanSentence))
      );
    }

    if (matchIdx !== -1) {
      matchedRiskIndices.add(matchIdx);
      const riskItem = dropOffRisks[matchIdx];
      const riskLevel: "High" | "Medium" | "Low" =
        riskItem.risk === "High" || riskItem.risk === "Medium" ? riskItem.risk : "Low";

      return {
        index: idx,
        text: sentence,
        risk: riskLevel,
        reason: riskItem.reason || "Line is clear and maintains pacing momentum.",
        fix: riskItem.fix || "Maintain dynamic visual pacing during filming.",
        isOriginalMatch: true,
      };
    }

    return {
      index: idx,
      text: sentence,
      risk: "Low",
      reason: "No critical drop-off friction detected for this sentence.",
      fix: "Keep as-is; maintain spoken momentum.",
      isOriginalMatch: false,
    };
  });
}

interface ScriptHeatmapInspectorProps {
  script: string;
  setScript?: (script: string) => void;
  dropOffRisks: DropOffRisk[];
  isDraftModified?: boolean;
  onResetDraft?: () => void;
}

export function ScriptHeatmapInspector({
  script,
  setScript,
  dropOffRisks,
  isDraftModified,
  onResetDraft,
}: ScriptHeatmapInspectorProps) {
  const sentences = useMemo(() => splitIntoSentences(script), [script]);
  const analyzedSentences = useMemo(
    () => matchSentencesWithRisks(sentences, dropOffRisks),
    [sentences, dropOffRisks]
  );

  // Initial selection: first High risk, or first Medium risk, or 0
  const initialIndex = useMemo(() => {
    const highIdx = analyzedSentences.findIndex((s) => s.risk === "High");
    if (highIdx !== -1) return highIdx;
    const medIdx = analyzedSentences.findIndex((s) => s.risk === "Medium");
    if (medIdx !== -1) return medIdx;
    return analyzedSentences.length > 0 ? 0 : null;
  }, [analyzedSentences]);

  const [manualSelectedIndex, setManualSelectedIndex] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"heatmap" | "edit">("heatmap");

  const selectedIndex = useMemo(() => {
    if (manualSelectedIndex !== null && manualSelectedIndex < analyzedSentences.length) {
      return manualSelectedIndex;
    }
    return initialIndex;
  }, [manualSelectedIndex, analyzedSentences.length, initialIndex]);

  const selectedSentence =
    selectedIndex !== null && analyzedSentences[selectedIndex]
      ? analyzedSentences[selectedIndex]
      : null;

  const totalRisks = analyzedSentences.filter((s) => s.risk === "High" || s.risk === "Medium").length;
  const highRisksCount = analyzedSentences.filter((s) => s.risk === "High").length;
  const medRisksCount = analyzedSentences.filter((s) => s.risk === "Medium").length;

  const handleNextRisk = () => {
    if (!analyzedSentences.length) return;
    const start = selectedIndex !== null ? selectedIndex + 1 : 0;
    for (let i = 0; i < analyzedSentences.length; i++) {
      const idx = (start + i) % analyzedSentences.length;
      if (analyzedSentences[idx].risk === "High" || analyzedSentences[idx].risk === "Medium") {
        setManualSelectedIndex(idx);
        return;
      }
    }
  };

  const handlePrevSentence = () => {
    if (selectedIndex === null || analyzedSentences.length === 0) return;
    setManualSelectedIndex((selectedIndex - 1 + analyzedSentences.length) % analyzedSentences.length);
  };

  const handleNextSentence = () => {
    if (selectedIndex === null || analyzedSentences.length === 0) return;
    setManualSelectedIndex((selectedIndex + 1) % analyzedSentences.length);
  };

  return (
    <section
      id="script-heatmap-surface"
      aria-label="Script Retention Diagnostic Heatmap"
      className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 sm:p-6 shadow-xl space-y-5"
    >
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
              <span>📍</span> Primary Script Surface
            </span>
            <span className="text-xs text-slate-500">•</span>
            <span className="text-xs text-slate-300 font-medium">
              {sentences.length} {sentences.length === 1 ? "Sentence" : "Sentences"} Analyzed
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
            Script Retention Heatmap & Diagnostic Inspector
          </h3>
          <p className="text-xs text-slate-400">
            Click any sentence in your script to inspect its retention risk, why viewers drop off, and the recommended fix.
          </p>
        </div>

        {/* View Mode & Risk Summary Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-xl">
            {highRisksCount > 0 && (
              <span className="font-bold text-rose-400 flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-rose-500 inline-block" />
                {highRisksCount} High
              </span>
            )}
            {highRisksCount > 0 && medRisksCount > 0 && <span className="text-slate-600">•</span>}
            {medRisksCount > 0 && (
              <span className="font-bold text-amber-400 flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-amber-500 inline-block" />
                {medRisksCount} Med
              </span>
            )}
            {totalRisks === 0 && (
              <span className="font-bold text-emerald-400 flex items-center gap-1">
                ✓ Smooth Flow
              </span>
            )}
          </div>

          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setViewMode("heatmap")}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                viewMode === "heatmap"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              👁️ Heatmap
            </button>
            {setScript && (
              <button
                type="button"
                onClick={() => setViewMode("edit")}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  viewMode === "edit"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                ✏️ Edit Draft
              </button>
            )}
          </div>
        </div>
      </div>

      {viewMode === "edit" && setScript ? (
        /* Edit Working Draft Surface */
        <div className="space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Directly edit your working draft below:</span>
            {isDraftModified && onResetDraft && (
              <button
                type="button"
                onClick={onResetDraft}
                className="text-xs text-slate-400 hover:text-white underline cursor-pointer"
              >
                ↺ Reset to baseline
              </button>
            )}
          </div>
          <textarea
            value={script}
            onChange={(e) => setScript(e.target.value)}
            rows={8}
            className="w-full rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-200 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition leading-relaxed resize-none font-sans"
            placeholder="Edit script content..."
          />
        </div>
      ) : (
        /* Interactive 2-Column Heatmap + Diagnostic Inspector Surface */
        <div className="grid gap-5 lg:grid-cols-12 items-start">
          {/* Left / Main Column: Interactive Script Surface */}
          <div className="lg:col-span-7 rounded-xl border border-slate-800/90 bg-slate-950/70 p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800/60 pb-2">
              <span className="font-semibold text-slate-300">Analyzed Script Geography</span>
              <span className="text-[11px] text-slate-400">Click sentence to inspect</span>
            </div>

            <div className="space-y-2.5 font-sans leading-relaxed text-sm sm:text-base">
              {analyzedSentences.map((s) => {
                const isSelected = selectedIndex === s.index;
                const isHigh = s.risk === "High";
                const isMed = s.risk === "Medium";

                return (
                  <button
                    key={s.index}
                    type="button"
                    onClick={() => setManualSelectedIndex(s.index)}
                    aria-pressed={isSelected}
                    aria-label={`Sentence ${s.index + 1}: ${s.risk} risk. ${s.text}`}
                    className={`w-full text-left p-3 rounded-xl transition-all duration-200 cursor-pointer block relative group focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
                      isSelected
                        ? "ring-2 ring-indigo-500 bg-indigo-950/40 shadow-lg shadow-indigo-950/40 border-indigo-500/60"
                        : isHigh
                        ? "bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-50"
                        : isMed
                        ? "bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-50"
                        : "bg-slate-900/40 hover:bg-slate-800/60 border border-slate-800/80 text-slate-200"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-[11px] font-mono font-semibold text-slate-400">
                        {s.index === 0 ? "🎯 Opening Hook" : `Sentence #${s.index + 1}`}
                      </span>

                      {/* Semantic Risk Badge */}
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                          isHigh
                            ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                            : isMed
                            ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                            : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        }`}
                      >
                        {isHigh ? "⚠ High Risk" : isMed ? "⚡ Med Risk" : "✓ Healthy"}
                      </span>
                    </div>

                    <p className="text-xs sm:text-sm font-medium leading-relaxed">
                      &ldquo;{s.text}&rdquo;
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Diagnostic Inspector Panel */}
          <div className="lg:col-span-5 lg:sticky lg:top-6 rounded-xl border border-slate-800 bg-slate-950/90 p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Diagnostic Inspector
                </span>
                {selectedSentence && (
                  <span className="text-xs text-slate-400 font-mono">
                    ({selectedSentence.index + 1} of {analyzedSentences.length})
                  </span>
                )}
              </div>

              {totalRisks > 0 && (
                <button
                  type="button"
                  onClick={handleNextRisk}
                  className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer flex items-center gap-1"
                >
                  Next Problem ⚡
                </button>
              )}
            </div>

            {selectedSentence ? (
              <div className="space-y-4 animate-fadeIn">
                {/* Active Risk Level Banner */}
                <div
                  className={`p-3 rounded-xl border flex items-center justify-between ${
                    selectedSentence.risk === "High"
                      ? "bg-rose-500/15 border-rose-500/30 text-rose-300"
                      : selectedSentence.risk === "Medium"
                      ? "bg-amber-500/15 border-amber-500/30 text-amber-300"
                      : "bg-emerald-500/10 border-emerald-500/25 text-emerald-300"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold">
                      {selectedSentence.risk === "High" ? "🚨" : selectedSentence.risk === "Medium" ? "⚠️" : "✓"}
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wider">
                      {selectedSentence.risk === "High"
                        ? "Critical Drop-Off Risk"
                        : selectedSentence.risk === "Medium"
                        ? "Moderate Retention Friction"
                        : "Healthy Sentence Pacing"}
                    </span>
                  </div>
                  <span className="text-xs font-mono font-semibold">
                    {selectedSentence.index === 0 ? "Opening Hook" : `Sentence #${selectedSentence.index + 1}`}
                  </span>
                </div>

                {/* Selected Sentence Quote */}
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Script Text
                  </span>
                  <p className="text-xs sm:text-sm font-semibold text-white border-l-2 border-indigo-500/80 pl-3 py-1 bg-slate-900/50 rounded-r-lg">
                    &ldquo;{selectedSentence.text}&rdquo;
                  </p>
                </div>

                {/* Why Viewers Leave */}
                <div className="space-y-1 bg-slate-900/40 p-3.5 rounded-xl border border-slate-800/80">
                  <span className="text-[11px] font-bold text-rose-300 uppercase tracking-wider flex items-center gap-1.5">
                    <span>📉</span> Why Viewers Drop Off
                  </span>
                  <p className="text-xs text-slate-200 leading-relaxed font-medium">
                    {selectedSentence.reason}
                  </p>
                </div>

                {/* Recommended Fix */}
                <div className="space-y-1 bg-emerald-950/20 p-3.5 rounded-xl border border-emerald-500/30">
                  <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span>💡</span> Recommended Fix
                  </span>
                  <p className="text-xs text-emerald-100 leading-relaxed font-medium">
                    {selectedSentence.fix}
                  </p>
                </div>

                {/* Sentence Navigation Footer */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrevSentence}
                    disabled={analyzedSentences.length <= 1}
                    className="text-xs"
                  >
                    ← Prev
                  </Button>
                  <span className="text-slate-400 text-[11px]">
                    Sentence {selectedSentence.index + 1} of {analyzedSentences.length}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextSentence}
                    disabled={analyzedSentences.length <= 1}
                    className="text-xs"
                  >
                    Next →
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-slate-400 space-y-2">
                <span className="text-2xl block">📍</span>
                <p>Select any sentence on the left to inspect its retention diagnostics.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
