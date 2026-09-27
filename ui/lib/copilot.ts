import type {
  CopilotAction,
  CopilotActionItem,
  CopilotResult,
  CopilotContext,
} from "../../packages/core/src";
import {
  isValidCopilotAction,
  fallbackGenerateHooks,
  fallbackImproveCta,
  applyHookToScript,
  applyCtaToScript,
  executeCopilotAction as executeCoreCopilotAction,
} from "../../packages/core/src";
import { OpenAIProvider } from "../../packages/infra/src";

export type {
  CopilotAction,
  CopilotActionItem,
  CopilotResult,
  CopilotContext,
};

export {
  isValidCopilotAction,
  fallbackGenerateHooks,
  fallbackImproveCta,
  applyHookToScript,
  applyCtaToScript,
};

const defaultProvider = new OpenAIProvider();

export async function executeCopilotAction(
  context: CopilotContext,
  action: CopilotAction
): Promise<CopilotResult> {
  return executeCoreCopilotAction(context, action, defaultProvider);
}
