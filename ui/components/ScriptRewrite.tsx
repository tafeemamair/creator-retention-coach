"use client";

function tokenSet(input: string): Set<string> {
  return new Set(input.toLowerCase().split(/\W+/).filter(Boolean));
}

function HighlightDiff({ original, improved }: { original: string; improved: string }) {
  const originalWords = tokenSet(original);

  return (
    <div className="space-y-2 text-sm leading-7">
      {improved.split(/\n+/).filter(Boolean).map((line, index) => {
        const isHook = index === 0;
        const containsNew = line
          .split(/\W+/)
          .filter(Boolean)
          .some((word) => !originalWords.has(word.toLowerCase()));
        return (
          <p key={`${line}-${index}`} className={`${containsNew ? "text-green-700" : ""} ${isHook ? "font-bold" : ""}`}>
            {line}
          </p>
        );
      })}

      {original
        .split(/\n+/)
        .filter(Boolean)
        .slice(0, 4)
        .map((line) =>
          tokenSet(line).size &&
          !line
            .split(/\W+/)
            .filter(Boolean)
            .some((word) => !tokenSet(improved).has(word.toLowerCase())) ? null : (
            <p key={`removed-${line}`} className="text-red-600 line-through">
              {line}
            </p>
          ),
        )}
    </div>
  );
}

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
          <div className="rounded-md bg-slate-50 p-3">
            <HighlightDiff original={original} improved={improved} />
          </div>
        </div>
      </div>
    </div>
  );
}
