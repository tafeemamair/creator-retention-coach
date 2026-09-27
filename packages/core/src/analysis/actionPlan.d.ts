import type { FullAnalysis, PostAnalysisActionPlan, ActionCategory } from "../types";
export declare const CATEGORY_LABELS: Record<ActionCategory, string>;
/**
 * Pure, deterministic utility that generates a structured creator action plan
 * from an existing FullAnalysis result.
 *
 * Guarantees:
 * - 0 credits consumed
 * - 0 OpenAI API calls
 * - 0 mutations to input analysis
 * - 100% deterministic outputs across repeated calls
 */
export declare function generateActionPlan(analysis: FullAnalysis): PostAnalysisActionPlan;
