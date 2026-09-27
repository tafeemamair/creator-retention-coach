import { z } from "zod";
import {
  validateScript,
  executeCopilotAction,
  type Platform,
  type SupportedLanguage,
  type AIProvider,
} from "../../../core/src/index";

export const generateViralHooksSchema = {
  script: z
    .string()
    .min(50, "Script must be at least 50 characters")
    .max(100000, "Script exceeds maximum limit of 100,000 characters")
    .describe("The video script text (minimum 50 characters)"),
  platform: z
    .enum([
      "youtube_longform",
      "youtube_shorts",
      "reels",
      "tiktok",
      "linkedin_video",
      "x_video",
      "podcast",
    ])
    .describe("The target publishing platform"),
  language: z
    .enum(["en", "es", "fr", "de", "hi"])
    .optional()
    .describe("Optional ISO language code (auto-detected if omitted)"),
};

export async function handleGenerateViralHooks(
  args: {
    script: string;
    platform: Platform;
    language?: SupportedLanguage;
  },
  deps: { aiProvider: AIProvider }
) {
  const validation = validateScript(args.script);
  if (!validation.valid) {
    return {
      isError: true,
      content: [{ type: "text" as const, text: `Validation Error: ${validation.error}` }],
    };
  }

  try {
    const result = await executeCopilotAction(
      {
        script: args.script,
        platform: args.platform,
        targetLanguage: args.language,
      },
      "generate_hooks",
      deps.aiProvider
    );

    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  } catch (err: any) {
    return {
      isError: true,
      content: [{ type: "text" as const, text: `Copilot Error: ${err?.message || "Unknown error"}` }],
    };
  }
}
