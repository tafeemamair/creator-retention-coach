"use client";

import { useState } from "react";

export interface CopyButtonProps {
  text: string;
  label?: string;
  copiedLabel?: string;
  className?: string;
  size?: "sm" | "md";
}

export function CopyButton({
  text,
  label = "Copy Script",
  copiedLabel = "Copied!",
  className = "",
  size = "sm",
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.left = "-999999px";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        textarea.remove();
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text:", err);
    }
  };

  const sizeClasses =
    size === "sm"
      ? "text-xs px-2.5 py-1.5 min-h-[32px] gap-1.5"
      : "text-xs sm:text-sm px-3.5 py-2 min-h-[40px] gap-2";

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={copied ? copiedLabel : label}
      className={`inline-flex items-center justify-center font-medium rounded-lg border transition-all duration-150 cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 active:scale-95 ${
        copied
          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
          : "bg-slate-900/80 border-slate-750 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-700/80"
      } ${sizeClasses} ${className}`}
    >
      {copied ? (
        <>
          <svg
            className="w-3.5 h-3.5 text-emerald-400 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span className="font-semibold text-emerald-400">{copiedLabel}</span>
        </>
      ) : (
        <>
          <svg
            className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-200 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
          <span>{label}</span>
        </>
      )}
    </button>
  );
}
