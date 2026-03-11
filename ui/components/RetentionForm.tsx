"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

type RazorpayOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill: {
    name: string;
  };
  notes: {
    product: string;
  };
  modal: {
    ondismiss: () => void;
  };
  handler: (response: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }) => void;
  theme: {
    color: string;
  };
};

type RazorpayInstance = {
  open: () => void;
  on: (event: string, callback: (response?: PaymentFailureResponse) => void) => void;
};

type PaymentFailureResponse = {
  error?: {
    description?: string;
    reason?: string;
  };
};

const MAX_WORDS = 2000;

type PreviewData = {
  estimatedDuration: string;
  hookScore: number;
  retentionRisk: string;
  dropOffEstimate: string;
};

type FullAnalysis = {
  estimatedDuration: string;
  retentionScore: number;
  hookStrength: string;
  whatsWorking: string[];
  whatsHurting: string[];
  exactFixes: string[];
  improvedScriptVersions: {
    version1: string;
    version2: string;
    version3: string;
  };
  viralTitleSuggestions: string[];
  callToActionDetected: boolean;
};

function scoreColor(score: number): string {
  if (score >= 8) return "#16a34a";
  if (score >= 6) return "#f59e0b";
  return "#ef4444";
}

function SectionCard({ title, icon, children }: { title: string; icon: string; children: ReactNode }) {
  return (
    <div
      style={{
        borderRadius: 14,
        border: "1px solid #e2e8f0",
        background: "#ffffff",
        padding: 18,
        boxShadow: "0 6px 22px rgba(15, 23, 42, 0.08)",
      }}
    >
      <h3 style={{ margin: "0 0 12px", color: "#0f172a", fontSize: 17 }}>
        <span style={{ marginRight: 8 }}>{icon}</span>
        {title}
      </h3>
      {children}
    </div>
  );
}

export default function RetentionForm() {
  const router = useRouter();
  const pathname = usePathname();
  const [script, setScript] = useState("");
  const [loading, setLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [analysis, setAnalysis] = useState<FullAnalysis | null>(null);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [autoAnalyzeDone, setAutoAnalyzeDone] = useState(false);

  const wordCount = useMemo(() => {
    const trimmed = script.trim();
    return trimmed ? trimmed.split(/\s+/).length : 0;
  }, [script]);

  function validateScript(input: string): string | null {
    if (!input || !input.trim()) return "Please paste a script before analyzing.";
    const count = input.trim().split(/\s+/).length;
    if (count < 10) return "Script is too short. Please provide at least 10 words.";
    if (count > MAX_WORDS) return `Script is too long. Please limit to ${MAX_WORDS} words.`;
    return null;
  }

  const analyzeScript = useCallback(
    async (inputScript: string) => {
      if (loading) return;

      const validationError = validateScript(inputScript);
      if (validationError) {
        setError(validationError);
        return;
      }

      setLoading(true);
      setError("");
      setPreview(null);
      setAnalysis(null);
      setSuccessMessage("");

      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ script: inputScript }),
          credentials: "include",
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data?.error || "Failed to analyze script.");
          return;
        }

        if (data.preview) setPreview(data.preview as PreviewData);
        if (data.analysis) setAnalysis(data.analysis as FullAnalysis);

        const paid = document.cookie.includes("paid=true");
        if (data.blocked) {
          setShowPaywall(!paid);
        } else {
          setShowPaywall(!paid && Boolean(data.preview));
          if (paid && data.analysis) setSuccessMessage("Full retention optimization report ready.");
        }
      } catch {
        setError("Something went wrong. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [loading]
  );

  useEffect(() => {
    const isPaid = document.cookie.includes("paid=true");
    if (isPaid) setShowPaywall(false);

    if (pathname === "/results" && isPaid && !autoAnalyzeDone) {
      const savedScript = window.sessionStorage.getItem("unlockScript");
      if (savedScript) {
        setScript(savedScript);
        void analyzeScript(savedScript);
      }
      setAutoAnalyzeDone(true);
    }
  }, [pathname, autoAnalyzeDone, analyzeScript]);

  function loadRazorpayScript(): Promise<boolean> {
    return new Promise((resolve) => {
      if (window.Razorpay) return resolve(true);

      const existingScript = document.getElementById("razorpay-checkout-js") as HTMLScriptElement | null;
      if (existingScript) {
        existingScript.addEventListener("load", () => resolve(true), { once: true });
        existingScript.addEventListener("error", () => resolve(false), { once: true });
        return;
      }

      const scriptTag = document.createElement("script");
      scriptTag.id = "razorpay-checkout-js";
      scriptTag.src = "https://checkout.razorpay.com/v1/checkout.js";
      scriptTag.onload = () => resolve(true);
      scriptTag.onerror = () => resolve(false);
      document.body.appendChild(scriptTag);
    });
  }

  async function handleUnlock() {
    if (paymentLoading) return;
    setPaymentLoading(true);
    setError("");

    const loaded = await loadRazorpayScript();
    if (!loaded) {
      setError("Failed to load Razorpay. Check your internet and try again.");
      setPaymentLoading(false);
      return;
    }

    if (!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID) {
      setError("Payment is not configured. Missing NEXT_PUBLIC_RAZORPAY_KEY_ID.");
      setPaymentLoading(false);
      return;
    }

    try {
      window.sessionStorage.setItem("unlockScript", script);

      const res = await fetch("/api/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const order = await res.json();
      if (!res.ok || !order?.id) {
        setError(order?.error || order?.message || "Could not create payment order. Please retry.");
        return;
      }

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        name: "Creator Retention Coach",
        description: "Unlock full retention analysis",
        order_id: order.id,
        prefill: { name: "Creator" },
        notes: { product: "Creator Retention Coach Pro" },
        modal: {
          ondismiss: () => {
            setError("Payment was cancelled. You can try again anytime.");
            setPaymentLoading(false);
          },
        },
        handler: function () {
          document.cookie = "paid=true; path=/; max-age=31536000; SameSite=Lax";
          setShowPaywall(false);
          setSuccessMessage("Payment successful! Full report unlocked.");
          setPaymentLoading(false);
          router.push("/results");
        },
        theme: { color: "#4f46e5" },
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.on("payment.failed", (response) => {
        const description = response?.error?.description || response?.error?.reason || "Payment failed.";
        setError(`${description} Please try again.`);
        setPaymentLoading(false);
      });
      paymentObject.open();
    } catch {
      setError("Payment failed. Please try again.");
      setPaymentLoading(false);
    }
  }

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 980,
        padding: 32,
        background: "radial-gradient(circle at top, #eef2ff, #ffffff 45%)",
        borderRadius: 20,
        border: "1px solid #dbeafe",
        boxShadow: "0 24px 60px rgba(15, 23, 42, 0.15)",
        margin: "0 auto",
      }}
    >
      <h1 style={{ fontSize: 34, marginBottom: 8, color: "#0f172a", letterSpacing: -0.4 }}>Creator Retention Coach</h1>
      <p style={{ color: "#334155", marginBottom: 22, fontSize: 16 }}>
        AI-powered retention optimization for YouTube Shorts — built like a modern creator SaaS.
      </p>

      <label htmlFor="script-input" style={{ display: "block", marginBottom: 8, color: "#1e293b", fontWeight: 700 }}>
        Paste your video script
      </label>
      <textarea
        id="script-input"
        rows={8}
        placeholder="Paste your full draft script with hook, core message, and CTA."
        value={script}
        onChange={(e) => setScript(e.target.value)}
        style={{
          width: "100%",
          padding: 16,
          fontSize: 14,
          lineHeight: 1.6,
          borderRadius: 12,
          border: "1px solid #bfdbfe",
          marginBottom: 8,
          color: "#0f172a",
          backgroundColor: "#ffffff",
          resize: "vertical",
        }}
      />

      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16, color: "#475569", fontSize: 13 }}>
        <span>Recommended: 75–500 words for best analysis quality</span>
        <strong>{wordCount} words</strong>
      </div>

      {error && <div style={{ marginBottom: 12, color: "#991b1b", fontSize: 14 }}>{error}</div>}
      {successMessage && <div style={{ marginBottom: 12, color: "#065f46", fontSize: 14 }}>{successMessage}</div>}

      <button
        onClick={() => void analyzeScript(script)}
        disabled={loading}
        style={{
          background: loading ? "#94a3b8" : "linear-gradient(135deg, #4f46e5, #2563eb)",
          color: "#ffffff",
          border: "none",
          borderRadius: 12,
          padding: "12px 22px",
          fontSize: 15,
          fontWeight: 700,
          cursor: loading ? "not-allowed" : "pointer",
          boxShadow: "0 10px 24px rgba(37, 99, 235, 0.3)",
          marginBottom: 24,
        }}
      >
        {loading ? "Analyzing..." : "Analyze Retention"}
      </button>

      {preview && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 14, marginBottom: 20 }}>
          <SectionCard title="Retention Score Card" icon="📊">
            <div style={{ display: "inline-block", padding: "6px 12px", borderRadius: 999, background: "#e0e7ff", color: "#312e81", fontWeight: 800 }}>
              {(analysis?.retentionScore ?? preview.hookScore).toFixed(1)} / 10
            </div>
            <p style={{ margin: "10px 0 0", color: "#334155" }}>Estimated Duration: {preview.estimatedDuration}</p>
            <p style={{ margin: "6px 0 0", color: "#334155" }}>Likely Drop-off: {preview.dropOffEstimate}</p>
          </SectionCard>

          <SectionCard title="Hook Strength" icon="🪝">
            <p style={{ margin: 0, color: scoreColor(preview.hookScore), fontWeight: 700 }}>Score: {preview.hookScore} / 10</p>
            <p style={{ margin: "10px 0 0", color: "#334155" }}>{analysis?.hookStrength ?? "Run premium analysis to unlock rewritten hooks and script upgrades."}</p>
          </SectionCard>
        </div>
      )}

      {analysis && (
        <div style={{ display: "grid", gap: 14 }}>
          <SectionCard title="What’s Working" icon="✅">
            {analysis.whatsWorking.map((item) => (
              <p key={item} style={{ margin: "0 0 8px", color: "#334155" }}>• {item}</p>
            ))}
          </SectionCard>

          <SectionCard title="What’s Hurting" icon="⚠️">
            {analysis.whatsHurting.map((item) => (
              <p key={item} style={{ margin: "0 0 8px", color: "#334155" }}>• {item}</p>
            ))}
          </SectionCard>

          <SectionCard title="Exact Fixes" icon="🛠️">
            {analysis.exactFixes.map((item) => (
              <p key={item} style={{ margin: "0 0 8px", color: "#334155" }}>• {item}</p>
            ))}
          </SectionCard>

          <SectionCard title="Improved Script Versions" icon="✨">
            <p style={{ margin: "0 0 10px", color: "#1e293b", fontWeight: 700 }}>Script Version 1 – High curiosity hook</p>
            <p style={{ whiteSpace: "pre-wrap", color: "#334155", marginTop: 0 }}>{analysis.improvedScriptVersions.version1}</p>
            <p style={{ margin: "10px 0", color: "#1e293b", fontWeight: 700 }}>Script Version 2 – Faster pacing for retention</p>
            <p style={{ whiteSpace: "pre-wrap", color: "#334155", marginTop: 0 }}>{analysis.improvedScriptVersions.version2}</p>
            <p style={{ margin: "10px 0", color: "#1e293b", fontWeight: 700 }}>Script Version 3 – Strong emotional storytelling</p>
            <p style={{ whiteSpace: "pre-wrap", color: "#334155", marginTop: 0 }}>{analysis.improvedScriptVersions.version3}</p>
          </SectionCard>

          <SectionCard title="Viral Title Suggestions" icon="🔥">
            {analysis.viralTitleSuggestions.map((title) => (
              <p key={title} style={{ margin: "0 0 8px", color: "#334155", fontWeight: 600 }}>• {title}</p>
            ))}
          </SectionCard>
        </div>
      )}

      {!analysis && (
        <div
          style={{
            marginTop: 20,
            borderRadius: 14,
            border: "1px solid #c7d2fe",
            background: "linear-gradient(120deg, #eef2ff, #ffffff)",
            padding: 20,
          }}
        >
          <h3 style={{ margin: "0 0 8px", color: "#312e81", fontSize: 20 }}>Your Full Retention Optimization Report</h3>
          <p style={{ margin: "0 0 10px", color: "#334155" }}>Unlock premium insights and rewrites built for retention growth.</p>
          <p style={{ margin: 0, color: "#334155" }}>✔ Exact script fixes</p>
          <p style={{ margin: 0, color: "#334155" }}>✔ 3 improved script versions</p>
          <p style={{ margin: 0, color: "#334155" }}>✔ Viral title suggestions</p>
          <p style={{ margin: "0 0 14px", color: "#334155" }}>✔ Retention score breakdown</p>

          {showPaywall && (
            <button
              onClick={handleUnlock}
              disabled={paymentLoading}
              style={{
                background: paymentLoading ? "#94a3b8" : "linear-gradient(135deg, #2563eb, #1d4ed8)",
                color: "#ffffff",
                border: "none",
                borderRadius: 12,
                padding: "14px 24px",
                fontSize: 17,
                fontWeight: 800,
                cursor: paymentLoading ? "not-allowed" : "pointer",
                boxShadow: "0 12px 28px rgba(37, 99, 235, 0.35)",
              }}
            >
              {paymentLoading ? "Processing..." : "Unlock Full Analysis – ₹49"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
