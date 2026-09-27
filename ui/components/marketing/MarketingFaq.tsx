"use client";

import { useState } from "react";
import { Badge } from "../ui/Badge";

export function MarketingFaq() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const faqs = [
    {
      q: "How does the free analysis work?",
      a: "When you sign in with your Google account or Email Magic Link, your account is automatically credited with 1 complimentary full analysis report (₹0). You receive complete access to the 5-signal score, drop-off prediction, predicted timeline, line-level risks, and 3 retention rewrites.",
    },
    {
      q: "What platforms are supported?",
      a: "Creator Retention Coach is calibrated for short-form vertical video across YouTube Shorts, TikTok, and Instagram Reels. Each platform uses custom weights tuned for their specific audience retention algorithms and opening hook thresholds.",
    },
    {
      q: "How does same-script re-analysis work?",
      a: "If you analyze a script and want to review or re-run it later without changing the text or platform, CRC checks your account ledger and provides the report with 0 credits deducted. Only modifying text or analyzing a new script consumes an available credit.",
    },
    {
      q: "Do credits expire?",
      a: "Single Report credits remain active for 30 days from purchase. Creator Pack (5 reports) credits remain active for 90 days. All reports generated are permanently saved to your private account history.",
    },
    {
      q: "Is this a monthly subscription?",
      a: "No. Creator Retention Coach uses a simple, transparent pay-as-you-go credit model. You are never billed automatically or locked into a recurring monthly charge.",
    },
  ];

  return (
    <section id="faq" className="py-12 sm:py-16 px-4 sm:px-6 border-t border-slate-900 bg-slate-950/70">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="text-center space-y-2.5">
          <Badge variant="indigo" size="md">
            Frequently Asked Questions
          </Badge>
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
            Everything you need to know
          </h2>
          <p className="text-sm text-slate-400">
            Clear answers about script evaluation, credit packs, and account features.
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div
                key={idx}
                className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden transition-colors"
              >
                <button
                  onClick={() => setOpenIdx(isOpen ? null : idx)}
                  className="w-full flex items-center justify-between p-4 sm:p-5 text-left text-xs sm:text-sm font-bold text-white hover:text-indigo-300 transition-colors cursor-pointer"
                  aria-expanded={isOpen}
                >
                  <span>{faq.q}</span>
                  <span className="text-base text-slate-400 shrink-0 ml-4 font-mono">
                    {isOpen ? "−" : "+"}
                  </span>
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 sm:px-5 sm:pb-5 pt-0 text-xs text-slate-400 leading-relaxed border-t border-slate-800/60 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
