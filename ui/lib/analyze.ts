import Sentiment from "sentiment";
import type {
  Platform,
  RetentionMetrics,
  DropoffPrediction,
  DropOffRisk,
  RewriteVersion,
  FullAnalysis,
  PreviewAnalysis,
  PlatformProfile,
} from "../../packages/core/src";
import {
  PLATFORM_PROFILES,
  getPlatformProfile,
  words,
  splitIntoSentences,
  estimateDurationSeconds,
  fallbackDropOffRisks,
  metricScore,
  generatePredictedTimeline,
  setSentimentAnalyzer,
  analyzeRetention as coreAnalyzeRetention,
} from "../../packages/core/src";
import { OpenAIProvider } from "../../packages/infra/src";

setSentimentAnalyzer(new Sentiment());

export type {
  Platform,
  RetentionMetrics,
  DropoffPrediction,
  DropOffRisk,
  RewriteVersion,
  FullAnalysis,
  PreviewAnalysis,
  PlatformProfile,
};

export {
  PLATFORM_PROFILES,
  getPlatformProfile,
  words,
  splitIntoSentences,
  estimateDurationSeconds,
  fallbackDropOffRisks,
  metricScore,
  generatePredictedTimeline,
};

const defaultProvider = new OpenAIProvider();

export async function analyzeRetention(
  script: string,
  options?: { full?: boolean; platform?: string; targetLanguage?: string }
): Promise<PreviewAnalysis | FullAnalysis> {
  return coreAnalyzeRetention(script, options, defaultProvider);
}
