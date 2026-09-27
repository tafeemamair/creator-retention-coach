import React from "react";

export interface ScoreBadgeProps {
  score: number;
  maxScore?: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export function ScoreBadge({
  score,
  maxScore = 100,
  size = "md",
  showLabel = false,
}: ScoreBadgeProps) {
  const rounded = Math.round(score);

  const getTier = (s: number) => {
    if (s >= 75) {
      return {
        variant: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
        label: "Strong",
        dot: "bg-emerald-400",
      };
    }
    if (s >= 50) {
      return {
        variant: "bg-amber-500/10 text-amber-300 border-amber-500/30",
        label: "Moderate Risk",
        dot: "bg-amber-400",
      };
    }
    return {
      variant: "bg-rose-500/10 text-rose-300 border-rose-500/30",
      label: "High Drop-off Risk",
      dot: "bg-rose-400",
    };
  };

  const tier = getTier(rounded);

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-3 py-1",
    lg: "text-base sm:text-lg px-4 py-1.5 font-bold",
  };

  return (
    <div className="inline-flex items-center gap-2">
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border font-bold font-mono ${tier.variant} ${sizeClasses[size]}`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${tier.dot}`} />
        <span>{rounded}</span>
        <span className="text-[10px] opacity-70 font-sans">/{maxScore}</span>
      </span>
      {showLabel && (
        <span className="text-xs text-slate-400 font-medium">{tier.label}</span>
      )}
    </div>
  );
}
