"use client";

import { useMemo, useState } from "react";
import RetentionDashboard from "./RetentionDashboard";
import ScriptRewrite from "./ScriptRewrite";

type Analysis = {
  score: number;
  metrics: { hook: number; pacing: number; emotion: number; value: number; cta: number };
  dropoffPrediction: { second: number; reason: string };
  retentionTimeline: Array<{ second: number; retention: number }>;
  dropOffRisks: Array<{ line: string; reason: string }>;
  rewrites: Array<{ type: "Curiosity Hook" | "Fast-Paced Retention" | "Emotional Storytelling"; script: string }>;
  improvedScript: string;
  viralTitleSuggestions: string[];
};

type Preview = {
  score: number;
  metrics: Analysis["metrics"];
  dropoffPrediction: Analysis["dropoffPrediction"];
};

type PreviewApiResponse = {
  preview: Preview;
  message?: string;
};

type FullApiResponse = {
  analysis?: Analysis;
  blocked?: boolean;
  message?: string;
};

export default function RetentionForm() {
  const [script, setScript] = useState("");
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [fullAnalysis, setFullAnalysis] = useState<Analysis | null>(null);
  const [status, setStatus] = useState<"locked" | "loading" | "unlocked">("locked");
  const [upgradeMessage, setUpgradeMessage] = useState("Unlock full retention dashboard, script rewrites, and title suggestions for ₹49.");
  const [platform, setPlatform] = useState<"YouTube Shorts" | "TikTok" | "Instagram Reels">("YouTube Shorts");

  const wordCount = script.trim() ? script.trim().split(/\s+/).length : 0;

  const payloadScript = useMemo(() => {
    if (!script.trim()) return "";
    return [
      script.trim(),
      "",
      `Optimize this script for retention on ${platform}.`,
      "Maximum 120 words.",
      "One sentence per line.",
      "Short punchy sentences suitable for Shorts.",
    ].join("\n");
  }, [script, platform]);


  async function onAnalyzePreview() {
    if (!payloadScript.trim()) return;
    setLoadingPreview(true);
    setError("");
    setFullAnalysis(null);
    setStatus("locked");
    setPreview(null);
    setUpgradeMessage("Unlock full retention dashboard, script rewrites, and title suggestions for ₹49.");

    try {
      const res = await fetch("/api/analyze-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ script: payloadScript, platform }),
      });

      const data = (await res.json()) as PreviewApiResponse;
      if (!res.ok) throw new Error(data.message || "Failed to generate preview");

      setPreview(data.preview);
      if (data.message) {
        setUpgradeMessage(data.message);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoadingPreview(false);
    }
  }

  async function unlockFullAnalysis() {
    if (!payloadScript.trim() || !preview) return;

    setError("");

    try {
      const res = await fetch("/api/analyze-full", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ script: payloadScript, platform }),
      });

      const data = (await res.json()) as FullApiResponse;
      if (!res.ok) throw new Error(data.message || "Failed to unlock full analysis.");
      if (!data.analysis) throw new Error("Full analysis data is missing.");

      setFullAnalysis(data.analysis);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    }
  }

  const handleUnlock = () => {
    console.log("Unlock clicked");
    setStatus("loading");
    document.cookie = "paid=true; Path=/; Max-Age=2592000; SameSite=Lax";

    setTimeout(() => {
      setStatus("unlocked");
    }, 1000);

    void unlockFullAnalysis();
  };

  const retentionInsights = useMemo(() => {
    if (!preview) return [];
    const primary =
      preview.metrics.hook < 70
        ? "Strengthen your first line with a curiosity gap to reduce early drop-off."
        : "Your hook is solid. Focus on tighter pacing and clear value beats to hold viewers longer.";

    return [primary, preview.dropoffPrediction.reason];
  }, [preview]);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <h1 className="text-2xl font-bold">Creator Retention Coach</h1>
        <p className="mb-4 mt-1 text-slate-300">Analyze Shorts scripts with retention metrics and AI rewrites.</p>
        <div className="mb-3">
          <label htmlFor="platform" className="mb-1 block text-xs text-slate-300">
            Platform
          </label>
          <select
            id="platform"
            value={platform}
            onChange={(e) => setPlatform(e.target.value as "YouTube Shorts" | "TikTok" | "Instagram Reels")}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-sm outline-none ring-blue-500 focus:ring"
          >
            <option>YouTube Shorts</option>
            <option>TikTok</option>
            <option>Instagram Reels</option>
          </select>
        </div>
        <textarea
          value={script}
          onChange={(e) => setScript(e.target.value)}
          rows={10}
          placeholder="Paste your YouTube Shorts script..."
          className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm outline-none ring-blue-500 focus:ring"
        />
        <p className="mt-2 text-xs text-slate-400">Word Count: {wordCount}</p>
        <button
          onClick={onAnalyzePreview}
          disabled={loadingPreview}
          className="mt-3 rounded-lg bg-blue-600 px-4 py-2 font-medium hover:bg-blue-500 disabled:opacity-60"
        >
          {loadingPreview ? "Analyzing..." : "Analyze Script"}
        </button>
        {error ? <p className="mt-2 text-sm text-red-400">{error}</p> : null}
      </section>

      {preview ? (
        <section className="rounded-xl border border-blue-700/60 bg-slate-900/50 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-300">Free Preview</p>
          <h2 className="mt-1 text-xl font-semibold">Your Script Retention Snapshot</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border border-slate-700 bg-slate-950/60 p-3">
              <p className="text-xs text-slate-400">Hook Strength Score</p>
              <p className="text-2xl font-bold text-blue-300">{Math.round(preview.metrics.hook)} / 100</p>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-950/60 p-3">
              <p className="text-xs text-slate-400">Predicted Drop-off</p>
              <p className="text-2xl font-bold text-amber-300">{preview.dropoffPrediction.second}s</p>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-950/60 p-3">
              <p className="text-xs text-slate-400">Overall Preview Score</p>
              <p className="text-2xl font-bold text-emerald-300">{Math.round(preview.score)} / 100</p>
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-slate-700 bg-slate-950/60 p-4 text-sm text-slate-200">
            <p className="font-medium text-slate-100">Basic retention insights</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {retentionInsights.map((insight) => (
                <li key={insight}>{insight}</li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {preview && status === "locked" ? (
        <section className="rounded-xl border border-amber-600/60 bg-amber-500/10 p-5">
          <h3 className="text-lg font-semibold text-amber-200">Unlock full analysis for ₹49</h3>
          <p className="mt-1 text-sm text-amber-100/90">{upgradeMessage}</p>
          <button onClick={handleUnlock} className="mt-3 rounded-lg bg-amber-500 px-4 py-2 font-medium text-slate-900 hover:bg-amber-400">
            Unlock Full Analysis — ₹49
          </button>
        </section>
      ) : null}

      {preview && status === "loading" ? (
        <section className="rounded-xl border border-slate-700 bg-slate-900/50 p-8 text-center text-slate-200">
          Loading full analysis...
        </section>
      ) : null}

      {preview && status === "unlocked" ? (
        <section className="rounded-xl">
          <div className="space-y-6">
            {fullAnalysis ? <RetentionDashboard data={fullAnalysis} /> : <div className="rounded-xl border bg-white p-8 text-center text-slate-500 shadow-sm">Loading full analysis...</div>}

            <section className="rounded-xl border bg-white p-4 text-slate-900 shadow-sm">
              <h3 className="mb-2 font-semibold">Viral Title Suggestions</h3>
              <ul className="list-disc pl-5 text-sm">
                {(fullAnalysis?.viralTitleSuggestions ?? ["Loading title suggestions..."]).map((title) => (
                  <li key={title}>{title}</li>
                ))}
              </ul>
            </section>

            {(fullAnalysis?.rewrites ?? [{ type: "Curiosity Hook", script: "Loading improved script versions..." }]).map((rewrite) => (
              <ScriptRewrite key={rewrite.type} original={script} improved={rewrite.script} type={rewrite.type} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
