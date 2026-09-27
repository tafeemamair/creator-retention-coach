import type { LanguageDetectionResult } from "../types";
/**
 * Deterministically analyzes script character sets and token frequencies
 * to detect writing system and natural language without external network calls.
 */
export declare function detectLanguage(script: string): LanguageDetectionResult;
