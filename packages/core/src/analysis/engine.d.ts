import type { DropOffRisk, RetentionMetrics, DropoffPrediction, RewriteVersion } from "../types";
export interface SentimentAnalyzer {
    analyze(text: string): {
        score: number;
    };
}
export declare function setSentimentAnalyzer(analyzer: SentimentAnalyzer): void;
export declare function getSentimentScore(text: string): number;
/**
 * Tokenize a text string into non-empty words.
 */
export declare function words(text: string): string[];
/**
 * Robust sentence segmentation for spoken scripts across multiple languages.
 * Handles:
 * - Single paragraphs with standard punctuation (. ! ? …)
 * - Devanagari danda (।)
 * - Spanish inverted punctuation (¡ ¿)
 * - Multiline scripts
 * - Repeated punctuation (e.g. "Wait... what?!")
 * - Dialogue indicators and quotations
 * - Multiple spaces and empty segments
 */
export declare function splitIntoSentences(text: string): string[];
/**
 * Estimates spoken duration in seconds at a natural spoken cadence (~160 words per minute / 2.67 words/sec).
 */
export declare function estimateDurationSeconds(script: string): number;
/**
 * Formats script into clean, readable sentence lines.
 */
export declare function toSentenceLines(input: string, maxWords?: number): string;
export declare function fallbackRewrites(script: string, targetLanguage?: string): RewriteVersion[];
/**
 * Fallback heuristic detector for drop-off risks per sentence unit.
 */
export declare function fallbackDropOffRisks(script: string, platform?: string, sourceLanguage?: string): DropOffRisk[];
/**
 * Calculates deterministic analytical metrics and drop-off prediction from the script.
 * Preserves structural pacing across all languages and adapts sentiment/keyword scoring.
 */
export declare function metricScore(script: string, platform?: string, languageContext?: {
    detectedLanguage: string;
    targetLanguage: string;
}): {
    metrics: RetentionMetrics;
    dropoffPrediction: DropoffPrediction;
    timeline: Array<{
        second: number;
        retention: number;
    }>;
};
/**
 * Generates an authentic, deterministic predicted retention curve based on sentence durations and risk levels.
 */
export declare function generatePredictedTimeline(sentences: string[], metrics: RetentionMetrics, totalDurationSeconds: number, risks?: DropOffRisk[]): Array<{
    second: number;
    retention: number;
}>;
