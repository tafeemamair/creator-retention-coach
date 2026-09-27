"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { validateScript } from "@/lib/validation";
import type { FullAnalysis, Platform } from "@/lib/analyze";
import AnalysisDashboardView from "../results/AnalysisDashboardView";
import PricingSelector, { type PricingPlan } from "../pricing/PricingSelector";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { Select } from "../ui/Select";

interface RazorpaySuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayFailureResponse {
  error: {
    code?: string;
    description: string;
    source?: string;
    step?: string;
    reason?: string;
    metadata?: {
      order_id?: string;
      payment_id?: string;
    };
  };
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpaySuccessResponse) => void | Promise<void>;
  modal?: { ondismiss?: () => void };
  theme?: { color?: string };
}

interface RazorpayInstance {
  open: () => void;
  on: (event: string, handler: (response: RazorpayFailureResponse) => void) => void;
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

export function StudioComposer() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [script, setScript] = useState("");
  const [originalScript, setOriginalScript] = useState("");
  const [title, setTitle] = useState("");
  const [platform, setPlatform] = useState<Platform>("YouTube Shorts");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [analysis, setAnalysis] = useState<FullAnalysis | null>(null);
  const [analysisId, setAnalysisId] = useState<string | null>(null);

  // Entitlement & Credits State
  const [creditsRemaining, setCreditsRemaining] = useState<number | null>(null);
  const [totalCredits, setTotalCredits] = useState<number | null>(null);
  const [currentPlan, setCurrentPlan] = useState<PricingPlan | null>(null);
  const [freeRemaining, setFreeRemaining] = useState<number>(1);
  const [freeUsed, setFreeUsed] = useState(false);
  const [isFreeAnalysis, setIsFreeAnalysis] = useState(false);

  // Payment Checkout State
  const [selectedPlan, setSelectedPlan] = useState<PricingPlan>("pack5");
  const [loadingUnlock, setLoadingUnlock] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);

  // Live Pacing Statistics
  const words = script.trim() ? script.trim().split(/\s+/).filter(Boolean) : [];
  const wordCount = words.length;
  const estimatedDuration = Math.max(1, Math.round(wordCount / 2.67));

  // Check Entitlement Balance on Mount
  const fetchEntitlement = async () => {
    try {
      const res = await fetch("/api/entitlement");
      if (res.ok) {
        const data = await res.json();
        if (data.entitled && typeof data.creditsRemaining === "number") {
          setCreditsRemaining(data.creditsRemaining);
          if (typeof data.totalCredits === "number") setTotalCredits(data.totalCredits);
          if (data.plan === "single" || data.plan === "pack5") setCurrentPlan(data.plan);
          setFreeUsed(true);
        } else {
          if (typeof data.freeRemaining === "number") {
            setFreeRemaining(data.freeRemaining);
            setFreeUsed(Boolean(data.freeUsed));
          }
        }
      }
    } catch (err) {
      console.warn("Entitlement check failed:", err);
    }
  };

  useEffect(() => {
    fetchEntitlement();
  }, []);

  const [parentId, setParentId] = useState<string | null>(null);
  const [parentTitle, setParentTitle] = useState<string | null>(null);
  const [loadingParent, setLoadingParent] = useState(false);

  // Consume Purchase Intent and Parent Revision ID from URL search parameters on mount
  useEffect(() => {
    if (!searchParams) return;
    const checkout = searchParams.get("checkout");
    const plan = searchParams.get("plan");
    const parentParam = searchParams.get("parent_id") || searchParams.get("parent");

    if (checkout === "true") {
      if (plan === "single") {
        setSelectedPlan("single");
        setShowPaywall(true);
      } else if (plan === "pack5") {
        setSelectedPlan("pack5");
        setShowPaywall(true);
      } else {
        // Safe fallback for checkout=true with unspecified plan
        setSelectedPlan("pack5");
        setShowPaywall(true);
      }
    }

    if (parentParam) {
      setParentId(parentParam);
      setLoadingParent(true);
      fetch(`/api/analyses/${parentParam}`)
        .then((res) => {
          if (res.ok) return res.json();
          throw new Error("Parent analysis not found");
        })
        .then((data) => {
          const record = data?.analysis || data;
          if (record && record.script) {
            setScript(record.script);
            if (record.platform) setPlatform(record.platform as Platform);
            if (record.title) {
              setTitle(`Revision: ${record.title}`);
              setParentTitle(record.title);
            } else {
              setParentTitle("Untitled Analysis");
            }
          }
        })
        .catch((err) => {
          console.warn("Failed to load parent analysis for revision:", err);
        })
        .finally(() => {
          setLoadingParent(false);
        });
    }
  }, [searchParams]);

  const handleAnalyze = async () => {
    const validation = validateScript(script);
    if (!validation.valid) {
      setError(validation.error || "Please write or paste a script before analyzing.");
      return;
    }

    setLoading(true);
    setError("");
    setShowPaywall(false);

    try {
      const res = await fetch("/api/analyze-full", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          script: script.trim(),
          platform,
          title: title.trim() || undefined,
          parentId: parentId || undefined,
        }),
      });

      if (res.status === 402) {
        const errorData = await res.json().catch(() => ({}));
        setFreeRemaining(0);
        setFreeUsed(true);
        setCreditsRemaining(0);
        setShowPaywall(true);
        setError(errorData.message || "You have used your 1 free full analysis. Select a plan below to continue.");
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || "Failed to analyze script.");
      }

      if (!data.analysis) {
        throw new Error("Analysis payload was missing from server response.");
      }

      setAnalysis(data.analysis);
      if (data.analysisId) {
        setAnalysisId(data.analysisId);
      }
      setOriginalScript(script.trim());
      if (typeof data.creditsRemaining === "number") {
        setCreditsRemaining(data.creditsRemaining);
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("crc_credit_update", {
              detail: { creditsRemaining: data.creditsRemaining, freeRemaining: 0 },
            })
          );
        }
      }
      if (typeof data.totalCredits === "number") setTotalCredits(data.totalCredits);
      if (data.plan) setCurrentPlan(data.plan);
      setError("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleUnlockPayment = async () => {
    setLoadingUnlock(true);
    setError("");

    try {
      const orderRes = await fetch("/api/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: selectedPlan }),
      });

      if (!orderRes.ok) {
        const orderErr = await orderRes.json().catch(() => ({}));
        throw new Error(orderErr.error || "Failed to initialize payment order.");
      }

      const orderData = await orderRes.json();
      const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

      if (!keyId) {
        throw new Error("Razorpay gateway is not configured on this environment.");
      }

      if (!window.Razorpay) {
        throw new Error(
          "Payment window could not be opened. If you are using an ad-blocker or privacy extension (like Brave Shields or uBlock Origin), please allow checkout.razorpay.com and refresh."
        );
      }

      const options: RazorpayOptions = {
        key: keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Creator Retention Coach",
        description: selectedPlan === "pack5" ? "Creator Pack (5 full reports)" : "Single Report (1 full report)",
        order_id: orderData.id,
        modal: {
          ondismiss: () => {
            setLoadingUnlock(false);
          },
        },
        handler: async function (response: RazorpaySuccessResponse) {
          try {
            const verifyRes = await fetch("/api/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            if (!verifyRes.ok) {
              const verifyData = await verifyRes.json();
              throw new Error(verifyData.error || "Payment verification failed.");
            }

            const verifyData = await verifyRes.json();
            if (typeof verifyData.creditsRemaining === "number") {
              setCreditsRemaining(verifyData.creditsRemaining);
              if (typeof window !== "undefined") {
                window.dispatchEvent(
                  new CustomEvent("crc_credit_update", {
                    detail: { creditsRemaining: verifyData.creditsRemaining, freeRemaining: 0 },
                  })
                );
              }
            }
            if (typeof verifyData.totalCredits === "number") {
              setTotalCredits(verifyData.totalCredits);
            }
            setCurrentPlan(selectedPlan);
            setShowPaywall(false);
            setLoadingUnlock(false);
            router.refresh();
            if (typeof window !== "undefined" && window.history?.replaceState) {
              window.history.replaceState({}, "", "/app/analyze");
            }
          } catch (err) {
            setLoadingUnlock(false);
            setError(err instanceof Error ? err.message : "Payment verification error.");
          }
        },
        theme: { color: "#4f46e5" },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (err) {
      setLoadingUnlock(false);
      setError(err instanceof Error ? err.message : "Payment checkout error.");
    }
  };

  const handleResetStudio = () => {
    setAnalysis(null);
    setAnalysisId(null);
    setScript("");
    setOriginalScript("");
    setTitle("");
    setError("");
    setShowPaywall(false);
  };

  const handleResetDraft = () => {
    setScript(originalScript);
  };

  return (
    <div className="space-y-6">
      {/* If Analysis Result is Present, Render the Results Diagnostic Sequence */}
      {analysis ? (
        <AnalysisDashboardView
          analysis={analysis}
          script={script}
          setScript={setScript}
          originalScript={originalScript}
          onResetDraft={handleResetDraft}
          platform={platform}
          setPlatform={setPlatform}
          onReAnalyze={handleAnalyze}
          onNewAnalysis={handleResetStudio}
          loadingReAnalyze={loading}
          creditsRemaining={creditsRemaining ?? (freeUsed ? 0 : null)}
          totalCredits={totalCredits}
          currentPlan={currentPlan}
          isFreeAnalysis={isFreeAnalysis}
          selectedPlan={selectedPlan}
          setSelectedPlan={setSelectedPlan}
          onUnlock={handleUnlockPayment}
          loadingUnlock={loadingUnlock}
          analysisId={analysisId}
          isRevision={Boolean(parentId)}
        />
      ) : (
        /* Focused Script Studio Composer View */
        <div className="space-y-6 max-w-4xl mx-auto">
          {/* Studio Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Script Studio</h1>
              <p className="text-xs text-slate-400 mt-1">
                Draft or paste your short-form script. All analyses are automatically saved to your account.
              </p>
            </div>

            {/* Credit / Entitlement State Indicator */}
            <div className="flex items-center gap-2">
              {creditsRemaining !== null && creditsRemaining > 0 ? (
                <Badge variant="emerald" size="md">
                  ⚡ {creditsRemaining} Credits Available
                </Badge>
              ) : !freeUsed && freeRemaining > 0 ? (
                <Badge variant="indigo" size="md" dot>
                  1 Complimentary Report Ready
                </Badge>
              ) : (
                <Badge variant="amber" size="md">
                  0 Credits Left
                </Badge>
              )}
            </div>
          </div>

          {/* Upgrade / Checkout Pricing Surface when Checkout Intent or Paywalled */}
          {showPaywall && (
            <div id="pricing-selector-container" className="pt-2">
              <PricingSelector
                selectedPlan={selectedPlan}
                setSelectedPlan={setSelectedPlan}
                onUnlock={handleUnlockPayment}
                loading={loadingUnlock}
                creditsRemaining={creditsRemaining}
                totalCredits={totalCredits}
                currentPlan={currentPlan}
                title="Unlock More Retention Reports"
                subtitle="Select a credit pack below to complete your order."
              />
            </div>
          )}

          {/* Form & Editor Surface */}
          <Card variant="default" className="p-6 space-y-5 border-slate-800 bg-slate-900/40">
            {/* Revision Lineage Context Indicator */}
            {parentId && (
              <div className="p-3.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 flex items-center justify-between gap-3 text-xs text-indigo-300">
                <div className="flex items-center gap-2">
                  <span className="text-base">📝</span>
                  <span>
                    <strong>Explicit Revision Mode:</strong> Modifying script from{" "}
                    <span className="text-white font-medium">{parentTitle || "Parent Analysis"}</span>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setParentId(null);
                    setParentTitle(null);
                  }}
                  className="text-slate-400 hover:text-slate-200 underline text-[11px] whitespace-nowrap"
                >
                  Unlink Parent
                </button>
              </div>
            )}

            {/* Top Row: Title & Platform Controls */}
            <div className="grid sm:grid-cols-12 gap-4">
              <div className="sm:col-span-7 space-y-1.5">
                <label htmlFor="script-title" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Script Title <span className="text-slate-400 font-normal">(Optional for history)</span>
                </label>
                <input
                  id="script-title"
                  type="text"
                  placeholder="e.g., 3 AI Tools For Solopreneurs"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                />
              </div>

              <div className="sm:col-span-5 space-y-1.5">
                <Select
                  label="Target Platform"
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value as Platform)}
                >
                  <option value="YouTube Shorts">YouTube Shorts</option>
                  <option value="TikTok">TikTok</option>
                  <option value="Instagram Reels">Instagram Reels</option>
                </Select>
              </div>
            </div>

            {/* Main Script Textarea */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="script-input" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Script Content
                </label>
                <span className="text-[11px] text-slate-400 font-mono">
                  {wordCount} words • ~{estimatedDuration}s estimated read
                </span>
              </div>
              <textarea
                id="script-input"
                rows={10}
                placeholder="Paste your hook, main points, and call-to-action here...&#10;&#10;e.g.&#10;Stop doing cardio for 45 minutes if your goal is losing fat. In this video I will show you why that does not work..."
                value={script}
                onChange={(e) => setScript(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition leading-relaxed resize-none font-sans"
              />
            </div>

            {/* Live Pacing Guide Bar */}
            <div className="p-3 rounded-xl border border-slate-800/80 bg-slate-950/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-300">Pacing Guide:</span>
                <span className="text-slate-400">
                  {estimatedDuration <= 30 ? (
                    <span className="text-emerald-400">⚡ Fast-paced (Ideal 0–30s short)</span>
                  ) : estimatedDuration <= 60 ? (
                    <span className="text-indigo-300">✓ Standard Short-Form (30–60s)</span>
                  ) : (
                    <span className="text-amber-400">⚠️ Extended Duration (&gt;60s)</span>
                  )}
                </span>
              </div>
              <span className="text-slate-400 text-[11px]">
                Calculated at 160 spoken words/min
              </span>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-xs text-rose-300 flex items-center gap-2">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {/* Action Bar */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-800/80">
              <div className="text-xs text-slate-400">
                <span>Re-analyzing unchanged scripts is always free (0 credits).</span>
              </div>

              <Button
                variant="primary"
                size="lg"
                onClick={handleAnalyze}
                loading={loading}
                disabled={!script.trim()}
                className="w-full sm:w-auto px-8"
              >
                Analyze Retention Score →
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
