"use client";

import { useState } from "react";
import Link from "next/link";
import { DEMO_SAMPLES, type DemoSample } from "@/lib/demoSamples";
import RetentionGraph from "../RetentionGraph";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Card } from "../ui/Card";
import { CopyButton } from "../ui/CopyButton";
import { ScoreBadge } from "../ui/ScoreBadge";
import ScriptDiff from "../ScriptDiff";

export function InteractiveDemo() {
  const [selectedSample, setSelectedSample] = useState<DemoSample>(DEMO_SAMPLES[0]);
  const [activeTab, setActiveTab] = useState<"overview" | "risks" | "rewrites">("overview");
  const [selectedRewriteIndex, setSelectedRewriteIndex] = useState(0);
  const [diffMode, setDiffMode] = useState<"rewritten" | "diff">("rewritten");

  const { analysis } = selectedSample;
  const currentRewrite = analysis.rewrites[selectedRewriteIndex] || analysis.rewrites[0];

  return (
    <section id="demo" className="py-12 sm:py-16 px-4 sm:px-6 border-t border-slate-900 bg-slate-950/70">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Section Header */}
        <div className="text-center space-y-2.5 max-w-2xl mx-auto">
          <Badge variant="indigo" size="md">
            Live Product Demonstration
          </Badge>
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
            See how CRC analyzes a script
          </h2>
          <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
            Select a creator example below to inspect the authentic 5-signal breakdown, predicted drop-off curve, and line-level rewrites.
          </p>
        </div>

        {/* Sample Selector Tabs */}
        <div
          role="tablist"
          aria-label="Creator script examples"
          className="flex flex-wrap items-center justify-center gap-2"
        >
          {DEMO_SAMPLES.map((sample) => {
            const isSelected = sample.id === selectedSample.id;
            return (
              <button
                key={sample.id}
                role="tab"
                id={`tab-sample-${sample.id}`}
                aria-selected={isSelected}
                aria-controls="demo-workspace-card"
                tabIndex={isSelected ? 0 : -1}
                onClick={() => {
                  setSelectedSample(sample);
                  setSelectedRewriteIndex(0);
                }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer border focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none ${
                  isSelected
                    ? "bg-indigo-600/20 border-indigo-500/60 text-white shadow-md shadow-indigo-950/40"
                    : "bg-slate-900/50 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                }`}
              >
                <span>{sample.title}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                  {sample.platform}
                </span>
              </button>
            );
          })}
        </div>

        {/* Demo Interactive Workspace Card */}
        <div
          id="demo-workspace-card"
          className="rounded-2xl border border-slate-800 bg-slate-900/30 overflow-hidden shadow-2xl"
        >
          {/* Demo Sub-navigation Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 sm:p-5 border-b border-slate-800 bg-slate-950/80">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-md border border-indigo-500/20">
                {selectedSample.platform}
              </span>
              <span className="text-xs text-slate-400 font-medium hidden sm:inline">
                {selectedSample.category}
              </span>
            </div>

            {/* View Switcher */}
            <div
              role="tablist"
              aria-label="Analysis report views"
              className="flex items-center gap-1.5 bg-slate-900/80 p-1 rounded-xl border border-slate-800 w-full sm:w-auto justify-center"
            >
              <button
                role="tab"
                id="tab-view-overview"
                aria-selected={activeTab === "overview"}
                aria-controls="panel-view-overview"
                tabIndex={activeTab === "overview" ? 0 : -1}
                onClick={() => setActiveTab("overview")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none ${
                  activeTab === "overview"
                    ? "bg-indigo-600 text-white shadow"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                1. Score & Timeline
              </button>
              <button
                role="tab"
                id="tab-view-risks"
                aria-selected={activeTab === "risks"}
                aria-controls="panel-view-risks"
                tabIndex={activeTab === "risks" ? 0 : -1}
                onClick={() => setActiveTab("risks")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none ${
                  activeTab === "risks"
                    ? "bg-indigo-600 text-white shadow"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                2. Drop-off Risks ({analysis.dropOffRisks.length})
              </button>
              <button
                role="tab"
                id="tab-view-rewrites"
                aria-selected={activeTab === "rewrites"}
                aria-controls="panel-view-rewrites"
                tabIndex={activeTab === "rewrites" ? 0 : -1}
                onClick={() => setActiveTab("rewrites")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none ${
                  activeTab === "rewrites"
                    ? "bg-indigo-600 text-white shadow"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                3. Rewrites (3)
              </button>
            </div>
          </div>

          {/* Demo Main Content Area */}
          <div className="p-5 sm:p-7 space-y-6">
            {/* TAB 1: OVERVIEW (Score & Timeline) */}
            {activeTab === "overview" && (
              <div
                role="tabpanel"
                id="panel-view-overview"
                aria-labelledby="tab-view-overview"
                className="space-y-6"
              >
                <div className="grid sm:grid-cols-12 gap-5">
                  {/* Left: Score & Signals */}
                  <div className="sm:col-span-5 space-y-4">
                    <Card variant="muted" className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">
                          Retention Score
                        </span>
                        <ScoreBadge score={analysis.score} size="md" showLabel />
                      </div>

                      <div className="space-y-2 pt-2 border-t border-slate-800/80">
                        {Object.entries(analysis.metrics).map(([key, val]) => (
                          <div key={key} className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="capitalize text-slate-300 font-medium">{key}</span>
                              <span className="font-mono text-slate-400">{val}/100</span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  val >= 75
                                    ? "bg-emerald-400"
                                    : val >= 50
                                    ? "bg-amber-400"
                                    : "bg-rose-400"
                                }`}
                                style={{ width: `${val}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>

                    {/* Drop-off prediction callout */}
                    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3.5 space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                        <span>⚠️</span>
                        <span>Estimated Drop-Off at Second {analysis.dropoffPrediction.second}</span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {analysis.dropoffPrediction.reason}
                      </p>
                    </div>
                  </div>

                  {/* Right: Predicted Retention Curve Graph */}
                  <div className="sm:col-span-7 space-y-2">
                    <Card variant="muted" className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">
                          Predicted Retention Timeline
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">0s – 30s</span>
                      </div>
                      <RetentionGraph data={analysis.retentionTimeline} />
                    </Card>
                  </div>
                </div>

                {/* Original Script Sample Box */}
                <Card variant="default" className="p-4 space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Original Submitted Script
                  </span>
                  <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-sans bg-slate-950/80 p-3.5 rounded-xl border border-slate-800/80">
                    {selectedSample.script}
                  </p>
                </Card>
              </div>
            )}

            {/* TAB 2: LINE-LEVEL RISKS */}
            {activeTab === "risks" && (
              <div
                role="tabpanel"
                id="panel-view-risks"
                aria-labelledby="tab-view-risks"
                className="space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white">
                    Identified Drop-Off Friction Points
                  </h3>
                  <Badge variant="amber" size="sm">
                    {analysis.dropOffRisks.length} Risk Items
                  </Badge>
                </div>

                <div className="space-y-3">
                  {analysis.dropOffRisks.map((risk, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-slate-800 bg-slate-950/80 p-4 space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-mono font-semibold text-rose-300 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded">
                          {risk.risk} Risk Friction
                        </span>
                      </div>

                      <div className="text-xs sm:text-sm font-medium text-slate-200 border-l-2 border-rose-500/50 pl-3">
                        &ldquo;{risk.line}&rdquo;
                      </div>

                      <div className="grid sm:grid-cols-2 gap-3 text-xs pt-1 border-t border-slate-800/60">
                        <div className="space-y-1">
                          <span className="text-slate-400 font-semibold">Why Viewers Drop:</span>
                          <p className="text-slate-300 leading-relaxed">{risk.reason}</p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-emerald-400 font-semibold">Recommended Fix:</span>
                          <p className="text-slate-300 leading-relaxed">{risk.fix}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 3: 3 REWRITES */}
            {activeTab === "rewrites" && (
              <div
                role="tabpanel"
                id="panel-view-rewrites"
                aria-labelledby="tab-view-rewrites"
                className="space-y-5"
              >
                {/* Style Selector Tabs */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div
                    role="tablist"
                    aria-label="Rewrite styles"
                    className="flex items-center gap-2"
                  >
                    {analysis.rewrites.map((rw, i) => (
                      <button
                        key={rw.type}
                        role="tab"
                        id={`tab-rewrite-${i}`}
                        aria-selected={selectedRewriteIndex === i}
                        tabIndex={selectedRewriteIndex === i ? 0 : -1}
                        onClick={() => setSelectedRewriteIndex(i)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer border focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none ${
                          selectedRewriteIndex === i
                            ? "bg-indigo-600 text-white border-indigo-500"
                            : "bg-slate-900/60 text-slate-400 border-slate-800 hover:text-white"
                        }`}
                      >
                        {rw.type}
                      </button>
                    ))}
                  </div>

                  {/* Diff mode toggle & copy */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setDiffMode(diffMode === "rewritten" ? "diff" : "rewritten")}
                      className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
                    >
                      {diffMode === "rewritten" ? "Show Line Diff" : "Show Clean Script"}
                    </button>
                    <CopyButton text={currentRewrite.script} label="Copy Rewrite" />
                  </div>
                </div>

                {/* Rewrite Script Box */}
                <div className="rounded-xl border border-slate-800 bg-slate-950/90 p-4 sm:p-5 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                      ✨ {currentRewrite.type} Version
                    </span>
                    <span className="text-xs text-slate-400 font-medium">Ready to Film</span>
                  </div>

                  <ScriptDiff
                    original={selectedSample.script}
                    improved={currentRewrite.script}
                    mode={diffMode}
                  />
                </div>

                {/* Hook Title Suggestions */}
                <div className="rounded-xl border border-slate-800/80 bg-slate-900/30 p-4 space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Alternative Viral Hook Titles
                  </span>
                  <div className="grid sm:grid-cols-3 gap-2 pt-1">
                    {analysis.viralTitleSuggestions.map((title, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-xs text-slate-200"
                      >
                        <span className="truncate pr-2 font-medium">{title}</span>
                        <CopyButton text={title} label="Copy" size="sm" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Conversion CTA Strip inside Demo */}
          <div className="p-4 sm:p-5 bg-gradient-to-r from-indigo-950/60 via-slate-900 to-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left space-y-0.5">
              <p className="text-xs sm:text-sm font-bold text-white">
                Ready to analyze your own short-form script?
              </p>
              <p className="text-xs text-slate-400">
                Receive 1 complete full diagnostic report for your video in seconds.
              </p>
            </div>
            <Link href="/auth/login?next=/app/analyze" className="w-full sm:w-auto">
              <Button size="md" variant="primary" className="w-full sm:w-auto px-6">
                Audit Your Script Free →
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
