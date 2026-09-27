import Link from "next/link";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";

export function TrustSection() {
  return (
    <section id="trust" className="py-12 sm:py-16 px-4 sm:px-6 border-t border-slate-900 bg-slate-950">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="text-center space-y-2.5 max-w-2xl mx-auto">
          <Badge variant="emerald" size="md">
            Privacy & Trust
          </Badge>
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
            Your creative ideas remain private
          </h2>
          <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
            We treat your scripts and video concepts as confidential creator intellectual property with bank-grade isolation and private account security.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Card variant="default" className="p-5 space-y-2 border-slate-800">
            <div className="font-bold text-white flex items-center gap-2 text-sm">
              <span>🔒</span>
              <span>Account-Bound Row-Level Security</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Your saved analyses and script history are isolated in your authenticated workspace with PostgreSQL Row-Level Security (RLS). No other user can access your reports.
            </p>
          </Card>

          <Card variant="default" className="p-5 space-y-2 border-slate-800">
            <div className="font-bold text-white flex items-center gap-2 text-sm">
              <span>⚡</span>
              <span>Zero-Credit Re-Analysis</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Our cryptographic ledger caches your evaluated scripts. Re-analyzing or retrieving an unchanged script is 100% free and never deducts credits.
            </p>
          </Card>

          <Card variant="default" className="p-5 space-y-2 border-slate-800">
            <div className="font-bold text-white flex items-center gap-2 text-sm">
              <span>🛡️</span>
              <span>Enterprise AI Data Privacy</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Script rewrites are processed through OpenAI commercial API endpoints. Under official OpenAI business policies, API data is never used to train public AI models.
            </p>
          </Card>

          <Card variant="default" className="p-5 space-y-2 border-slate-800">
            <div className="font-bold text-white flex items-center gap-2 text-sm">
              <span>💳</span>
              <span>Encrypted Razorpay Checkout</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              All transactions are processed through Razorpay via TLS encryption. Creator Retention Coach never sees, stores, or handles your payment card or UPI credentials.
            </p>
          </Card>
        </div>

        {/* Diagnostic Disclaimer */}
        <div className="rounded-xl border border-slate-800/80 bg-slate-900/20 p-4 sm:p-5 space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
            <span>⚖️</span>
            <span>Diagnostic & Performance Disclaimer</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Retention scores, estimated drop-off seconds, and retention curves are algorithmic diagnostic signals based on script structure, pacing, and hook dynamics. Final video performance also depends on creator delivery, vocal energy, visual editing, thumbnail packaging, and platform distribution. CRC does not guarantee algorithmic virality or view counts.
          </p>
        </div>

        {/* Legal Policy Links */}
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-400 pt-2">
          <span>Read our verified policies:</span>
          <Link href="/privacy" className="text-indigo-400 hover:text-indigo-300 underline underline-offset-4">
            Privacy Policy
          </Link>
          <span>•</span>
          <Link href="/terms" className="text-indigo-400 hover:text-indigo-300 underline underline-offset-4">
            Terms of Service
          </Link>
          <span>•</span>
          <Link href="/refunds" className="text-indigo-400 hover:text-indigo-300 underline underline-offset-4">
            Refund Policy
          </Link>
        </div>
      </div>
    </section>
  );
}
