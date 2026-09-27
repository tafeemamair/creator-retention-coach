import type { Metadata } from "next";
import Link from "next/link";
import { PublicNavbar } from "@/components/marketing/PublicNavbar";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";

export const metadata: Metadata = {
  title: "Privacy Policy — Creator Retention Coach",
  description:
    "Learn how Creator Retention Coach handles scripts, payments, third-party services, and privacy.",
  alternates: {
    canonical: "/privacy",
  },
};

export default function Privacy() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100 antialiased selection:bg-indigo-500 selection:text-white">
      <PublicNavbar />
      <main className="flex-1 px-4 py-12 sm:py-16">
        <div className="mx-auto max-w-3xl rounded-2xl border border-slate-800 bg-slate-900/40 p-6 sm:p-8 shadow-xl">
          <div className="mb-6">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
            >
              <span>←</span> Back to Home
            </Link>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-6 border-b border-slate-800 pb-4">
            Privacy Policy
          </h1>
          <div className="space-y-6 text-sm text-slate-300 leading-relaxed">
            <p>
              Creator Retention Coach respects your privacy. We collect only the data
              required to provide the analysis service.
            </p>

            <h2 className="text-lg font-semibold text-white mt-6">Script Data & Workspace Storage</h2>
            <p>
              When you analyze a video script in your authenticated creator workspace, your script, generated retention metrics, predicted drop-off timeline, and rewrites are stored securely in your private account history so you can review them at any time.
            </p>
            <p>
              Your scripts and analysis results are strictly isolated to your account using database row-level security. We do not sell your scripts or share them with other creators.
            </p>

            <h2 className="text-lg font-semibold text-white mt-6">Payments</h2>
            <p>
              Payments are handled securely by Razorpay. We do not store credit card, debit card, net banking, or UPI credentials on our servers.
            </p>

            <h2 className="text-lg font-semibold text-white mt-6">Third-Party Services & Infrastructure</h2>
            <p>
              We use third-party APIs strictly to operate the service: OpenAI for AI retention analysis and rewrite generation, and Supabase for secure authentication and database hosting.
            </p>

            <h2 className="text-lg font-semibold text-white mt-6">Contact</h2>
            <p>
              Questions? Email: <a href="mailto:support@creatorretentioncoach.in" className="text-blue-400 hover:underline">support@creatorretentioncoach.in</a>
            </p>
          </div>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
