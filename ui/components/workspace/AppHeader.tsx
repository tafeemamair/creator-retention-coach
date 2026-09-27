"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";

interface AppHeaderProps {
  userEmail?: string;
  displayName?: string;
  avatarUrl?: string;
  creditsRemaining: number;
  freeRemaining: number;
}

export default function AppHeader({
  userEmail = "creator@example.com",
  displayName,
  avatarUrl,
  creditsRemaining: initialCredits,
  freeRemaining: initialFree,
}: AppHeaderProps) {
  const [creditsRemaining, setCreditsRemaining] = useState<number>(initialCredits);
  const [freeRemaining, setFreeRemaining] = useState<number>(initialFree);
  const name = displayName || userEmail.split("@")[0] || "Creator";

  // Sync state when props change on server navigation/refresh
  useEffect(() => {
    setCreditsRemaining(initialCredits);
    setFreeRemaining(initialFree);
  }, [initialCredits, initialFree]);

  // Listen for real-time credit balance updates within the workspace session
  useEffect(() => {
    const handleCreditUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ creditsRemaining?: number; freeRemaining?: number }>;
      if (customEvent.detail) {
        if (typeof customEvent.detail.creditsRemaining === "number") {
          setCreditsRemaining(customEvent.detail.creditsRemaining);
        }
        if (typeof customEvent.detail.freeRemaining === "number") {
          setFreeRemaining(customEvent.detail.freeRemaining);
        }
      }
    };

    window.addEventListener("crc_credit_update", handleCreditUpdate);
    return () => {
      window.removeEventListener("crc_credit_update", handleCreditUpdate);
    };
  }, []);

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md px-8 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-3">
        <Link
          href="/app"
          className="text-base font-semibold text-white tracking-tight hover:text-indigo-300 transition-colors"
        >
          Creator Studio
        </Link>
      </div>

      <div className="flex items-center gap-4">
        {/* Credit Balance Badge */}
        <Link
          href={creditsRemaining > 0 || freeRemaining > 0 ? "/app/analyze" : "/app/analyze?plan=pack5&checkout=true"}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-xs font-medium text-slate-200 hover:border-indigo-500/50 transition-all"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>
            {creditsRemaining > 0 ? (
              <span>
                <strong className="text-white font-bold">{creditsRemaining}</strong> {creditsRemaining === 1 ? "credit" : "credits"} remaining
              </span>
            ) : freeRemaining > 0 ? (
              <span className="text-indigo-300 font-semibold">1 Free Analysis Available</span>
            ) : (
              <span className="text-amber-400 font-semibold">0 credits (Get Pack)</span>
            )}
          </span>
        </Link>

        {/* User Profile Pill */}
        <Link
          href="/app/profile"
          className="flex items-center gap-2.5 pl-2 pr-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 hover:border-slate-600 transition-colors"
        >
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={name}
              width={24}
              height={24}
              className="w-6 h-6 rounded-full object-cover"
              unoptimized
            />
          ) : (
            <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold">
              {name.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="text-xs font-medium text-slate-300 max-w-[120px] truncate">{name}</span>
        </Link>
      </div>
    </header>
  );
}
