"use client";

import { useState } from "react";
import RetentionDashboard from "./RetentionDashboard";
import ScriptRewrite from "./ScriptRewrite";

type Analysis = {
  score: number;
  metrics: { hook: number; pacing: number; emotion: number; value: number; cta: number };
  dropoffPrediction: { second: number; reason: string };
  retentionTimeline: Array<{ second: number; retention: number }>;
  rewrites: Array<{ type: "Curiosity Hook" | "Fast-Paced Retention" | "Emotional Storytelling"; script: string }>;
  improvedScript: string;
  viralTitleSuggestions: string[];
};

type ApiResponse = {
  blocked: boolean;
  preview: { score: number; metrics: Analysis["metrics"]; dropoffPrediction: Analysis["dropoffPrediction"] };
  analysis?: Analysis;
  message?: string;
};

export default function RetentionForm() {
  const [script, setScript] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ApiResponse | null>(null);

  async function onAnalyze() {
    if (!script.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ script }),
      });
      const data = (await res.json()) as ApiResponse;
      if (!res.ok) throw new Error(data.message || "Failed to analyze");
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <h1 className="text-2xl font-bold">Creator Retention Coach</h1>
        <p className="mb-4 mt-1 text-slate-300">Analyze Shorts scripts with retention metrics and AI rewrites.</p>
        <textarea
          value={script}
          onChange={(e) => setScript(e.target.value)}
          rows={10}
          placeholder="Paste your YouTube Shorts script..."
          className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm outline-none ring-blue-500 focus:ring"
        />
        <button
          onClick={onAnalyze}
          disabled={loading}
          className="mt-3 rounded-lg bg-blue-600 px-4 py-2 font-medium hover:bg-blue-500 disabled:opacity-60"
        >
          {loading ? "Analyzing..." : "Analyze Script"}
        </button>
        {error ? <p className="mt-2 text-sm text-red-400">{error}</p> : null}
        {result?.blocked ? <p className="mt-2 text-sm text-amber-300">{result.message}</p> : null}
      </section>

      {result?.analysis ? (
        <>
          <RetentionDashboard data={result.analysis} />

          <section className="rounded-xl border bg-white p-4 text-slate-900 shadow-sm">
            <h3 className="mb-2 font-semibold">Viral Title Suggestions</h3>
            <ul className="list-disc pl-5 text-sm">
              {result.analysis.viralTitleSuggestions.map((title) => (
                <li key={title}>{title}</li>
              ))}
            </ul>
          </section>

          {result.analysis.rewrites.map((rewrite) => (
            <ScriptRewrite key={rewrite.type} original={script} improved={rewrite.script} type={rewrite.type} />
          ))}
        </>
      ) : null}
    </div>
  );
}
