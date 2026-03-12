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
    return <pre className="whitespace-pre-wrap rounded-md bg-slate-50 p-3 text-sm text-slate-700">{improved}</pre>;
  }

  return (
    <div className="space-y-3 rounded-md bg-slate-50 p-3 text-sm">
      <div className="whitespace-pre-wrap text-slate-800">
        {diff.additions.map((item) => (
          <span key={item.key} className={item.isAdded ? "rounded bg-green-100 text-green-800" : ""}>
            {item.token}
          </span>
        ))}
      </div>
      <div className="whitespace-pre-wrap text-slate-600">
        {diff.removals.map((item) => (
          <span key={item.key} className={item.isRemoved ? "rounded bg-red-100 text-red-700 line-through" : ""}>
            {item.token}
          </span>
        ))}
      </div>
    </div>
  );
}
