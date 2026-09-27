"use client";

import Link from "next/link";
import { Button } from "../ui/Button";

export function PublicNavbar() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
        {/* Wordmark & Brand */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white font-black text-sm shadow-md shadow-indigo-600/20 group-hover:scale-105 transition-transform">
            CRC
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-tight text-white group-hover:text-indigo-300 transition-colors">
              Creator Retention Coach
            </span>
            <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">
              Retention Intelligence
            </span>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-300">
          <a href="#demo" className="hover:text-white transition-colors">
            Interactive Demo
          </a>
          <a href="#signals" className="hover:text-white transition-colors">
            5 Signals
          </a>
          <a href="#pricing" className="hover:text-white transition-colors">
            Pricing
          </a>
          <a href="#trust" className="hover:text-white transition-colors">
            Privacy & Trust
          </a>
          <a href="#faq" className="hover:text-white transition-colors">
            FAQ
          </a>
        </nav>

        {/* Auth CTAs */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/auth/login?next=/app">
            <Button variant="ghost" size="sm" className="text-xs">
              Sign In
            </Button>
          </Link>
          <Link href="/auth/login?next=/app/analyze">
            <Button variant="primary" size="sm" className="text-xs">
              Audit Script Free
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
