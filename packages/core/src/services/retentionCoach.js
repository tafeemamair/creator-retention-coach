"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeRetention = analyzeRetention;
const profiles_1 = require("../analysis/profiles");
const language_1 = require("../analysis/language");
const engine_1 = require("../analysis/engine");
/**
 * Headless analysis service supporting lightweight preview or full diagnostic analysis.
 * Uses dependency-injected AIProvider for external AI generation with pure fallbacks.
 */
async function analyzeRetention(script, options, aiProvider) {
    const platform = options?.platform || "YouTube Shorts";
    const profile = (0, profiles_1.getPlatformProfile)(platform);
    // 1. Language Detection Foundation
    const detection = (0, language_1.detectLanguage)(script);
    const sourceLanguage = detection.language;
    const targetLanguage = options?.targetLanguage || sourceLanguage;
    const langCtx = { detectedLanguage: sourceLanguage, targetLanguage };
    const { metrics, dropoffPrediction } = (0, engine_1.metricScore)(script, platform, langCtx);
    const score = Math.round(metrics.hook * profile.weights.hook +
        metrics.pacing * profile.weights.pacing +
        metrics.emotion * profile.weights.emotion +
        metrics.value * profile.weights.value +
        metrics.cta * profile.weights.cta);
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
    let assets;
    let dropOffRisks;
    if (aiProvider) {
        const [providerAssets, providerRisks] = await Promise.all([
            aiProvider.generateRewrites({ script, platform, sourceLanguage, targetLanguage }),
            aiProvider.detectDropOffRisks({ script, platform, sourceLanguage, targetLanguage }),
        ]);
        assets = providerAssets;
        dropOffRisks = providerRisks;
    }
    else {
        assets = {
            rewrites: (0, engine_1.fallbackRewrites)(script, targetLanguage),
            titles: targetLanguage === "hi" || targetLanguage === "hi-Latn"
                ? ["आपका हुक व्यूज रोक रहा है", "Shorts के लिए 3-सेकंड का फॉर्मूला", "व्यूअर्स तुरंत क्यों छोड़ते हैं"]
                : targetLanguage === "es"
                    ? ["Tu gancho te está costando visitas", "El truco de 3 segundos para Shorts", "Por qué la audiencia abandona rápido"]
                    : ["Your Hook Is Costing You Views", "The 3-Second Fix For Shorts", "Why Viewers Drop Off Fast"],
        };
        dropOffRisks = (0, engine_1.fallbackDropOffRisks)(script, platform, sourceLanguage);
    }
    // Recalculate timeline with actual detected line risks for maximum fidelity
    const sentenceList = (0, engine_1.splitIntoSentences)(script);
    const duration = (0, engine_1.estimateDurationSeconds)(script);
    const refinedTimeline = (0, engine_1.generatePredictedTimeline)(sentenceList, metrics, duration, dropOffRisks);
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
