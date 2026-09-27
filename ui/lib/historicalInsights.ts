import type { SupabaseClient } from "@supabase/supabase-js";
import type { FullAnalysis, RetentionMetrics } from "./analyze";

export type MetricKey = "hook" | "pacing" | "emotion" | "value" | "cta";

export interface HistoricalAnalysisRecord {
  id: string;
  title: string;
  platform: string;
  overall_score: number;
  created_at: string;
  metrics?: RetentionMetrics;
  analysis_result?: Partial<FullAnalysis>;
}

export interface PlatformBenchmark {
  platform: string;
  count: number;
  averageScore: number;
  targetScore: number;
  status: "on_target" | "solid_baseline" | "needs_improvement";
  statusLabel: string;
  primaryWeightFocus: string;
}

export interface PlatformStat {
  platform: string;
  count: number;
  averageScore: number;
  benchmark?: PlatformBenchmark;
}

export interface HistoricalInsights {
  hasSufficientData: boolean;
  totalAnalyses: number;
  averageScore: number;
  scoreTrajectory: {
    direction: "improving" | "declining" | "stable";
    delta: number;
    latestScore: number;
    earliestScore: number;
    previousAverage: number;
  } | null;
  dominantWeakestMetric: {
    metric: MetricKey;
    label: string;
    frequencyPercent: number;
    count: number;
  } | null;
  metricWeaknessFrequency: Record<MetricKey, number>;
  topRecurringDropOffCause: {
    reason: string;
    count: number;
  } | null;
  platformBreakdown: PlatformStat[];
  message: string;
}

const METRIC_LABELS: Record<MetricKey, string> = {
  hook: "Hook & Opening",
  pacing: "Pacing & Spoken Cadence",
  emotion: "Emotional Resonance",
  value: "Value Delivery",
  cta: "Call to Action",
};

/**
 * Normalizes drop-off diagnostic text into a clean aggregated pattern cluster.
 */
function normalizeReasonPattern(reason: string): string {
  const clean = reason.trim().toLowerCase();
  if (clean.includes("hook") || clean.includes("curiosity") || clean.includes("opening")) {
    return "Weak opening hook / delayed curiosity payoff";
  }
  if (clean.includes("sentence") || clean.includes("dense") || clean.includes("long") || clean.includes("words")) {
    return "Overly dense sentence length slowing momentum";
  }
  if (clean.includes("no new information") || clean.includes("restate") || clean.includes("repetition")) {
    return "Idea repetition / lack of new information";
  }
  if (clean.includes("filler") || clean.includes("preamble") || clean.includes("conversational")) {
    return "Conversational filler delaying core takeaway";
  }
  if (clean.includes("emotion") || clean.includes("stakes") || clean.includes("friction")) {
    return "Flat emotional stakes / missing tension";
  }
  if (clean.includes("cta") || clean.includes("call to action")) {
    return "Missing or weak concluding action prompt";
  }
  return reason.substring(0, 70);
}

/**
 * Evaluates creator performance against application-defined platform targets.
 * Strict Phase 2 contract:
 * - 0 external statistics invented
 * - Uses only existing PLATFORM_PROFILES / application retention thresholds
 * - Evaluates performance status: On Target (>=80), Solid Baseline (65-79), Needs Improvement (<65)
 */
export function evaluatePlatformBenchmark(
  platform: string,
  averageScore: number,
  count: number
): PlatformBenchmark {
  const targetScore = 75;
  let status: "on_target" | "solid_baseline" | "needs_improvement" = "solid_baseline";
  let statusLabel = "Solid Baseline";

  if (averageScore >= 80) {
    status = "on_target";
    statusLabel = "On Target";
  } else if (averageScore < 65) {
    status = "needs_improvement";
    statusLabel = "Needs Improvement";
  }

  let primaryWeightFocus = "Hook & Pacing";
  if (platform === "TikTok") {
    primaryWeightFocus = "Hook (35%) & Pacing (30%)";
  } else if (platform === "YouTube Shorts") {
    primaryWeightFocus = "Hook (30%) & Value (20%)";
  } else if (platform === "Instagram Reels") {
    primaryWeightFocus = "Emotion (25%) & Shareability";
  }

  return {
    platform,
    count,
    averageScore,
    targetScore,
    status,
    statusLabel,
    primaryWeightFocus,
  };
}

/**
 * Pure, deterministic utility that calculates historical retention insights
 * across a bounded set of analyses belonging to a single creator.
 *
 * Hard Guarantees:
 * - 0 credits consumed
 * - 0 external/OpenAI calls
 * - Never fabricates trends if analyses < 2
 * - Strictly isolated to provided records
 */
export function deriveHistoricalInsights(
  analyses: HistoricalAnalysisRecord[]
): HistoricalInsights {
  if (!Array.isArray(analyses) || analyses.length === 0) {
    return {
      hasSufficientData: false,
      totalAnalyses: 0,
      averageScore: 0,
      scoreTrajectory: null,
      dominantWeakestMetric: null,
      metricWeaknessFrequency: { hook: 0, pacing: 0, emotion: 0, value: 0, cta: 0 },
      topRecurringDropOffCause: null,
      platformBreakdown: [],
      message: "No analyses found. Analyze your first script to unlock creator retention analytics.",
    };
  }

  const count = analyses.length;
  const totalScore = analyses.reduce((acc, curr) => acc + (curr.overall_score || 0), 0);
  const averageScore = Math.round(totalScore / count);

  // If fewer than 2 analyses, return insufficient history state
  if (count < 2) {
    const singlePlatform = analyses[0].platform || "YouTube Shorts";
    const singleScore = analyses[0].overall_score || 0;
    return {
      hasSufficientData: false,
      totalAnalyses: 1,
      averageScore,
      scoreTrajectory: null,
      dominantWeakestMetric: null,
      metricWeaknessFrequency: { hook: 0, pacing: 0, emotion: 0, value: 0, cta: 0 },
      topRecurringDropOffCause: null,
      platformBreakdown: [
        {
          platform: singlePlatform,
          count: 1,
          averageScore: singleScore,
          benchmark: evaluatePlatformBenchmark(singlePlatform, singleScore, 1),
        },
      ],
      message: "Analyze at least 2 scripts to unlock historical trends, weakness patterns, and score trajectory.",
    };
  }

  // Analyses are expected in descending chronological order (newest first)
  // Sort chronologically if created_at is available
  const sortedDesc = [...analyses].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const latest = sortedDesc[0];
  const earliest = sortedDesc[sortedDesc.length - 1];
  const previousSubset = sortedDesc.slice(1);
  const previousAvg = Math.round(
    previousSubset.reduce((sum, item) => sum + (item.overall_score || 0), 0) / previousSubset.length
  );

  const delta = (latest.overall_score || 0) - (earliest.overall_score || 0);
  let direction: "improving" | "declining" | "stable" = "stable";
  if (delta > 2) {
    direction = "improving";
  } else if (delta < -2) {
    direction = "declining";
  }

  // 1. Weakest Metric Frequency Calculation
  const weaknessFreq: Record<MetricKey, number> = {
    hook: 0,
    pacing: 0,
    emotion: 0,
    value: 0,
    cta: 0,
  };

  let validMetricCount = 0;
  const reasonCounts = new Map<string, number>();

  for (const record of sortedDesc) {
    const rawMetrics: RetentionMetrics | undefined =
      record.metrics || (record.analysis_result?.metrics as RetentionMetrics | undefined);

    if (rawMetrics && typeof rawMetrics === "object") {
      validMetricCount++;
      const metricEntries: Array<[MetricKey, number]> = [
        ["hook", Number(rawMetrics.hook) || 0],
        ["pacing", Number(rawMetrics.pacing) || 0],
        ["emotion", Number(rawMetrics.emotion) || 0],
        ["value", Number(rawMetrics.value) || 0],
        ["cta", Number(rawMetrics.cta) || 0],
      ];

      metricEntries.sort((a, b) => a[1] - b[1]);
      const weakest = metricEntries[0][0];
      weaknessFreq[weakest] = (weaknessFreq[weakest] || 0) + 1;
    }

    // Aggregate dropoff causes
    const dropoffReason = record.analysis_result?.dropoffPrediction?.reason;
    if (dropoffReason) {
      const normalized = normalizeReasonPattern(dropoffReason);
      reasonCounts.set(normalized, (reasonCounts.get(normalized) || 0) + 1);
    }

    const risks = record.analysis_result?.dropOffRisks;
    if (Array.isArray(risks)) {
      for (const r of risks) {
        if (r.risk === "High" && r.reason) {
          const normalized = normalizeReasonPattern(r.reason);
          reasonCounts.set(normalized, (reasonCounts.get(normalized) || 0) + 1);
        }
      }
    }
  }

  // Find dominant weakest metric
  let dominantMetric: MetricKey | null = null;
  let maxWeakCount = 0;

  for (const [key, cnt] of Object.entries(weaknessFreq) as Array<[MetricKey, number]>) {
    if (cnt > maxWeakCount) {
      maxWeakCount = cnt;
      dominantMetric = key;
    }
  }

  const dominantWeakestMetric =
    dominantMetric && maxWeakCount > 0 && validMetricCount > 0
      ? {
          metric: dominantMetric,
          label: METRIC_LABELS[dominantMetric],
          frequencyPercent: Math.round((maxWeakCount / validMetricCount) * 100),
          count: maxWeakCount,
        }
      : null;

  // Find top recurring drop-off cause
  let topReason: string | null = null;
  let maxReasonCount = 0;

  for (const [reason, cnt] of reasonCounts.entries()) {
    if (cnt > maxReasonCount) {
      maxReasonCount = cnt;
      topReason = reason;
    }
  }

  const topRecurringDropOffCause =
    topReason && maxReasonCount >= 2
      ? {
          reason: topReason,
          count: maxReasonCount,
        }
      : null;

  // Platform breakdown
  const platformMap = new Map<string, { total: number; count: number }>();
  for (const a of sortedDesc) {
    const p = a.platform || "YouTube Shorts";
    const cur = platformMap.get(p) || { total: 0, count: 0 };
    cur.total += a.overall_score || 0;
    cur.count += 1;
    platformMap.set(p, cur);
  }

  const platformBreakdown: PlatformStat[] = Array.from(platformMap.entries()).map(([p, data]) => {
    const avg = Math.round(data.total / data.count);
    return {
      platform: p,
      count: data.count,
      averageScore: avg,
      benchmark: evaluatePlatformBenchmark(p, avg, data.count),
    };
  });

  return {
    hasSufficientData: true,
    totalAnalyses: count,
    averageScore,
    scoreTrajectory: {
      direction,
      delta,
      latestScore: latest.overall_score || 0,
      earliestScore: earliest.overall_score || 0,
      previousAverage: previousAvg,
    },
    dominantWeakestMetric,
    metricWeaknessFrequency: weaknessFreq,
    topRecurringDropOffCause,
    platformBreakdown,
    message: `Aggregated ${count} recent analyses.`,
  };
}

/**
 * Server-side helper to fetch and derive creator historical insights.
 * Strict multi-tenant isolation: query is hard-bound to `user_id = userId`.
 */
export async function fetchCreatorHistoricalInsights(
  admin: SupabaseClient | null,
  userId: string,
  limit = 15
): Promise<HistoricalInsights> {
  if (!admin || !userId) {
    return deriveHistoricalInsights([]);
  }

  const { data, error } = await admin
    .from("analyses")
    .select("id, title, platform, overall_score, created_at, analysis_result")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(Math.min(20, Math.max(2, limit)));

  if (error || !data) {
    console.warn("Failed to fetch historical analyses for user:", userId, error);
    return deriveHistoricalInsights([]);
  }

  return deriveHistoricalInsights(data as HistoricalAnalysisRecord[]);
}
