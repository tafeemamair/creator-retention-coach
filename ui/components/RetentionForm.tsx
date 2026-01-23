"use client";

import { useState } from "react";

export default function RetentionForm() {
  const [script, setScript] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [error, setError] = useState("");


  async function handleAnalyze() {
    
    if (loading) return;

    console.log("SCRIPT LENGTH:", script.length, script);
    
    if (!script || !script.trim()) {
      setError("Please paste a script before analyzing.");
      setResult("");
      setShowPaywall(false);
      return;
    }
      
    setError("");
    setLoading(true);
    setResult("");
    setShowPaywall(false);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ script }),
      });

      const data = await res.json();

      if (data.error) {
        setError(data.error);
      } else if (data.blocked) {
        setResult(data.message);
        setShowPaywall(true);
      } else {
        setResult(data.result);
      }
    } catch (e) {
      setError("Something went wrong. Please try again.");
    }

    setLoading(false);
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
        value={script}
        onChange={(e) => {
          console.log("ON CHANGE FIRED:", e.target.value);
          setScript(e.target.value);
        }}
        style={{
          width: "100%",
          padding: 12,
          border: "2px solid red",
        }}
      />


      {error && (
        <div
          style={{
            marginBottom: 12,
            padding: 10,
            borderRadius: 6,
            background: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#991b1b",
            fontSize: 13,
          }}
        >
          {error}
        </div>
    )}


      <button
        type="button"
        onClick={handleAnalyze}
        disabled={loading}
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
            color: "#111",
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
