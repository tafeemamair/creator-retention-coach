"use client";

import { useEffect, useMemo, useState } from "react";

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
  handler: () => void;
  theme: {
    color: string;
  };
};

type RazorpayInstance = {
  open: () => void;
  on: (event: string, callback: () => void) => void;
};
const PRICE_LABEL = "₹49";
const MAX_WORDS = 2000;

export default function RetentionForm() {
  const [script, setScript] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const wordCount = useMemo(() => {
    const trimmed = script.trim();
    return trimmed ? trimmed.split(/\s+/).length : 0;
  }, [script]);

  useEffect(() => {
    if (document.cookie.includes("paid=true")) {
      setShowPaywall(false);
    }
  }, []);

  function validateScript(input: string): string | null {
    if (!input || !input.trim()) {
      return "Please paste a script before analyzing.";
    }

    const count = input.trim().split(/\s+/).length;

    if (count < 10) {
      return "Script is too short. Please provide at least 10 words.";
    }

    if (count > MAX_WORDS) {
      return `Script is too long. Please limit to ${MAX_WORDS} words.`;
    }

    return null;
  }

  async function handleAnalyze() {
    if (loading) return;

    const validationError = validateScript(script);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError("");
    setResult("");
    setSuccessMessage("");

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ script }),
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.error || "Failed to analyze script.");
        return;
      }

      if (data.result) {
        setResult(data.result);
      }

      if (data.blocked) {
        setShowPaywall(true);
      } else {
        setShowPaywall(false);
        if (document.cookie.includes("paid=true")) {
          setSuccessMessage("Full analysis unlocked successfully!");
        }
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function loadRazorpayScript(): Promise<boolean> {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }

      const scriptTag = document.createElement("script");
      scriptTag.src = "https://checkout.razorpay.com/v1/checkout.js";
      scriptTag.onload = () => resolve(true);
      scriptTag.onerror = () => resolve(false);
      document.body.appendChild(scriptTag);
    });
  }

  async function handlePayment() {
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
      const res = await fetch("/api/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const order = await res.json();

      if (!res.ok || !order?.id) {
        setError(order?.message || "Could not create payment order. Please retry.");
        return;
      }

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        name: "Creator Retention Coach",
        description: "Unlock full retention analysis",
        order_id: order.id,
        prefill: {
          name: "Creator",
        },
        notes: {
          product: "Creator Retention Coach Pro",
        },
        modal: {
          ondismiss: () => {
            setPaymentLoading(false);
          },
        },
        handler: function () {
          document.cookie = "paid=true; path=/; max-age=31536000; SameSite=Lax";
          setShowPaywall(false);
          setSuccessMessage("Payment successful! Full analysis unlocked.");
          handleAnalyze();
        },
        theme: {
          color: "#2563eb",
        },
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.on("payment.failed", () => {
        setError("Payment failed. Please try again.");
        setPaymentLoading(false);
      });
      paymentObject.open();
    } catch {
      setError("Payment failed. Please try again.");
    } finally {
      setPaymentLoading(false);
    }
  }

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 760,
        padding: 32,
        background: "linear-gradient(180deg, #ffffff, #f8fafc)",
        borderRadius: 16,
        border: "1px solid #e2e8f0",
        boxShadow: "0 20px 45px rgba(15, 23, 42, 0.22)",
        margin: "0 auto",
      }}
    >
      <h1 style={{ fontSize: 30, marginBottom: 10, color: "#0f172a" }}>
        Creator Retention Coach
      </h1>

      <p style={{ color: "#334155", marginBottom: 6, fontSize: 16 }}>
        Predict drop-offs before you publish and improve watch time confidently.
      </p>

      <p style={{ color: "#475569", marginBottom: 20, fontSize: 13 }}>
        Instant AI feedback trusted by growth-focused creators.
      </p>

      <label
        htmlFor="script-input"
        style={{ display: "block", marginBottom: 8, color: "#1e293b", fontWeight: 600 }}
      >
        Paste your video script
      </label>

      <textarea
        id="script-input"
        rows={8}
        placeholder="Paste your full draft script here. Include your opening hook, key points, and CTA so we can detect drop-off risks and suggest high-retention fixes."
        value={script}
        onChange={(e) => setScript(e.target.value)}
        style={{
          width: "100%",
          padding: 14,
          fontSize: 14,
          lineHeight: 1.55,
          borderRadius: 10,
          border: "1px solid #cbd5e1",
          marginBottom: 8,
          color: "#0f172a",
          backgroundColor: "#ffffff",
          resize: "vertical",
        }}
      />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
          color: wordCount > MAX_WORDS ? "#b91c1c" : "#475569",
          fontSize: 13,
        }}
      >
        <span>Recommended: 75–500 words for best analysis quality</span>
        <strong>{wordCount} words</strong>
      </div>

      {error && (
        <div style={{ marginBottom: 12, color: "#991b1b", fontSize: 14 }}>{error}</div>
      )}

      {successMessage && (
        <div style={{ marginBottom: 12, color: "#065f46", fontSize: 14 }}>
          {successMessage}
        </div>
      )}

      <button
        onClick={handleAnalyze}
        disabled={loading}
        style={{
          background: loading ? "#94a3b8" : "#0f172a",
          color: "#ffffff",
          border: "none",
          borderRadius: 10,
          padding: "11px 18px",
          fontSize: 14,
          fontWeight: 700,
          cursor: loading ? "not-allowed" : "pointer",
          boxShadow: "0 8px 20px rgba(15, 23, 42, 0.25)",
          marginBottom: 20,
        }}
      >
        {loading ? "Analyzing..." : "Analyze Retention"}
      </button>

      {result && (
        <div
          style={{
            marginTop: 4,
            borderRadius: 12,
            border: "1px solid #dbeafe",
            background: "#eff6ff",
            padding: 16,
            color: "#0f172a",
            whiteSpace: "pre-line",
            fontSize: 14,
            lineHeight: 1.65,
          }}
        >
          {result}
        </div>
      )}

      <div
        style={{
          marginTop: 20,
          borderRadius: 12,
          border: "1px solid #e2e8f0",
          background: "#f8fafc",
          padding: 16,
        }}
      >
        <h3 style={{ margin: "0 0 10px", color: "#1e293b", fontSize: 15 }}>Premium Preview</h3>
        <div
          style={{
            position: "relative",
            borderRadius: 10,
            border: "1px dashed #cbd5e1",
            padding: 14,
            background: "#ffffff",
            overflow: "hidden",
          }}
        >
          <div style={{ filter: "blur(4px)", color: "#334155", userSelect: "none" }}>
            <p style={{ margin: "0 0 8px" }}>Full Retention Score: 8.4/10</p>
            <p style={{ margin: "0 0 8px" }}>Second-by-second drop-off map and rewrite plan</p>
            <p style={{ margin: 0 }}>Hook rewrite options with emotional triggers and pacing fixes</p>
          </div>
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#0f172a",
              fontWeight: 700,
              background: "linear-gradient(to bottom, rgba(248,250,252,0.25), rgba(248,250,252,0.8))",
            }}
          >
            🔒 Locked Premium Insights
          </div>
        </div>
      </div>

      {showPaywall && (
        <div
          style={{
            marginTop: 20,
            paddingTop: 18,
            borderTop: "1px solid #e2e8f0",
          }}
        >
          <p style={{ marginBottom: 10, color: "#1e293b", fontWeight: 600 }}>
            Your free preview is ready. Unlock complete retention fixes for just {PRICE_LABEL}.
          </p>
          <button
            onClick={handlePayment}
            disabled={paymentLoading}
            style={{
              background: paymentLoading ? "#94a3b8" : "linear-gradient(135deg, #2563eb, #1d4ed8)",
              color: "#ffffff",
              border: "none",
              borderRadius: 10,
              padding: "12px 18px",
              fontSize: 15,
              fontWeight: 700,
              cursor: paymentLoading ? "not-allowed" : "pointer",
              boxShadow: "0 10px 25px rgba(37, 99, 235, 0.35)",
              width: "100%",
              maxWidth: 320,
            }}
          >
            {paymentLoading ? "Processing..." : "Unlock Full Analysis – ₹49"}
          </button>
        </div>
      )}
    </div>
  );
}
