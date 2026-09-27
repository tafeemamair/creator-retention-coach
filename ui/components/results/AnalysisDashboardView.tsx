"use client";

import { useState } from "react";
import RetentionDashboard from "../RetentionDashboard";
import ScriptRewrite from "../ScriptRewrite";
import PricingSelector, { type PricingPlan } from "../pricing/PricingSelector";
import type { FullAnalysis, Platform } from "@/lib/analyze";
import { formatFullAuditToMarkdown } from "@/lib/formatAudit";
import { CopyButton } from "../ui/CopyButton";
import { Button } from "../ui/Button";
import { CopilotActionPanel } from "../copilot/CopilotActionPanel";
import { ScriptHeatmapInspector } from "../diagnostics/ScriptHeatmapInspector";
import { PostAnalysisActionPlanView } from "./PostAnalysisActionPlanView";
import { AnalysisFeedbackSection } from "../analyses/AnalysisFeedbackSection";

interface AnalysisDashboardViewProps {
  analysis: FullAnalysis;
  script: string;
  setScript: (script: string) => void;
  originalScript?: string;
  onResetDraft?: () => void;
  platform: Platform;
  setPlatform: (platform: Platform) => void;
  onReAnalyze: () => Promise<void>;
  onNewAnalysis: () => void;
  loadingReAnalyze: boolean;
  creditsRemaining: number | null;
  totalCredits: number | null;
  currentPlan: PricingPlan | null;
  isFreeAnalysis?: boolean;
  selectedPlan: PricingPlan;
  setSelectedPlan: (plan: PricingPlan) => void;
  onUnlock: () => void;
  loadingUnlock: boolean;
  analysisId?: string | null;
  isRevision?: boolean;
}

export default function AnalysisDashboardView({
  analysis,
  script,
  setScript,
  originalScript,
  onResetDraft,
  platform,
  setPlatform,
  onReAnalyze,
  onNewAnalysis,
  loadingReAnalyze,
  creditsRemaining,
  totalCredits,
  currentPlan,
  isFreeAnalysis,
  selectedPlan,
  setSelectedPlan,
  onUnlock,
  loadingUnlock,
  analysisId,
  isRevision,
}: AnalysisDashboardViewProps) {
  const [showEditor, setShowEditor] = useState(false);
  const [editorHighlighted, setEditorHighlighted] = useState(false);
  const wordCount = script.trim() ? script.trim().split(/\s+/).filter(Boolean).length : 0;
  const fullAuditMarkdown = formatFullAuditToMarkdown(analysis, script, platform);
  const isDraftModified = Boolean(
    originalScript && script.trim() !== originalScript.trim()
  );

  const handleReviewInEditor = () => {
    setShowEditor(true);
    setEditorHighlighted(true);
    setTimeout(() => {
      const el = document.getElementById("script-editor-container");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 50);
    setTimeout(() => {
      setEditorHighlighted(false);
    }, 2500);
  };

  const handleReAnalyzeClick = () => {
    if (isDraftModified && creditsRemaining === 0) {
      onUnlock();
      return;
    }
    onReAnalyze();
  };

  return (
    <div className="space-y-6">
      {/* Working Draft Status Notification Banner */}
      {isDraftModified && (
        <div
          id="draft-status-banner"
          className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-amber-950/20 to-slate-900/60 p-4 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn"
        >
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold text-base shrink-0">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                  Working Draft Active
                </span>
                <span className="text-xs text-amber-300 font-medium">
                  • Uses 1 Credit • {creditsRemaining ?? 0} Available
                </span>
              </div>
              <p className="text-xs text-slate-200 mt-1 font-medium">
                Working draft has unanalyzed changes.
              </p>
              <p className="text-[11px] text-slate-400">
                The retention diagnostics below currently reflect your original analyzed baseline.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onResetDraft && (
              <Button
                variant="outline"
                size="sm"
                onClick={onResetDraft}
                disabled={loadingReAnalyze}
                className="text-xs text-slate-300 hover:text-white"
              >
                ↺ Reset to Original
              </Button>
            )}
            <Button
              variant="primary"
              size="sm"
              onClick={handleReAnalyzeClick}
              loading={loadingReAnalyze}
              disabled={!script.trim()}
              className="text-xs bg-amber-600 hover:bg-amber-500 border-amber-500/50"
            >
              ⚡ Re-Analyze Draft
            </Button>
          </div>
        </div>
      )}

      {/* Top Bar: Script Metadata & Quick Actions */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20">
                {platform}
              </span>
              <span className="text-xs text-slate-500 font-semibold">•</span>
              <span className="text-xs text-slate-400 font-semibold">
                Script Length: <strong className="text-white">{wordCount} words</strong>
              </span>
              {isFreeAnalysis && (
                <>
                  <span className="text-xs text-slate-500 font-semibold">•</span>
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                    Complimentary Report
                  </span>
                </>
              )}
            </div>
            <h2 className="text-lg font-bold text-white">
              Retention Intelligence Diagnostics
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <CopyButton
              text={fullAuditMarkdown}
              label="Copy Full Audit"
              copiedLabel="Full Audit Copied!"
              size="sm"
              className="text-xs"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowEditor(!showEditor)}
              className="text-xs"
            >
              {showEditor ? "Hide Script Editor ▲" : "View / Edit Script ▼"}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={onNewAnalysis}
              className="text-xs"
            >
              + New Analysis
            </Button>
          </div>
        </div>

        {/* Expandable Composer Drawer */}
        {showEditor && (
          <div
            id="script-editor-container"
            className={`border-t border-slate-800/80 pt-4 space-y-4 transition-all duration-500 ${
              editorHighlighted
                ? "ring-2 ring-emerald-500/50 bg-emerald-950/20 rounded-xl p-3"
                : ""
            }`}
          >
            <div className="grid gap-4 sm:grid-cols-12">
              <div className="sm:col-span-4 space-y-1">
                <label htmlFor="platform-unlocked" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Platform
                </label>
                <select
                  id="platform-unlocked"
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value as Platform)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-sm text-slate-200 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                >
                  <option>YouTube Shorts</option>
                  <option>TikTok</option>
                  <option>Instagram Reels</option>
                </select>
              </div>
              <div className="sm:col-span-8 flex items-end justify-between text-xs text-slate-400 pb-1">
                {isDraftModified ? (
                  <span className="text-amber-300 font-medium">
                    ⚡ Modified draft • Uses 1 Credit • {creditsRemaining ?? 0} Available
                  </span>
                ) : (
                  <span>⚡ Re-analyzing an unmodified script is always free (0 credits).</span>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="script-unlocked" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Script Content
              </label>
              <textarea
                id="script-unlocked"
                value={script}
                onChange={(e) => setScript(e.target.value)}
                rows={6}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-200 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition leading-relaxed resize-none font-sans"
              />
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
              <div className="text-xs text-slate-400">
                {isDraftModified && onResetDraft && (
                  <button
                    type="button"
                    onClick={onResetDraft}
                    disabled={loadingReAnalyze}
                    className="text-xs text-slate-400 hover:text-slate-200 underline cursor-pointer"
                  >
                    ↺ Reset to original baseline
                  </button>
                )}
              </div>
              <Button
                variant="primary"
                size="md"
                onClick={handleReAnalyzeClick}
                loading={loadingReAnalyze}
                disabled={!script.trim()}
                className={isDraftModified ? "bg-amber-600 hover:bg-amber-500 border-amber-500/50" : ""}
              >
                {isDraftModified
                  ? `⚡ Re-Analyze Draft (${creditsRemaining !== null ? `Uses 1 Credit • ${creditsRemaining} Available` : "Uses 1 Credit"})`
                  : "⚡ Re-Analyze Baseline (0 Credits)"}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Credit Balance Indicator */}
      {creditsRemaining !== null && totalCredits !== null && (
        <div
          id="credit-indicator"
          className="flex items-center justify-between bg-slate-900/60 border border-slate-800/80 rounded-xl px-4 py-3 text-xs"
        >
          <div className="flex items-center space-x-2 text-slate-200">
            <span className="text-amber-400">⚡</span>
            <span>
              <strong className="text-white font-bold">{creditsRemaining} of {totalCredits}</strong> credits remaining • Active for {currentPlan === "pack5" ? 90 : 30} days
            </span>
          </div>
          {creditsRemaining > 0 ? (
            <span className="text-xs uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              Active Balance
            </span>
          ) : (
            <span className="text-xs uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400">
              0 Credits Left
            </span>
          )}
        </div>
      )}

      {/* V2.2 Phase 1: Primary Script Surface with Heatmap & Diagnostic Inspector */}
      <ScriptHeatmapInspector
        script={script}
        setScript={setScript}
        dropOffRisks={analysis?.dropOffRisks || []}
        isDraftModified={isDraftModified}
        onResetDraft={onResetDraft}
      />

      {/* Analytical Retention Dashboard (Score, Signals, Curve, Risks) */}
      <RetentionDashboard data={analysis} />

      {/* Post-Analysis Deterministic Creator Action Plan */}
      <PostAnalysisActionPlanView analysis={analysis} />

      {/* Creator Copilot Bounded Actions Panel */}
      <CopilotActionPanel
        script={script}
        setScript={setScript}
        analysis={analysis}
        platform={platform}
        onApplied={handleReviewInEditor}
        onReviewInEditor={handleReviewInEditor}
      />

      {/* 5: 3 Alternative Hook Titles */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 sm:p-6 shadow-lg space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <h3 className="font-bold text-white flex items-center space-x-2 text-sm sm:text-base">
            <span>💡 3 Alternative Viral Hook Titles</span>
          </h3>
          <span className="text-xs text-slate-400 font-medium">Click to Copy</span>
        </div>

        <div className="grid sm:grid-cols-3 gap-3 pt-1">
          {(analysis?.viralTitleSuggestions ?? [
            "Your Hook Is Costing You Views",
            "The 3-Second Fix For Shorts",
            "Why Viewers Drop Off Fast",
          ]).map((title, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 text-xs text-slate-200 gap-2"
            >
              <span className="truncate font-medium">{title}</span>
              <CopyButton text={title} label="Copy" size="sm" />
            </div>
          ))}
        </div>
      </section>

      {/* 6: 3 Retention-Focused Rewrites */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm sm:text-base font-bold text-white flex items-center space-x-2">
            <span>✨ 3 Ready-to-Film Retention Rewrites</span>
          </h3>
          <span className="text-xs text-slate-400">Tailored framework versions</span>
        </div>

        {(analysis?.rewrites ?? [
          { type: "Curiosity Hook", script: "Generating versions..." },
        ]).map((rewrite) => (
          <ScriptRewrite
            key={rewrite.type}
            original={script}
            improved={rewrite.script}
            type={rewrite.type}
          />
        ))}
      </div>

      {/* 7: Upgrade Callout when Free Analysis used or Credits = 0 */}
      {(isFreeAnalysis || creditsRemaining === 0) && (
        <div id="pricing-selector-container" className="pt-4">
          <PricingSelector
            selectedPlan={selectedPlan}
            setSelectedPlan={setSelectedPlan}
            onUnlock={onUnlock}
            loading={loadingUnlock}
            creditsRemaining={creditsRemaining}
            totalCredits={totalCredits}
            currentPlan={currentPlan}
            title={isFreeAnalysis ? "Ready to Audit Your Next Script?" : "Need More Retention Reports?"}
            subtitle={
              isFreeAnalysis
                ? "You experienced 1 complete analysis for free. Upgrade to a Single Report (₹49) or Creator Pack (₹149) to unlock full diagnostics for your next videos."
                : "You have used all credits from your previous pack. Select a plan below to continue analyzing scripts."
            }
          />
        </div>
      )}

      {/* 8: Creator Diagnostic Feedback Section */}
      <AnalysisFeedbackSection
        analysisId={analysisId}
        isRevision={isRevision}
      />

      {/* Sticky Working Draft Bottom Status Bar */}
      {isDraftModified && (
        <div
          id="sticky-draft-bar"
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-2xl bg-slate-900/95 backdrop-blur-md border border-amber-500/40 rounded-2xl p-3.5 sm:p-4 shadow-2xl shadow-black/80 flex flex-col sm:flex-row items-center justify-between gap-3 animate-fadeIn"
        >
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <div className="h-8 w-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold text-sm shrink-0">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-amber-300">
                  ⚡ Working Draft Active
                </span>
                <span className="text-[11px] text-slate-400 hidden sm:inline">• Unanalyzed changes</span>
              </div>
              <p className="text-[11px] text-slate-400">
                {creditsRemaining !== null && creditsRemaining === 0
                  ? "Uses 1 Credit • 0 Available (Upgrade to Re-Analyze)"
                  : `Uses 1 Credit • ${creditsRemaining ?? 0} Available`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
            {onResetDraft && (
              <Button
                variant="outline"
                size="sm"
                onClick={onResetDraft}
                disabled={loadingReAnalyze}
                className="text-xs text-slate-300 hover:text-white"
              >
                ↺ Reset
              </Button>
            )}
            <Button
              variant="primary"
              size="sm"
              onClick={handleReAnalyzeClick}
              loading={loadingReAnalyze}
              disabled={!script.trim()}
              className="text-xs bg-amber-600 hover:bg-amber-500 border-amber-500/50 whitespace-nowrap"
            >
              ⚡ Re-Analyze Draft
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
