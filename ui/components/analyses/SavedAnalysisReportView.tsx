"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AnalysisDashboardView from "@/components/results/AnalysisDashboardView";
import { PublicationOutcomeSection, type PublicationOutcomeData } from "./PublicationOutcomeSection";
import type { FullAnalysis, Platform } from "@/lib/analyze";
import type { PricingPlan } from "@/components/pricing/PricingSelector";

interface SavedAnalysisReportViewProps {
  analysisId?: string;
  initialAnalysis: FullAnalysis;
  initialScript: string;
  initialPlatform: Platform;
  parentAnalysisId?: string | null;
  parentTitle?: string | null;
  initialOutcome?: PublicationOutcomeData | null;
}

export default function SavedAnalysisReportView({
  analysisId,
  initialAnalysis,
  initialScript,
  initialPlatform,
  parentAnalysisId,
  parentTitle,
  initialOutcome,
}: SavedAnalysisReportViewProps) {
  const router = useRouter();
  const [analysis, setAnalysis] = useState<FullAnalysis>(initialAnalysis);
  const [originalScript, setOriginalScript] = useState<string>(initialScript);
  const [script, setScript] = useState<string>(initialScript);
  const [platform, setPlatform] = useState<Platform>(initialPlatform);
  const [loadingReAnalyze, setLoadingReAnalyze] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PricingPlan>("pack5");

  // Entitlement & Credits State
  const [creditsRemaining, setCreditsRemaining] = useState<number | null>(null);
  const [totalCredits, setTotalCredits] = useState<number | null>(null);
  const [currentPlan, setCurrentPlan] = useState<PricingPlan | null>(null);
  const [error, setError] = useState("");

  // Fetch active entitlement on mount to hydrate credit balance
  const fetchEntitlement = async () => {
    try {
      const res = await fetch("/api/entitlement");
      if (res.ok) {
        const data = await res.json();
        if (data.entitled && typeof data.creditsRemaining === "number") {
          setCreditsRemaining(data.creditsRemaining);
          if (typeof data.totalCredits === "number") setTotalCredits(data.totalCredits);
          if (data.plan === "single" || data.plan === "pack5") setCurrentPlan(data.plan);
        } else {
          if (typeof data.creditsRemaining === "number") {
            setCreditsRemaining(data.creditsRemaining);
          }
          if (typeof data.totalCredits === "number") {
            setTotalCredits(data.totalCredits);
          }
        }
      }
    } catch (err) {
      console.warn("Entitlement check failed on saved analysis view:", err);
    }
  };

  useEffect(() => {
    fetchEntitlement();
  }, []);

  const handleReAnalyze = async () => {
    setLoadingReAnalyze(true);
    setError("");

    try {
      const res = await fetch("/api/analyze-full", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          script: script.trim(),
          platform,
          parentId: parentAnalysisId || analysisId || undefined,
        }),
      });

      if (res.status === 402) {
        const errorData = await res.json().catch(() => ({}));
        setCreditsRemaining(0);
        setError(
          errorData.message ||
            "You have used your available analysis credits. Choose a plan to continue."
        );
        return;
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(
          errorData.message || errorData.error || "Failed to re-analyze script."
        );
      }

      const data = await res.json();
      if (data.analysis) {
        setAnalysis(data.analysis);
        setOriginalScript(script.trim());
      }
      if (typeof data.creditsRemaining === "number") {
        setCreditsRemaining(data.creditsRemaining);
      }
      if (typeof data.totalCredits === "number") {
        setTotalCredits(data.totalCredits);
      }
      if (data.plan === "single" || data.plan === "pack5") {
        setCurrentPlan(data.plan);
      }
      setError("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Re-analysis failed.");
      console.error("Re-analyze error:", err);
    } finally {
      setLoadingReAnalyze(false);
    }
  };

  const handleNewAnalysis = () => {
    router.push("/app/analyze");
  };

  const handleResetDraft = () => {
    setScript(originalScript);
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center justify-between">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError("")}
            className="text-rose-400 hover:text-white cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      <AnalysisDashboardView
        analysis={analysis}
        script={script}
        setScript={setScript}
        originalScript={originalScript}
        onResetDraft={handleResetDraft}
        platform={platform}
        setPlatform={setPlatform}
        onReAnalyze={handleReAnalyze}
        onNewAnalysis={handleNewAnalysis}
        loadingReAnalyze={loadingReAnalyze}
        creditsRemaining={creditsRemaining}
        totalCredits={totalCredits}
        currentPlan={currentPlan}
        isFreeAnalysis={false}
        selectedPlan={selectedPlan}
        setSelectedPlan={setSelectedPlan}
        onUnlock={() => {
          const el = document.getElementById("pricing-selector-container");
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
          } else {
            router.push("/app/analyze#pricing");
          }
        }}
        loadingUnlock={false}
        analysisId={analysisId}
        isRevision={Boolean(parentAnalysisId)}
      />

      {/* Manual Publication & Outcome Recording Section */}
      {analysisId && (
        <PublicationOutcomeSection
          analysisId={analysisId}
          predictedScore={analysis.score}
          initialOutcome={initialOutcome}
        />
      )}
    </div>
  );
}
