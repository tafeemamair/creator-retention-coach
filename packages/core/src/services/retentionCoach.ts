import type { FullAnalysis, PreviewAnalysis, LanguageDetectionResult, DropOffRisk, RewriteVersion } from "../types";
import { getPlatformProfile } from "../analysis/profiles";
import { detectLanguage } from "../analysis/language";
import {
  metricScore,
  splitIntoSentences,
  estimateDurationSeconds,
  generatePredictedTimeline,
  fallbackRewrites,
  fallbackDropOffRisks,
} from "../analysis/engine";
import type { AIProvider } from "../interfaces/aiProvider";

export interface AnalyzeRetentionOptions {
  full?: boolean;
  platform?: string;
  targetLanguage?: string;
}

/**
 * Headless analysis service supporting lightweight preview or full diagnostic analysis.
 * Uses dependency-injected AIProvider for external AI generation with pure fallbacks.
 */
export async function analyzeRetention(
  script: string,
  options?: AnalyzeRetentionOptions,
  aiProvider?: AIProvider
): Promise<PreviewAnalysis | FullAnalysis> {
  const platform = options?.platform || "YouTube Shorts";
  const profile = getPlatformProfile(platform);

  // 1. Language Detection Foundation
  const detection: LanguageDetectionResult = detectLanguage(script);
  const sourceLanguage = detection.language;
  const targetLanguage = options?.targetLanguage || sourceLanguage;
  const langCtx = { detectedLanguage: sourceLanguage, targetLanguage };

  const { metrics, dropoffPrediction } = metricScore(script, platform, langCtx);

  const score = Math.round(
    metrics.hook * profile.weights.hook +
    metrics.pacing * profile.weights.pacing +
    metrics.emotion * profile.weights.emotion +
    metrics.value * profile.weights.value +
    metrics.cta * profile.weights.cta
  );

  if (!options?.full) {
    return {
      score,
      metrics,
      dropoffPrediction,
      detectedLanguage: sourceLanguage,
      targetLanguage,
      languageConfidence: detection.confidence,
    };
  }

  let assets: { rewrites: RewriteVersion[]; titles: string[] };
  let dropOffRisks: DropOffRisk[];

  if (aiProvider) {
    const [providerAssets, providerRisks] = await Promise.all([
      aiProvider.generateRewrites({ script, platform, sourceLanguage, targetLanguage }),
      aiProvider.detectDropOffRisks({ script, platform, sourceLanguage, targetLanguage }),
    ]);
    assets = providerAssets;
    dropOffRisks = providerRisks;
  } else {
    assets = {
      rewrites: fallbackRewrites(script, targetLanguage),
      titles:
        targetLanguage === "hi" || targetLanguage === "hi-Latn"
          ? ["आपका हुक व्यूज रोक रहा है", "Shorts के लिए 3-सेकंड का फॉर्मूला", "व्यूअर्स तुरंत क्यों छोड़ते हैं"]
          : targetLanguage === "es"
          ? ["Tu gancho te está costando visitas", "El truco de 3 segundos para Shorts", "Por qué la audiencia abandona rápido"]
          : ["Your Hook Is Costing You Views", "The 3-Second Fix For Shorts", "Why Viewers Drop Off Fast"],
    };
    dropOffRisks = fallbackDropOffRisks(script, platform, sourceLanguage);
  }

  // Recalculate timeline with actual detected line risks for maximum fidelity
  const sentenceList = splitIntoSentences(script);
  const duration = estimateDurationSeconds(script);
  const refinedTimeline = generatePredictedTimeline(sentenceList, metrics, duration, dropOffRisks);

  return {
    score,
    metrics,
    dropoffPrediction,
    dropOffRisks,
    retentionTimeline: refinedTimeline,
    rewrites: assets.rewrites,
    improvedScript: assets.rewrites[0]?.script ?? "",
    viralTitleSuggestions: assets.titles.length
      ? assets.titles
      : targetLanguage === "hi" || targetLanguage === "hi-Latn"
      ? ["आपका हुक व्यूज रोक रहा है", "Shorts के लिए 3-सेकंड का फॉर्मूला", "व्यूअर्स तुरंत क्यों छोड़ते हैं"]
      : targetLanguage === "es"
      ? ["Tu gancho te está costando visitas", "El truco de 3 segundos para Shorts", "Por qué la audiencia abandona rápido"]
      : ["Your Hook Is Costing You Views", "The 3-Second Fix For Shorts", "Why Viewers Drop Off Fast"],
    detectedLanguage: sourceLanguage,
    targetLanguage,
    languageConfidence: detection.confidence,
  };
}
