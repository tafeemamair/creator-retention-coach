import type { FullAnalysis, PreviewAnalysis } from "../types";
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
export declare function analyzeRetention(script: string, options?: AnalyzeRetentionOptions, aiProvider?: AIProvider): Promise<PreviewAnalysis | FullAnalysis>;
