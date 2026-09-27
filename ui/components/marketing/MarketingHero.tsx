import Link from "next/link";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";

export function MarketingHero() {
  return (
    <section className="relative px-4 sm:px-6 pt-12 pb-10 sm:pt-20 sm:pb-16 text-center overflow-hidden">
      {/* Subtle radial ambient glow */}
      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-indigo-950/40 via-slate-950 to-slate-950 -z-10 pointer-events-none"
        aria-hidden="true"
      />

      <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
        {/* Positioning Pill */}
        <div className="inline-flex items-center">
          <Badge variant="indigo" size="md" dot>
            Retention Intelligence for Short-Form Video Creators
          </Badge>
        </div>

        {/* Primary Headline */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.12]">
          Make your scripts{" "}
          <span className="bg-gradient-to-r from-indigo-400 via-violet-300 to-indigo-300 bg-clip-text text-transparent">
            harder to scroll past.
          </span>
        </h1>

        {/* Supporting Subhead */}
        <p className="text-base sm:text-lg lg:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
          Spot weak opening lines, predict the exact second viewers swipe away, and receive 3 retention-engineered rewrites before you hit record.
        </p>

        {/* Action CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link href="/auth/login?next=/app/analyze" className="w-full sm:w-auto">
            <Button
              size="lg"
              variant="primary"
              className="w-full sm:w-auto px-8"
              rightIcon={<span aria-hidden="true">→</span>}
            >
              Audit Your Script (1 Free Report)
            </Button>
          </Link>

          <a href="#demo" className="w-full sm:w-auto">
            <Button size="lg" variant="outline" className="w-full sm:w-auto px-6">
              See Live Analysis Demo ↓
            </Button>
          </a>
        </div>

        <p className="text-xs text-slate-400 font-medium">
          Instant diagnosis • Authenticated creator workspace • No credit card required
        </p>

        {/* 3 Value Pillars Strip */}
        <div className="pt-8 sm:pt-10 border-t border-slate-900 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto text-left">
          <div className="p-4 rounded-xl border border-slate-800/80 bg-slate-900/30">
            <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
              <span>01</span>
              <span className="text-white">5-Signal Diagnosis</span>
            </div>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Algorithmic scoring across Hook (30%), Pacing (25%), Emotion (20%), Value (15%), and CTA (10%).
            </p>
          </div>

          <div className="p-4 rounded-xl border border-slate-800/80 bg-slate-900/30">
            <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
              <span>02</span>
              <span className="text-white">Drop-Off Timeline</span>
            </div>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Predicts the exact second viewers lose interest and highlights high-risk sentences.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-slate-800/80 bg-slate-900/30">
            <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
              <span>03</span>
              <span className="text-white">3 Script Rewrites</span>
            </div>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Curiosity Hook, Fast-Paced Retention, and Emotional Storytelling ready to copy and film.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
