import type { CopilotContext, CopilotAction, CopilotResult } from "../types";
import { detectLanguage } from "../analysis/language";
import { fallbackGenerateHooks, fallbackImproveCta } from "../copilot/engine";
import type { AIProvider } from "../interfaces/aiProvider";

export async function executeCopilotAction(
  context: CopilotContext,
  action: CopilotAction,
  aiProvider?: AIProvider
): Promise<CopilotResult> {
  const detected = context.detectedLanguage || detectLanguage(context.script).language;
  const targetLanguage = context.targetLanguage || detected;

  if (aiProvider?.executeCopilotAction) {
    return aiProvider.executeCopilotAction(context, action);
  }

  if (action === "generate_hooks") {
    return {
      action,
      targetLanguage,
      items: fallbackGenerateHooks(context.script, context.analysis, targetLanguage),
    };
  }

  return {
    action,
    targetLanguage,
    items: fallbackImproveCta(context.script, context.analysis, targetLanguage),
  };
}
