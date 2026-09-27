import type { Metadata } from "next";
import Link from "next/link";
import { PublicNavbar } from "@/components/marketing/PublicNavbar";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";

export const metadata: Metadata = {
  title: "Terms of Service — Creator Retention Coach",
  description:
    "Read the Terms of Service for Creator Retention Coach, including usage, payments, refunds, and service limitations.",
  alternates: {
    canonical: "/terms",
  },
};

export default function Terms() {
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
            Terms of Service
          </h1>
          <div className="space-y-6 text-sm text-slate-300 leading-relaxed">
            <p>
              Creator Retention Coach provides AI-powered analysis to help content
              creators understand potential audience drop-off points in video scripts.
            </p>

            <h2 className="text-lg font-semibold text-white mt-6">Use of Service</h2>
            <p>
              This service is provided for informational and educational purposes only.
              Results are predictive in nature and do not guarantee performance or growth.
            </p>

            <h2 className="text-lg font-semibold text-white mt-6">Payments & Refunds</h2>
            <p>
              Payments are processed securely via Razorpay. Due to the digital and
              instant nature of the service, all purchases are non-refundable.
            </p>

            <h2 className="text-lg font-semibold text-white mt-6">Limitation of Liability</h2>
            <p>
              We are not responsible for any losses, damages, or outcomes resulting
              from the use of this service.
            </p>

            <h2 className="text-lg font-semibold text-white mt-6">Contact</h2>
            <p>
              For support, contact: <a href="mailto:support@creatorretentioncoach.in" className="text-blue-400 hover:underline">support@creatorretentioncoach.in</a>
            </p>
          </div>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
