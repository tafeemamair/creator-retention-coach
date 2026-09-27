import type { FullAnalysis, Platform } from "../types";
/**
 * Formats a FullAnalysis object into a clean, structured Markdown retention audit report.
 * Safe against empty or undefined optional fields.
 */
export declare function formatFullAuditToMarkdown(analysis: FullAnalysis, script?: string, platform?: Platform): string;
