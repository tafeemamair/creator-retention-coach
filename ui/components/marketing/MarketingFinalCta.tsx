import Link from "next/link";
import { Button } from "../ui/Button";

export function MarketingFinalCta() {
  return (
    <section className="py-16 sm:py-20 px-4 sm:px-6 border-t border-slate-900 bg-gradient-to-b from-slate-950 to-indigo-950/30 text-center">
      <div className="max-w-3xl mx-auto space-y-6">
        <h2 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
          Ready to make your next script{" "}
          <span className="bg-gradient-to-r from-indigo-400 via-violet-300 to-indigo-300 bg-clip-text text-transparent">
            impossible to scroll past?
          </span>
        </h2>
        <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto leading-relaxed">
          Paste your text, discover your drop-off moments, and get 3 high-retention rewrites in under 10 seconds.
        </p>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/auth/login?next=/app/analyze" className="w-full sm:w-auto">
            <Button size="lg" variant="primary" className="w-full sm:w-auto px-8">
              Audit Your Script Free (1 Free Report) →
            </Button>
          </Link>
        </div>
        <p className="text-xs text-slate-500 font-medium">
          Instant analysis • No credit card required • Private creator workspace
        </p>
      </div>
    </section>
  );
}
