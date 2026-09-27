"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface DeleteAnalysisButtonProps {
  analysisId: string;
  analysisTitle?: string;
  redirectOnSuccess?: boolean;
  variant?: "table" | "header";
}

export function DeleteAnalysisButton({
  analysisId,
  analysisTitle,
  redirectOnSuccess = false,
  variant = "table",
}: DeleteAnalysisButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const executeDelete = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analyses/${analysisId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete analysis.");
      }

      if (redirectOnSuccess) {
        router.push("/app/analyses");
      }
      router.refresh();
    } catch (err) {
      console.error("Delete analysis error:", err);
      setLoading(false);
      setConfirming(false);
    }
  };

  if (confirming) {
    return (
      <div className="inline-flex items-center gap-1.5 p-1 rounded-lg bg-slate-900 border border-rose-500/40 shadow-lg text-xs animate-fadeIn">
        <span className="text-[11px] font-medium text-rose-300 pl-1.5 pr-0.5">Delete?</span>
        <button
          type="button"
          onClick={executeDelete}
          disabled={loading}
          className="px-2 py-1 rounded-md bg-rose-600 hover:bg-rose-500 text-white font-semibold transition-colors disabled:opacity-50 cursor-pointer text-[11px] focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none"
        >
          {loading ? "..." : "Confirm"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={loading}
          className="px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors disabled:opacity-50 cursor-pointer text-[11px] focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:outline-none"
        >
          Cancel
        </button>
      </div>
    );
  }

  if (variant === "header") {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        disabled={loading}
        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 hover:bg-rose-500 hover:text-white focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none transition-all text-xs font-semibold disabled:opacity-50 cursor-pointer"
        title={analysisTitle ? `Delete "${analysisTitle}"` : "Delete Analysis"}
        aria-label={analysisTitle ? `Delete "${analysisTitle}"` : "Delete Analysis"}
      >
        <span>🗑️</span>
        <span>Delete Analysis</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      disabled={loading}
      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 hover:bg-rose-600 hover:text-white focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none transition-all text-xs font-medium disabled:opacity-50 cursor-pointer ml-2"
      title={analysisTitle ? `Delete "${analysisTitle}"` : "Delete"}
      aria-label={analysisTitle ? `Delete "${analysisTitle}"` : "Delete Analysis"}
    >
      <span>🗑️</span>
      <span>Delete</span>
    </button>
  );
}
