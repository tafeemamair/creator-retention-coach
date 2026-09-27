import Link from "next/link";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Card } from "../ui/Card";

export function PricingSection() {
  return (
    <section id="pricing" className="py-12 sm:py-16 px-4 sm:px-6 border-t border-slate-900 bg-slate-950/80">
      <div className="max-w-5xl mx-auto space-y-8 sm:space-y-10">
        {/* Section Header */}
        <div className="text-center space-y-2.5 max-w-2xl mx-auto">
          <Badge variant="emerald" size="md">
            Simple Pay-As-You-Go Pricing
          </Badge>
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
            Transparent credit packs. No subscriptions.
          </h2>
          <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
            Start with 1 complete full diagnostic report for free. Purchase credits only when you need to analyze new scripts for your filming pipeline.
          </p>
        </div>

        {/* 1 Free Full Analysis Banner */}
        <div className="rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950/40 via-slate-900/60 to-slate-950 p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
          <div className="space-y-1 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                Complimentary Welcome Report
              </span>
            </div>
            <h3 className="text-lg font-bold text-white">
              1 Full Analysis Report • ₹0 Free
            </h3>
            <p className="text-xs text-slate-400">
              Sign in with Google or Magic Link to receive your complete 5-signal report, drop-off timeline, and 3 rewrites.
            </p>
          </div>
          <Link href="/auth/login?next=/app/analyze" className="w-full sm:w-auto shrink-0">
            <Button variant="primary" size="md" className="w-full sm:w-auto px-6">
              Claim Free Analysis →
            </Button>
          </Link>
        </div>

        {/* Paid Tier Cards */}
        <div className="grid sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* Single Report */}
          <Card variant="default" className="p-6 sm:p-7 space-y-6 flex flex-col justify-between border-slate-800">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">Single Report</h3>
                <span className="text-xs font-mono px-2.5 py-1 rounded bg-slate-800 text-slate-300 font-semibold">
                  1 Report Credit
                </span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl sm:text-4xl font-extrabold text-white">₹49</span>
                <span className="text-xs text-slate-400 font-medium">one-time</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Perfect for auditing a critical script or testing CRC on an important upcoming video.
              </p>

              <ul className="space-y-2.5 text-xs text-slate-300 pt-3 border-t border-slate-800">
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">✓</span> 1 Full Retention Intelligence Report
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">✓</span> 5-Signal Breakdown & Score (0–100)
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">✓</span> Predicted Drop-Off Timeline Curve
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">✓</span> 3 Ready-to-Film Rewrites & Titles
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">✓</span> Same-script re-analysis is 100% free
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">✓</span> 30-Day Credit Validity
                </li>
              </ul>
            </div>

            <Link href="/auth/login?next=/app/analyze%3Fplan%3Dsingle%26checkout%3Dtrue" className="w-full">
              <Button variant="outline" size="md" className="w-full">
                Get Single Report
              </Button>
            </Link>
          </Card>

          {/* Creator Pack (5 Reports) */}
          <Card variant="highlight" className="p-6 sm:p-7 space-y-6 flex flex-col justify-between relative">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-white">Creator Pack</h3>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Most Popular
                  </span>
                </div>
                <span className="text-xs font-mono px-2.5 py-1 rounded bg-indigo-500/20 text-indigo-200 font-semibold border border-indigo-500/30">
                  5 Report Credits
                </span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl sm:text-4xl font-extrabold text-white">₹149</span>
                <span className="text-xs text-slate-400 font-medium">one-time (₹29.80 / report)</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Best value for active creators publishing 2–5 shorts every week across YouTube, TikTok, or Reels.
              </p>

              <ul className="space-y-2.5 text-xs text-slate-200 pt-3 border-t border-slate-800/80">
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">✓</span> 5 Full Retention Intelligence Reports
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">✓</span> Save 40% vs. Single Report pricing
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">✓</span> YouTube Shorts, TikTok & Reels Profiles
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">✓</span> 3 Rewrites + Viral Titles for every script
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">✓</span> Saved to your private account history
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">✓</span> Extended 90-Day Credit Validity
                </li>
              </ul>
            </div>

            <Link href="/auth/login?next=/app/analyze%3Fplan%3Dpack5%26checkout%3Dtrue" className="w-full">
              <Button variant="primary" size="md" className="w-full">
                Get Creator Pack (₹149)
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    </section>
  );
}
