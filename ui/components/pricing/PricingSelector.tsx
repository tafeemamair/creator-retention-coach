"use client";

export type PricingPlan = "single" | "pack5";

interface PricingSelectorProps {
  selectedPlan: PricingPlan;
  setSelectedPlan: (plan: PricingPlan) => void;
  onUnlock: () => void;
  disabled?: boolean;
  loading?: boolean;
  creditsRemaining?: number | null;
  totalCredits?: number | null;
  currentPlan?: PricingPlan | null;
  title?: string;
  subtitle?: string;
}

export default function PricingSelector({
  selectedPlan,
  setSelectedPlan,
  onUnlock,
  disabled = false,
  loading = false,
  creditsRemaining = null,
  totalCredits = null,
  currentPlan = null,
  title = "Unlock Full Diagnostics & AI Rewrites",
  subtitle = "Get the complete pre-production audit: 5-signal breakdown, predicted retention curve, line-by-line risk flags, and 3 targeted script rewrites.",
}: PricingSelectorProps) {
  const hasActiveCredits = creditsRemaining !== null && creditsRemaining > 0;

  return (
    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.02] p-6 space-y-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 h-24 w-24 bg-amber-500/10 rounded-full blur-2xl -z-10" />

      <div className="space-y-2">
        <div className="inline-flex items-center space-x-2 text-xs font-semibold text-amber-300">
          <span>{hasActiveCredits ? "⚡ ACTIVE REPORT CREDITS AVAILABLE" : "🔒 FULL REPORT READY TO UNLOCK"}</span>
        </div>
        <h4 className="text-xl font-extrabold text-white">{title}</h4>
        <p className="text-xs text-slate-400 leading-relaxed">{subtitle}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 text-xs text-slate-300">
        <div className="flex items-center space-x-2.5">
          <span className="text-amber-400 text-sm">⚡</span>
          <span>3 Script Rewrites (Curiosity, Fast, Story)</span>
        </div>
        <div className="flex items-center space-x-2.5">
          <span className="text-amber-400 text-sm">📈</span>
          <span>Predicted Retention Curve Graph</span>
        </div>
        <div className="flex items-center space-x-2.5">
          <span className="text-amber-400 text-sm">🔍</span>
          <span>Line-Level Swipe Risk Audits & Fixes</span>
        </div>
        <div className="flex items-center space-x-2.5">
          <span className="text-amber-400 text-sm">💡</span>
          <span>3 Alternative Hook Titles</span>
        </div>
      </div>

      {hasActiveCredits ? (
        /* Active Credit Unlock Card */
        <div className="border-t border-slate-900 pt-5 space-y-4">
          <div className="flex items-center justify-between bg-emerald-950/40 border border-emerald-500/30 rounded-xl px-4 py-3 text-xs text-emerald-300">
            <div className="flex items-center space-x-2">
              <span className="text-emerald-400">⚡</span>
              <span>
                <strong className="text-white font-bold">{creditsRemaining} of {totalCredits ?? creditsRemaining}</strong> report credits remaining • Plan:{" "}
                <span className="font-semibold text-emerald-200 uppercase">
                  {currentPlan === "pack5" ? "Creator Pack (90-day validity)" : "Single Report (30-day validity)"}
                </span>
              </span>
            </div>
            <span className="text-xs uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
              Active
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <span className="text-base font-bold text-white block">Full Report Diagnostic</span>
              <span className="text-xs text-slate-400">Unlocks graphs, title variations, and line warnings using 1 credit</span>
            </div>
            <button
              id="unlock-report-button"
              onClick={onUnlock}
              disabled={disabled || loading}
              className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold px-6 py-3 shadow-lg shadow-emerald-500/10 transition duration-200 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>⚡ Analyze Full Report (Uses 1 Credit)</span>
            </button>
          </div>
        </div>
      ) : (
        /* Pay-as-you-go Plan Selection */
        <>
          {creditsRemaining === 0 ? (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300 font-medium">
              ⚡ You have used all available report credits from your previous plan. Choose an option below to continue.
            </div>
          ) : null}

          <div className="space-y-3 pt-2">
            <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">Select a Plan (One-Time Payment)</p>
            <div
              role="radiogroup"
              aria-label="Pricing plan options"
              className="grid gap-3 sm:grid-cols-3"
            >
              {/* Option 1: Single Report (₹49) */}
              <div
                id="plan-single-card"
                role="radio"
                aria-checked={selectedPlan === "single"}
                tabIndex={0}
                onClick={() => setSelectedPlan("single")}
                onKeyDown={(e) => {
                  if (e.key === " " || e.key === "Enter") {
                    e.preventDefault();
                    setSelectedPlan("single");
                  }
                }}
                className={`relative rounded-xl p-4 border transition cursor-pointer flex flex-col justify-between focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none ${
                  selectedPlan === "single"
                    ? "border-amber-500 bg-amber-500/10 shadow-lg shadow-amber-500/5 ring-1 ring-amber-500/40"
                    : "border-slate-800 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/60"
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200">Single Report</span>
                    <input
                      type="radio"
                      id="plan-single-radio"
                      name="pricingPlan"
                      value="single"
                      checked={selectedPlan === "single"}
                      onChange={() => setSelectedPlan("single")}
                      tabIndex={-1}
                      className="accent-amber-500 h-3.5 w-3.5 cursor-pointer"
                    />
                  </div>
                  <div>
                    <span className="text-2xl font-black text-white">₹49</span>
                    <span className="text-xs text-slate-400 block uppercase font-semibold">30-day validity</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-snug">1 full analysis + 3 AI rewrites</p>
                </div>
              </div>

              {/* Option 2: Creator Pack (₹149) - BEST VALUE */}
              <div
                id="plan-pack5-card"
                role="radio"
                aria-checked={selectedPlan === "pack5"}
                tabIndex={0}
                onClick={() => setSelectedPlan("pack5")}
                onKeyDown={(e) => {
                  if (e.key === " " || e.key === "Enter") {
                    e.preventDefault();
                    setSelectedPlan("pack5");
                  }
                }}
                className={`relative rounded-xl p-4 border transition cursor-pointer flex flex-col justify-between focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none ${
                  selectedPlan === "pack5"
                    ? "border-amber-400 bg-amber-400/10 shadow-lg shadow-amber-500/10 ring-1 ring-amber-400/40"
                    : "border-slate-800 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/60"
                }`}
              >
                <div className="absolute -top-2.5 right-3">
                  <span className="rounded-full bg-gradient-to-r from-amber-400 to-amber-500 px-2.5 py-0.5 text-xs font-black uppercase tracking-wider text-slate-950 shadow">
                    Best Value
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200">Creator Pack</span>
                    <input
                      type="radio"
                      id="plan-pack5-radio"
                      name="pricingPlan"
                      value="pack5"
                      checked={selectedPlan === "pack5"}
                      onChange={() => setSelectedPlan("pack5")}
                      tabIndex={-1}
                      className="accent-amber-500 h-3.5 w-3.5 cursor-pointer"
                    />
                  </div>
                  <div>
                    <span className="text-2xl font-black text-white">₹149</span>
                    <span className="text-xs text-amber-400/90 block uppercase font-semibold">90-day validity</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-snug">5 full reports (₹29.8/report)</p>
                </div>
              </div>

              {/* Option 3: Pro Creator - COMING SOON */}
              <div
                id="plan-pro-card"
                className="relative rounded-xl p-4 border border-slate-800/80 bg-slate-950/40 opacity-50 cursor-not-allowed flex flex-col justify-between select-none"
                aria-disabled="true"
              >
                <div className="absolute -top-2.5 right-3">
                  <span className="rounded-full bg-slate-800 border border-slate-700 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                    Coming Soon
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400">Pro Creator</span>
                    <span className="text-xs text-slate-600">🔒</span>
                  </div>
                  <div>
                    <span className="text-sm font-bold text-slate-400 uppercase tracking-wider block">Coming Soon</span>
                    <span className="text-xs text-slate-600 block">Subscription Tier</span>
                  </div>
                  <p className="text-xs text-slate-500 leading-snug">Automated channel-wide audit suite</p>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-900 pt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <span className="text-2xl font-black text-white">
                {selectedPlan === "pack5" ? "₹149" : "₹49"}
              </span>
              <span className="text-xs text-slate-500 font-semibold block uppercase tracking-wider">
                {selectedPlan === "pack5" ? "Creator Pack (5 reports • 90-day validity)" : "Single Report (1 report • 30-day validity)"}
              </span>
            </div>
            <button
              id="unlock-report-button"
              onClick={onUnlock}
              disabled={disabled || loading}
              className="rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-6 py-3 shadow-lg shadow-amber-500/10 transition duration-200 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>Unlock {selectedPlan === "pack5" ? "Creator Pack (₹149)" : "Single Report (₹49)"}</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
