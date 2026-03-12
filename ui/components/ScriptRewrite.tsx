"use client";

import ScriptDiff from "./ScriptDiff";

export default function ScriptRewrite({
  original,
  improved,
  type,
}: {
  original: string;
  improved: string;
  type: string;
}) {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <h3 className="mb-3 font-semibold">{type}</h3>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">Original Script</p>
          <pre className="whitespace-pre-wrap rounded-md bg-slate-50 p-3 text-sm text-slate-700">{original}</pre>
        </div>
        <div>
          <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">Improved Script</p>
          <ScriptDiff original={original} improved={improved} mode="rewritten" />
        </div>
      </div>
    </div>
  );
}
