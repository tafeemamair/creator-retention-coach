import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "interactive" | "muted" | "highlight";
}

export function Card({
  children,
  variant = "default",
  className = "",
  ...props
}: CardProps) {
  const variantStyles = {
    default: "bg-slate-900/40 border-slate-800/80 shadow-md",
    interactive:
      "bg-slate-900/40 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/70 transition-all duration-150 shadow-md",
    muted: "bg-slate-950/60 border-slate-800/60 shadow-none",
    highlight: "bg-gradient-to-b from-indigo-950/30 to-slate-900/40 border-indigo-500/30 shadow-lg shadow-indigo-950/20",
  };

  return (
    <div
      className={`rounded-2xl border backdrop-blur-sm p-5 sm:p-6 ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
