import type { FullAnalysis, CopilotAction, CopilotActionItem } from "../types";
/**
 * Validates whether an incoming action string is a supported CopilotAction.
 */
export declare function isValidCopilotAction(action: unknown): action is CopilotAction;
/**
 * Replaces the opening hook (first sentence/line) of a script while preserving
 * subsequent paragraph breaks, formatting, and newlines.
 */
export declare function applyHookToScript(script: string, newHook: string): string;
/**
 * Replaces the concluding call-to-action (last sentence/line) of a script while
 * preserving preceding paragraph breaks, formatting, and newlines.
 */
export declare function applyCtaToScript(script: string, newCta: string): string;
/**
 * Deterministic multilingual fallback for hook generation when AI provider is unavailable.
 */
export declare function fallbackGenerateHooks(script: string, analysis: FullAnalysis, targetLanguage?: string): CopilotActionItem[];
/**
 * Deterministic multilingual fallback for CTA improvement when AI provider is unavailable.
 */
export declare function fallbackImproveCta(script: string, analysis: FullAnalysis, targetLanguage?: string): CopilotActionItem[];
