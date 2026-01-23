"use client";

import { useState } from "react";

export default function RetentionForm() {
  const [script, setScript] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);

  async function handleAnalyze() {
    if (loading) return;
    setLoading(true);
    setResult("");
    setShowPaywall(false);

    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ script }),
    });

    const data = await res.json();

    if (data.error) {
      setResult(data.error);
      setLoading(false);
      return;
    }

    if (data.blocked) {
      setResult(data.message);
      setShowPaywall(true);
    } else {
      setResult(data.result);
    }

    setLoading(false);
  }

  return (
   <>
    <div
      style={{
        width: "100%",
        maxWidth: 640,
        padding: 24,
        background: "#ffffff",
        borderRadius: 12,
        boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
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
          borderRadius: 6,
          border: "1px solid #d1d5db",
          marginBottom: 12,
          color: "#111827",
          backgroundColor: "#ffffff"
        }}
      />

      <button
        onClick={handleAnalyze}
        disabled={loading || !script}
        style={{
          padding: "10px 16px",
          fontSize: 14,
          borderRadius: 6,
          border: "none",
          background: loading ? "#555" : "#2563eb",
          color: "#fff",
          cursor: loading ? "not-allowed" : "pointer",
        }}
      >
        {loading ? "Analyzing..." : "Analyze Retention"}
      </button>

      <p style={{ marginTop: 10, fontSize: 12, color: "#666" }}>
        Full analysis costs <b>₹49</b> (one-time)
      </p>

      {result && <hr style={{ marginTop: 24, marginBottom: 16 }} />}

      {result && (
        <div
          style={{
            marginTop: 20,
            padding: 16,
            borderRadius: 8,
            background: "#f9f9f9",
            border: "1px solid #e5e5e5",
            whiteSpace: "pre-wrap",
            fontSize: 14,
          }}
        >
          {result}
        </div>
      )}

      {showPaywall && (
        <div
          style={{
            marginTop: 16,
            padding: 16,
            borderRadius: 8,
            border: "1px solid #f59e0b",
            background: "#fff7ed",
          }}
        >
          <strong>Free limit reached</strong>
          <p style={{ marginTop: 8 }}>
            Unlock full analysis for <b>₹49</b>
          </p>
          <button
            style={{
              marginTop: 8,
              padding: "10px 16px",
              borderRadius: 6,
              border: "none",
              background: "#f59e0b",
              color: "#000",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Pay ₹49 & Unlock
          </button>
        </div>
      )}

      <p style={{ marginTop: 20, fontSize: 12, color: "#888" }}>
        Free analysis shows drop-off prediction.
        <strong> Upgrade</strong> to unlock exact fixes and optimized hooks.
      </p>
    </div>
      <p style={{ marginTop: 24, fontSize: 12, color: "#888" }}>
        <a href="/terms">Terms</a> · <a href="/privacy">Privacy</a>
      </p>
     <hr style={{ marginTop: 28, marginBottom: 12, borderColor: "#eee" }} />
     
     <p style={{ fontSize: 12, color: "#777", textAlign: "center" }}>
       <a href="/terms" style={{ color: "#555", textDecoration: "none" }}>
         Terms
       </a>
       {" · "}
       <a href="/privacy" style={{ color: "#555", textDecoration: "none" }}>
         Privacy
       </a>
     </p>
    </>
  );
}
