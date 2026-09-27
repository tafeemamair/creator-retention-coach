import type { DropOffRisk, RewriteVersion, CopilotAction, CopilotResult, CopilotContext } from "../types";

export interface DropOffRiskInput {
  script: string;
  platform?: string;
  sourceLanguage?: string;
  targetLanguage?: string;
}

export interface RewriteInput {
  script: string;
  platform?: string;
  sourceLanguage?: string;
  targetLanguage?: string;
}

export interface RewriteOutput {
  rewrites: RewriteVersion[];
  titles: string[];
}

export interface AIProvider {
  detectDropOffRisks(input: DropOffRiskInput): Promise<DropOffRisk[]>;
  generateRewrites(input: RewriteInput): Promise<RewriteOutput>;
  executeCopilotAction?(context: CopilotContext, action: CopilotAction): Promise<CopilotResult>;
}
