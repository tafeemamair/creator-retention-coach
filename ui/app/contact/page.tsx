import type { Metadata } from "next";
import Link from "next/link";
import { PublicNavbar } from "@/components/marketing/PublicNavbar";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";

export const metadata: Metadata = {
  title: "Contact Creator Retention Coach",
  description:
    "Contact Creator Retention Coach for questions about script analysis, payments, privacy, or the service.",
  alternates: {
    canonical: "/contact",
  },
};

export default function Contact() {
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
            Contact Us
          </h1>
          <div className="space-y-6 text-sm text-slate-300 leading-relaxed">
            <p>
              If you have any questions, payment issues, or support requests,
              please contact us at:
            </p>
            <p>
              <strong>Email:</strong>{" "}
              <a href="mailto:support@creatorretentioncoach.in" className="text-indigo-400 hover:underline">
                support@creatorretentioncoach.in
              </a>
            </p>
          </div>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
