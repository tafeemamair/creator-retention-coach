import { z } from "zod";
import {
  validateScript,
  detectLanguage,
  estimateDurationSeconds,
  metricScore,
  fallbackDropOffRisks,
  fallbackRewrites,
  generateActionPlan,
  getPlatformProfile,
  type Platform,
  type SupportedLanguage,
} from "../../../core/src/index";

export const getCreatorActionPlanSchema = {
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

export async function handleGetCreatorActionPlan(args: {
  script: string;
  platform: Platform;
  language?: SupportedLanguage;
}) {
  const validation = validateScript(args.script);
  if (!validation.valid) {
    return {
      isError: true,
      content: [{ type: "text" as const, text: `Validation Error: ${validation.error}` }],
    };
  }

  const detected = detectLanguage(args.script);
  const detectedLang = args.language || detected.language;
  const profile = getPlatformProfile(args.platform);
  const { metrics } = metricScore(args.script, args.platform, {
    detectedLanguage: detectedLang,
    targetLanguage: detectedLang,
  });
  const overallScore = Math.round(
    metrics.hook * profile.weights.hook +
    metrics.pacing * profile.weights.pacing +
    metrics.emotion * profile.weights.emotion +
    metrics.value * profile.weights.value +
    metrics.cta * profile.weights.cta
  );
  const risks = fallbackDropOffRisks(args.script, metrics);
  const rewrites = fallbackRewrites(args.script, detectedLang);

  const actionPlan = generateActionPlan({
    overallScore,
    metrics,
    risks,
    rewrites,
    language: detectedLang,
  });

  return {
    content: [{ type: "text" as const, text: JSON.stringify(actionPlan, null, 2) }],
  };
}
