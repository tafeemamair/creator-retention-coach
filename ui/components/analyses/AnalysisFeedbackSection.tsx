"use client";

import { useState, useEffect } from "react";
import { Button } from "../ui/Button";

interface AnalysisFeedbackSectionProps {
  analysisId?: string | null;
  isRevision?: boolean;
}

const USEFUL_COMPONENT_OPTIONS = [
  "Hook",
  "Drop-off prediction",
  "Rewrites",
  "Action plan",
  "Score",
];

export function AnalysisFeedbackSection({
  analysisId,
  isRevision = false,
}: AnalysisFeedbackSectionProps) {
  const [usefulness, setUsefulness] = useState<"yes" | "somewhat" | "no" | null>(null);
  const [revisionHelp, setRevisionHelp] = useState<"yes" | "somewhat" | "no" | null>(null);
  const [selectedComponents, setSelectedComponents] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  // Hydrate previous feedback if analysisId exists
  useEffect(() => {
    if (!analysisId) return;

    fetch(`/api/analyses/${analysisId}/feedback`)
      .then((res) => {
        if (res.ok) return res.json();
        return null;
      })
      .then((data) => {
        if (data?.feedback) {
          const fb = data.feedback;
          if (fb.usefulness) setUsefulness(fb.usefulness);
          if (fb.revision_help) setRevisionHelp(fb.revision_help);
          if (Array.isArray(fb.useful_components)) setSelectedComponents(fb.useful_components);
          if (fb.comment) setComment(fb.comment);
          setSubmitted(true);
        }
      })
      .catch((err) => {
        console.warn("Could not check existing feedback:", err);
      });
  }, [analysisId]);

  const toggleComponent = (comp: string) => {
    setSelectedComponents((prev) =>
      prev.includes(comp) ? prev.filter((c) => c !== comp) : [...prev, comp]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usefulness) return;
    if (!analysisId) {
      setSubmitted(true);
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch(`/api/analyses/${analysisId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usefulness,
          useful_components: selectedComponents.length > 0 ? selectedComponents : null,
          comment: comment.trim() || null,
          revision_help: isRevision ? revisionHelp : null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to submit feedback.");
      }

      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || "Failed to submit feedback.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      id="analysis-feedback-container"
      className="rounded-2xl border border-slate-800/80 bg-slate-900/30 p-5 sm:p-6 text-slate-200 space-y-4"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/60 pb-3">
        <h4 className="text-sm font-bold text-white tracking-tight">
          Help us refine retention diagnostics
        </h4>
        <span className="text-[11px] text-slate-400 font-medium">
          Quick 5-second creator feedback
        </span>
      </div>

      {submitted ? (
        <div className="py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold">
            <span className="text-base">✓</span>
            <span>Thanks — your feedback helps us improve CRC.</span>
          </div>
          <button
            type="button"
            onClick={() => setSubmitted(false)}
            className="text-slate-400 hover:text-slate-200 underline text-xs cursor-pointer text-left sm:text-right"
          >
            Update feedback
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Question 1: Was this analysis useful? */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300">
              Was this analysis useful?
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setUsefulness("yes")}
                className={`px-4 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer flex items-center gap-1.5 ${
                  usefulness === "yes"
                    ? "bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/30"
                    : "bg-slate-950 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700"
                }`}
              >
                <span>👍</span>
                <span>Yes</span>
              </button>
              <button
                type="button"
                onClick={() => setUsefulness("somewhat")}
                className={`px-4 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer flex items-center gap-1.5 ${
                  usefulness === "somewhat"
                    ? "bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/30"
                    : "bg-slate-950 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700"
                }`}
              >
                <span>😐</span>
                <span>Somewhat</span>
              </button>
              <button
                type="button"
                onClick={() => setUsefulness("no")}
                className={`px-4 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer flex items-center gap-1.5 ${
                  usefulness === "no"
                    ? "bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/30"
                    : "bg-slate-950 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700"
                }`}
              >
                <span>👎</span>
                <span>No</span>
              </button>
            </div>
          </div>

          {/* Question 2: Optional Revision Help (if revision) */}
          {isRevision && usefulness && (
            <div className="space-y-2 pt-2 border-t border-slate-800/60 animate-fadeIn">
              <label className="block text-xs font-semibold text-slate-300">
                Did CRC&apos;s suggestions help with this revision?
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setRevisionHelp("yes")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                    revisionHelp === "yes"
                      ? "bg-indigo-600 border-indigo-500 text-white"
                      : "bg-slate-950 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700"
                  }`}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => setRevisionHelp("somewhat")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                    revisionHelp === "somewhat"
                      ? "bg-indigo-600 border-indigo-500 text-white"
                      : "bg-slate-950 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700"
                  }`}
                >
                  Somewhat
                </button>
                <button
                  type="button"
                  onClick={() => setRevisionHelp("no")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                    revisionHelp === "no"
                      ? "bg-indigo-600 border-indigo-500 text-white"
                      : "bg-slate-950 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700"
                  }`}
                >
                  No
                </button>
              </div>
            </div>
          )}

          {/* Question 3: What was most useful? (revealed after rating) */}
          {usefulness && (
            <div className="space-y-2 pt-2 border-t border-slate-800/60 animate-fadeIn">
              <label className="block text-xs font-semibold text-slate-300">
                What was most useful? <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {USEFUL_COMPONENT_OPTIONS.map((opt) => {
                  const isSelected = selectedComponents.includes(opt);
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => toggleComponent(opt)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition cursor-pointer ${
                        isSelected
                          ? "bg-indigo-600/30 border-indigo-500 text-indigo-200"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                      }`}
                    >
                      {isSelected ? "✓ " : "+ "}
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Question 4: Anything we should improve? (revealed after rating) */}
          {usefulness && (
            <div className="space-y-2 pt-2 border-t border-slate-800/60 animate-fadeIn">
              <label htmlFor="feedback-comment" className="block text-xs font-semibold text-slate-300">
                Anything we should improve? <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <textarea
                id="feedback-comment"
                rows={2}
                maxLength={500}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Tell us in a sentence..."
                className="w-full rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs text-slate-200 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition leading-relaxed resize-none font-sans"
              />
              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] text-slate-400">
                  {comment.length}/500 characters
                </span>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  loading={submitting}
                  className="px-5 text-xs"
                >
                  Submit feedback
                </Button>
              </div>
            </div>
          )}
        </form>
      )}
    </div>
  );
}
