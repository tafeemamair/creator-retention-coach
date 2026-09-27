import type { CopilotContext, CopilotAction, CopilotResult } from "../types";
import type { AIProvider } from "../interfaces/aiProvider";
export declare function executeCopilotAction(context: CopilotContext, action: CopilotAction, aiProvider?: AIProvider): Promise<CopilotResult>;
