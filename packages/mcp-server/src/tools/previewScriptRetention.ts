import { z } from "zod";
import {
  validateScript,
  detectLanguage,
  words,
  estimateDurationSeconds,
  metricScore,
  getPlatformProfile,
  type Platform,
  type SupportedLanguage,
} from "../../../core/src/index";

export const previewScriptRetentionSchema = {
  script: z
    .string()
    .min(50, "Script must be at least 50 characters")
    .max(100000, "Script exceeds maximum limit of 100,000 characters")
    .describe("The video script text to analyze (minimum 50 characters)"),
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

export async function handlePreviewScriptRetention(args: {
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
  const wordCount = words(args.script).length;
  const durationSeconds = estimateDurationSeconds(args.script);
  const profile = getPlatformProfile(args.platform);
  const { metrics, dropoffPrediction, timeline } = metricScore(args.script, args.platform, {
    detectedLanguage: detectedLang,
    targetLanguage: detectedLang,
  });

  const previewScore = Math.round(
    metrics.hook * profile.weights.hook +
    metrics.pacing * profile.weights.pacing +
    metrics.emotion * profile.weights.emotion +
    metrics.value * profile.weights.value +
    metrics.cta * profile.weights.cta
  );

  const preview = {
    valid: true,
    previewScore,
    wordCount,
    durationSeconds,
    platform: args.platform,
    language: detectedLang,
    metrics,
    dropoffPrediction,
    timeline,
    summary: `Retention Preview: ${previewScore}/100 score for ${args.platform}. Hook: ${metrics.hook}/100, Pacing: ${metrics.pacing}/100, CTA: ${metrics.cta}/100.`,
  };

  return {
    content: [{ type: "text" as const, text: JSON.stringify(preview, null, 2) }],
  };
}
