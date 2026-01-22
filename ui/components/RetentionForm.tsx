"use client";

import { useState } from "react";

export default function RetentionForm() {
  const [script, setScript] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);

  async function handleAnalyze() {
    setLoading(true);
    setResult("");
    setShowPaywall(false);

    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ script }),
    });

    const data = await res.json();

    if (data.blocked) {
      setResult(data.message);
      setShowPaywall(true);
    } else {
      setResult(data);
    }

    setLoading(false);
  }

  return (
    <div style={{ maxWidth: 600 }}>
      <h2>Creator Retention Coach</h2>
      <p style={{ color: "#666", marginBottom: 12 }}>
        Predict where viewers drop off — before you publish.
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
          border: "1px solid #ccc",
          marginBottom: 12,
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
  );
}
