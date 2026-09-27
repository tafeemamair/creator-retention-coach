import Link from "next/link";

export function MarketingFooter() {
  return (
    <footer className="border-t border-slate-900 bg-slate-950 py-10 px-4 sm:px-6 text-xs text-slate-500">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex flex-col items-center md:items-start gap-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-300">Creator Retention Coach</span>
            <span>•</span>
            <span>Retention Intelligence</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Engineered for YouTube Shorts, TikTok, and Instagram Reels creators.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-5 text-slate-400">
          <Link href="/privacy" className="hover:text-slate-200 transition-colors">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-slate-200 transition-colors">
            Terms of Service
          </Link>
          <Link href="/refunds" className="hover:text-slate-200 transition-colors">
            Refund Policy
          </Link>
          <Link href="/contact" className="hover:text-slate-200 transition-colors">
            Contact
          </Link>
          <Link href="/auth/login" className="hover:text-slate-200 transition-colors">
            Sign In
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto mt-6 pt-6 border-t border-slate-900/80 text-center text-[11px] text-slate-600">
        © {new Date().getFullYear()} Creator Retention Coach. All rights reserved. Not affiliated with Google, YouTube, Meta, or ByteDance.
      </div>
    </footer>
  );
}
