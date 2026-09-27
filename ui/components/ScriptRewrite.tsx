"use client";

import { useState } from "react";
import ScriptDiff from "./ScriptDiff";
import { CopyButton } from "./ui/CopyButton";

export default function ScriptRewrite({
  original,
  improved,
  type,
}: {
  original: string;
  improved: string;
  type: string;
}) {
  const [diffMode, setDiffMode] = useState<"rewritten" | "diff">("rewritten");

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 sm:p-6 shadow-lg space-y-4">
      {/* Rewrite Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
              ✨ {type}
            </span>
            <span className="text-xs text-slate-400 font-medium">Ready to Film</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setDiffMode(diffMode === "rewritten" ? "diff" : "rewritten")}
            className="px-3 py-1.5 rounded-lg border border-slate-700/80 bg-slate-950 text-xs font-semibold text-slate-300 hover:text-white transition cursor-pointer"
          >
            {diffMode === "rewritten" ? "Show Line Diff" : "Show Clean Script"}
          </button>
          <CopyButton text={improved} label="Copy Rewrite" size="sm" />
        </div>
      </div>

      {/* Script Diff / Clean View */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Original Script
          </p>
          <pre className="whitespace-pre-wrap rounded-xl bg-slate-950/80 border border-slate-800 p-4 text-xs sm:text-sm text-slate-300 font-sans leading-relaxed min-h-[120px]">
            {original}
          </pre>
        </div>

        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
            Retention-Engineered Script
          </p>
          <ScriptDiff original={original} improved={improved} mode={diffMode} />
        </div>
      </div>
    </div>
  );
}
