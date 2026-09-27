"use client";

import { useState } from "react";
import { Button } from "../ui/Button";

export interface PublicationOutcomeData {
  published_at?: string | null;
  published_url?: string | null;
  actual_views?: number | null;
  actual_retention_percent?: number | null;
  actual_watch_time_seconds?: number | null;
}

interface PublicationOutcomeSectionProps {
  analysisId: string;
  predictedScore: number;
  initialOutcome?: PublicationOutcomeData | null;
}

export function PublicationOutcomeSection({
  analysisId,
  predictedScore,
  initialOutcome,
}: PublicationOutcomeSectionProps) {
  const [publishedAt, setPublishedAt] = useState<string>(
    initialOutcome?.published_at ? initialOutcome.published_at.substring(0, 10) : ""
  );
  const [publishedUrl, setPublishedUrl] = useState<string>(
    initialOutcome?.published_url || ""
  );
  const [actualViews, setActualViews] = useState<string>(
    initialOutcome?.actual_views !== null && initialOutcome?.actual_views !== undefined
      ? String(initialOutcome.actual_views)
      : ""
  );
  const [actualRetention, setActualRetention] = useState<string>(
    initialOutcome?.actual_retention_percent !== null && initialOutcome?.actual_retention_percent !== undefined
      ? String(initialOutcome.actual_retention_percent)
      : ""
  );
  const [actualWatchTime, setActualWatchTime] = useState<string>(
    initialOutcome?.actual_watch_time_seconds !== null && initialOutcome?.actual_watch_time_seconds !== undefined
      ? String(initialOutcome.actual_watch_time_seconds)
      : ""
  );

  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isEditing, setIsEditing] = useState(
    !initialOutcome ||
      (!initialOutcome.published_at &&
        !initialOutcome.published_url &&
        initialOutcome.actual_views === null &&
        initialOutcome.actual_retention_percent === null)
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMessage("");
    setErrorMessage("");

    try {
      const payload: Record<string, any> = {
        published_at: publishedAt ? new Date(publishedAt).toISOString() : null,
        published_url: publishedUrl.trim() || null,
        actual_views: actualViews !== "" && !isNaN(Number(actualViews)) ? Math.max(0, parseInt(actualViews, 10)) : null,
        actual_retention_percent: actualRetention !== "" && !isNaN(Number(actualRetention)) ? Math.min(100, Math.max(0, parseFloat(actualRetention))) : null,
        actual_watch_time_seconds: actualWatchTime !== "" && !isNaN(Number(actualWatchTime)) ? Math.max(0, parseFloat(actualWatchTime)) : null,
      };

      const res = await fetch(`/api/analyses/${analysisId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save publication outcome.");
      }

      setSuccessMessage("Publication outcome saved successfully.");
      setIsEditing(false);
      setTimeout(() => setSuccessMessage(""), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to save outcome.");
    } finally {
      setSaving(false);
    }
  };

  const hasRecordedOutcome = Boolean(
    publishedAt || publishedUrl || actualViews !== "" || actualRetention !== "" || actualWatchTime !== ""
  );

  const parsedRetention = actualRetention !== "" && !isNaN(Number(actualRetention)) ? parseFloat(actualRetention) : null;
  const parsedViews = actualViews !== "" && !isNaN(Number(actualViews)) ? parseInt(actualViews, 10) : null;
  const parsedWatchTime = actualWatchTime !== "" && !isNaN(Number(actualWatchTime)) ? parseFloat(actualWatchTime) : null;

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 sm:p-6 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-semibold text-indigo-400 mb-1.5">
            <span>Feedback Loop (Level 1)</span>
          </div>
          <h3 className="text-base font-bold text-white tracking-tight">
            Manual Publication & Performance Outcome
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Record real-world performance metrics after publishing to establish factual ground truth.
          </p>
        </div>

        {hasRecordedOutcome && !isEditing && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(true)}
            className="text-xs shrink-0"
          >
            Edit Outcome ✏️
          </Button>
        )}
      </div>

      {successMessage && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <span>✓</span>
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2">
          <span>⚠️</span>
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Outcome Summary: Pre-filming Score & Creator-Reported Outcomes Displayed Separately */}
      {hasRecordedOutcome && !isEditing ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Pre-Filming Diagnostic Score */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Pre-Filming CRC Score
              </span>
              <div className="text-2xl font-black text-white mt-1">
                {predictedScore}<span className="text-xs text-slate-500 font-medium"> / 100</span>
              </div>
              <p className="text-[10px] text-slate-500">Diagnostic retention index</p>
            </div>

            {/* Reported Actual Retention */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Reported Actual Retention
              </span>
              <div className="text-2xl font-black text-indigo-400 mt-1">
                {parsedRetention !== null ? `${parsedRetention}%` : "Not recorded"}
              </div>
              <p className="text-[10px] text-slate-500">Creator-reported retention rate</p>
            </div>

            {/* Reported Views */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Reported Actual Views
              </span>
              <div className="text-2xl font-black text-white mt-1">
                {parsedViews !== null ? parsedViews.toLocaleString() : "Not recorded"}
              </div>
              <p className="text-[10px] text-slate-500">Creator-reported view count</p>
            </div>

            {/* Reported Watch Time */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Reported Watch Time
              </span>
              <div className="text-2xl font-black text-white mt-1">
                {parsedWatchTime !== null ? `${parsedWatchTime}s` : "Not recorded"}
              </div>
              <p className="text-[10px] text-slate-500">Creator-reported average watch time</p>
            </div>
          </div>

          {/* Publication Metadata Card */}
          {(publishedAt || publishedUrl) && (
            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3 text-slate-300">
                {publishedAt && (
                  <span>
                    📅 Published: <strong className="text-white">{publishedAt}</strong>
                  </span>
                )}
                {publishedUrl && (
                  <span>
                    🔗 <a href={publishedUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">View Published Video</a>
                  </span>
                )}
              </div>
              <span className="text-[11px] text-slate-500 italic">
                Manual creator entry (factual ground truth)
              </span>
            </div>
          )}
        </div>
      ) : (
        /* Edit / Entry Form */
        <form onSubmit={handleSave} className="space-y-4 pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label htmlFor="outcome-published-at" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Publishing Date (Optional)
              </label>
              <input
                id="outcome-published-at"
                type="date"
                value={publishedAt}
                onChange={(e) => setPublishedAt(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="outcome-published-url" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Published Video URL (Optional)
              </label>
              <input
                id="outcome-published-url"
                type="url"
                placeholder="https://youtube.com/shorts/... or tiktok.com/..."
                value={publishedUrl}
                onChange={(e) => setPublishedUrl(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition placeholder:text-slate-600"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="outcome-actual-views" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Actual View Count (Optional)
              </label>
              <input
                id="outcome-actual-views"
                type="number"
                min="0"
                placeholder="e.g. 15400"
                value={actualViews}
                onChange={(e) => setActualViews(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition placeholder:text-slate-600"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="outcome-actual-retention" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Actual Retention Rate % (Optional)
              </label>
              <input
                id="outcome-actual-retention"
                type="number"
                min="0"
                max="100"
                step="0.1"
                placeholder="e.g. 72.5"
                value={actualRetention}
                onChange={(e) => setActualRetention(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition placeholder:text-slate-600"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="outcome-actual-watch-time" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Avg Watch Time in Seconds (Optional)
              </label>
              <input
                id="outcome-actual-watch-time"
                type="number"
                min="0"
                step="0.1"
                placeholder="e.g. 24.3"
                value={actualWatchTime}
                onChange={(e) => setActualWatchTime(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition placeholder:text-slate-600"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <p className="text-[11px] text-slate-500">
              Manual creator entry. 0 credits consumed • 0 AI calls.
            </p>
            <div className="flex items-center gap-2">
              {hasRecordedOutcome && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
              )}
              <Button
                type="submit"
                variant="primary"
                size="sm"
                loading={saving}
                className="text-xs"
              >
                Save Outcome Data
              </Button>
            </div>
          </div>
        </form>
      )}
    </section>
  );
}
