"use client";

import { useMemo } from "react";

type ScriptDiffProps = {
  original: string;
  improved: string;
  mode?: "rewritten" | "diff";
};

function tokenize(line: string): string[] {
  return line.split(/(\s+|[.,!?;:()"'])/).filter(Boolean);
}

function computeDiff(original: string, improved: string) {
  const originalSet = new Set(tokenize(original.toLowerCase()).filter((token) => /\w/.test(token)));
  const improvedTokens = tokenize(improved);

  const additions = improvedTokens.map((token, idx) => ({
    token,
    key: `${token}-${idx}`,
    isAdded: /\w/.test(token) && !originalSet.has(token.toLowerCase()),
  }));

  const improvedSet = new Set(tokenize(improved.toLowerCase()).filter((token) => /\w/.test(token)));
  const removals = tokenize(original).map((token, idx) => ({
    token,
    key: `${token}-${idx}`,
    isRemoved: /\w/.test(token) && !improvedSet.has(token.toLowerCase()),
  }));

  return { additions, removals };
}

export default function ScriptDiff({ original, improved, mode = "rewritten" }: ScriptDiffProps) {
  const diff = useMemo(() => computeDiff(original, improved), [original, improved]);

  if (mode === "rewritten") {
    return (
      <pre className="whitespace-pre-wrap rounded-xl bg-slate-950/80 border border-slate-800 p-4 text-xs sm:text-sm text-slate-100 font-sans leading-relaxed min-h-[120px]">
        {improved}
      </pre>
    );
  }

  return (
    <div className="space-y-3 rounded-xl bg-slate-950/80 border border-slate-800 p-4 text-xs sm:text-sm font-sans min-h-[120px]">
      <div className="space-y-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
          + Additions & Enhancements:
        </span>
        <div className="whitespace-pre-wrap text-slate-200 leading-relaxed">
          {diff.additions.map((item) => (
            <span
              key={item.key}
              className={item.isAdded ? "rounded bg-emerald-950/90 text-emerald-300 font-semibold px-1 py-0.5 border border-emerald-500/20" : ""}
            >
              {item.token}
            </span>
          ))}
        </div>
      </div>

      {diff.removals.some((r) => r.isRemoved) && (
        <div className="space-y-1 pt-2 border-t border-slate-800">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">
            − Cut Fluff / Weak Openers:
          </span>
          <div className="whitespace-pre-wrap text-slate-400 leading-relaxed">
            {diff.removals.map((item) => (
              <span
                key={item.key}
                className={item.isRemoved ? "rounded bg-rose-950/80 text-rose-400 line-through px-1 py-0.5 border border-rose-500/20" : ""}
              >
                {item.token}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
