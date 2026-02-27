"use client";

import { useState, useEffect } from "react";

export default function RetentionForm() {
  const [script, setScript] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (document.cookie.includes("paid=true")) {
      setShowPaywall(false);
    }
  }, []);

  function validateScript(input: string): string | null {
    if (!input || !input.trim()) {
      return "Please paste a script before analyzing.";
    }

    const wordCount = input.trim().split(/\s+/).length;

    if (wordCount < 10) {
      return "Script is too short. Please provide at least 10 words.";
    }

    if (wordCount > 2000) {
      return "Script is too long. Please limit to 2000 words.";
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
    } catch (err) {
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

      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }

  async function handlePayment() {
    setPaymentLoading(true);
    setError("");

    const loaded = await loadRazorpayScript();

    if (!loaded) {
      setError("Failed to load Razorpay. Check your internet.");
      setPaymentLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/create-order", {
        method: "POST",
      });

      const order = await res.json();

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        name: "Creator Retention Coach",
        description: "Unlock full retention analysis",
        order_id: order.id,
        handler: function () {
          document.cookie =
            "paid=true; path=/; max-age=31536000; SameSite=Lax";
          setShowPaywall(false);
          alert("Payment successful! Unlocking full analysis...");
          handleAnalyze();
        },
        theme: {
          color: "#f59e0b",
        },
      };

      // @ts-ignore
      const paymentObject = new window.Razorpay(options);
      paymentObject.open();
    } catch (err) {
      setError("Payment failed. Please try again.");
    } finally {
      setPaymentLoading(false);
    }
  }

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 640,
        padding: 24,
        background: "#f9fafb",
        borderRadius: 12,
        boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
        margin: "0 auto",
      }}
    >
      <h1 style={{ fontSize: 24, marginBottom: 8, color: "#111" }}>
        Creator Retention Coach
      </h1>

      <p style={{ color: "#555", marginBottom: 16 }}>
        Predict where viewers drop off - before you publish.
      </p>

      <textarea
        rows={7}
        placeholder="Paste your video script or hook here..."
        value={script}
        onChange={(e) => setScript(e.target.value)}
        style={{
          width: "100%",
          padding: 12,
          fontSize: 14,
          lineHeight: 1.5,
          borderRadius: 6,
          border: "1px solid #d1d5db",
          marginBottom: 12,
          color: "#111827",
          backgroundColor: "#ffffff",
        }}
      />

      {error && (
        <div style={{ marginBottom: 12, color: "#991b1b" }}>{error}</div>
      )}

      {successMessage && (
        <div style={{ marginBottom: 12, color: "#065f46" }}>
          {successMessage}
        </div>
      )}

      <button onClick={handleAnalyze} disabled={loading}>
        {loading ? "Analyzing..." : "Analyze Retention"}
      </button>

      {result && <div style={{ marginTop: 20 }}>{result}</div>}

      {showPaywall && (
        <div style={{ marginTop: 20 }}>
          <p>Unlock full analysis for ₹49</p>
          <button onClick={handlePayment} disabled={paymentLoading}>
            {paymentLoading ? "Processing..." : "Pay ₹49 & Unlock"}
          </button>
        </div>
      )}
    </div>
  );
}