"use client";

import { ReactNode } from "react";

type PreviewGateProps = {
  isUnlocked: boolean;
  title?: string;
  children: ReactNode;
};

export default function PreviewGate({ isUnlocked, title = "Unlock full analysis for ₹49", children }: PreviewGateProps) {
  return (
    <div className="relative">
      {children}
      {!isUnlocked ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl border border-slate-300/80 bg-white/65 backdrop-blur-sm">
          <div className="rounded-lg bg-slate-900/90 px-4 py-3 text-center text-sm text-white shadow-lg">
            <p className="font-semibold">{title}</p>
            <p className="mt-1 text-xs text-slate-200">Complete payment to view this section.</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
