import type { FullAnalysis, RetentionMetrics } from "./analyze";
import { words } from "./analyze";

export interface AnalysisRecordInput {
  id: string;
  title: string;
  script: string;
  platform: string;
  overall_score: number;
  created_at: string;
  analysis_result?: Partial<FullAnalysis> | null;
  parent_analysis_id?: string | null;
}

export interface MetricDeltaItem {
  key: keyof RetentionMetrics;
  label: string;
  scoreA: number;
  scoreB: number;
  delta: number;
  status: "improved" | "declined" | "unchanged";
}

export interface TimelineDeltaPoint {
  second: number;
  retentionA: number;
  retentionB: number;
  delta: number;
}

export interface ComparisonSummary {
  headline: string;
  overallScoreDelta: number;
  overallStatus: "improved" | "declined" | "unchanged";
  strongestImprovement: { label: string; delta: number } | null;
  biggestDecline: { label: string; delta: number } | null;
  keyObservations: string[];
  lineageContext?: "revision" | "parent" | "unrelated";
}

export interface ScriptComparisonResult {
  scriptA: {
    id: string;
    title: string;
    script: string;
    platform: string;
    overallScore: number;
    createdAt: string;
    wordCount: number;
    metrics: RetentionMetrics;
  };
  scriptB: {
    id: string;
    title: string;
    script: string;
    platform: string;
    overallScore: number;
    createdAt: string;
    wordCount: number;
    metrics: RetentionMetrics;
  };
  scoreDelta: number;
  overallStatus: "improved" | "declined" | "unchanged";
  metricDeltas: Record<keyof RetentionMetrics, MetricDeltaItem>;
  timelineComparison: TimelineDeltaPoint[];
  summary: ComparisonSummary;
}

const METRIC_LABELS: Record<keyof RetentionMetrics, string> = {
  hook: "Hook & Opening",
  pacing: "Pacing & Cadence",
  emotion: "Emotional Resonance",
  value: "Value Delivery",
  cta: "Call to Action",
};

/**
 * Pure, deterministic comparison engine comparing two saved analyses.
 *
 * Hard Guarantees:
 * - 0 credits consumed
 * - 0 AI calls
 * - 0 mutations
 * - 100% deterministic output
 */
export function compareScriptAnalyses(
  recordA: AnalysisRecordInput,
  recordB: AnalysisRecordInput
): ScriptComparisonResult {
  const metricsA: RetentionMetrics = {
    hook: Number(recordA.analysis_result?.metrics?.hook ?? 50),
    pacing: Number(recordA.analysis_result?.metrics?.pacing ?? 50),
    emotion: Number(recordA.analysis_result?.metrics?.emotion ?? 50),
    value: Number(recordA.analysis_result?.metrics?.value ?? 50),
    cta: Number(recordA.analysis_result?.metrics?.cta ?? 50),
  };

  const metricsB: RetentionMetrics = {
    hook: Number(recordB.analysis_result?.metrics?.hook ?? 50),
    pacing: Number(recordB.analysis_result?.metrics?.pacing ?? 50),
    emotion: Number(recordB.analysis_result?.metrics?.emotion ?? 50),
    value: Number(recordB.analysis_result?.metrics?.value ?? 50),
    cta: Number(recordB.analysis_result?.metrics?.cta ?? 50),
  };

  const scoreA = Number(recordA.overall_score ?? 0);
  const scoreB = Number(recordB.overall_score ?? 0);
  const scoreDelta = scoreB - scoreA;

  let overallStatus: "improved" | "declined" | "unchanged" = "unchanged";
  if (scoreDelta > 0) overallStatus = "improved";
  else if (scoreDelta < 0) overallStatus = "declined";

  // Compute metric deltas
  const metricKeys: Array<keyof RetentionMetrics> = ["hook", "pacing", "emotion", "value", "cta"];
  const metricDeltas: Record<keyof RetentionMetrics, MetricDeltaItem> = {} as any;

  let maxGain = 0;
  let strongestImprovement: { label: string; delta: number } | null = null;
  let maxLoss = 0;
  let biggestDecline: { label: string; delta: number } | null = null;

  for (const key of metricKeys) {
    const valA = metricsA[key];
    const valB = metricsB[key];
    const delta = valB - valA;
    let status: "improved" | "declined" | "unchanged" = "unchanged";
    if (delta > 0) {
      status = "improved";
      if (delta > maxGain) {
        maxGain = delta;
        strongestImprovement = { label: METRIC_LABELS[key], delta };
      }
    } else if (delta < 0) {
      status = "declined";
      if (Math.abs(delta) > maxLoss) {
        maxLoss = Math.abs(delta);
        biggestDecline = { label: METRIC_LABELS[key], delta };
      }
    }

    metricDeltas[key] = {
      key,
      label: METRIC_LABELS[key],
      scoreA: valA,
      scoreB: valB,
      delta,
      status,
    };
  }

  // Compute timeline comparison
  const timelineA = recordA.analysis_result?.retentionTimeline || [];
  const timelineB = recordB.analysis_result?.retentionTimeline || [];

  const mapA = new Map<number, number>();
  for (const pt of timelineA) {
    if (typeof pt.second === "number" && typeof pt.retention === "number") {
      mapA.set(pt.second, pt.retention);
    }
  }

  const mapB = new Map<number, number>();
  for (const pt of timelineB) {
    if (typeof pt.second === "number" && typeof pt.retention === "number") {
      mapB.set(pt.second, pt.retention);
    }
  }

  const allSeconds = Array.from(new Set([...mapA.keys(), ...mapB.keys()])).sort((a, b) => a - b);
  const timelineComparison: TimelineDeltaPoint[] = [];

  for (const sec of allSeconds) {
    const retA = mapA.get(sec) ?? 0;
    const retB = mapB.get(sec) ?? 0;
    timelineComparison.push({
      second: sec,
      retentionA: retA,
      retentionB: retB,
      delta: retB - retA,
    });
  }

  // Generate deterministic observations
  const keyObservations: string[] = [];
  if (scoreDelta > 0) {
    keyObservations.push(`Overall retention increased by +${scoreDelta} points (${scoreA} → ${scoreB}).`);
  } else if (scoreDelta < 0) {
    keyObservations.push(`Overall retention declined by ${scoreDelta} points (${scoreA} → ${scoreB}).`);
  } else {
    keyObservations.push(`Overall retention remained unchanged at ${scoreA}/100.`);
  }

  if (strongestImprovement) {
    keyObservations.push(
      `Strongest gain: ${strongestImprovement.label} gained +${strongestImprovement.delta} points.`
    );
  }

  if (biggestDecline) {
    keyObservations.push(
      `Primary drop: ${biggestDecline.label} decreased by ${biggestDecline.delta} points.`
    );
  }

  const wordCountA = words(recordA.script || "").length;
  const wordCountB = words(recordB.script || "").length;
  const wordDiff = wordCountB - wordCountA;

  let lineageContext: "revision" | "parent" | "unrelated" = "unrelated";
  if (recordB.parent_analysis_id && recordB.parent_analysis_id === recordA.id) {
    lineageContext = "revision";
    keyObservations.unshift(`Version B was explicitly created as a revision of Version A.`);
  } else if (recordA.parent_analysis_id && recordA.parent_analysis_id === recordB.id) {
    lineageContext = "parent";
    keyObservations.unshift(`Version A was explicitly created as a revision of Version B.`);
  }

  if (wordDiff > 0) {
    keyObservations.push(`Script B is ${wordDiff} words longer than Script A (${wordCountA} → ${wordCountB} words).`);
  } else if (wordDiff < 0) {
    keyObservations.push(`Script B is ${Math.abs(wordDiff)} words tighter than Script A (${wordCountA} → ${wordCountB} words).`);
  }

  let headline = `Retention comparison between "${recordA.title}" and "${recordB.title}".`;
  if (scoreDelta > 0) {
    headline = `Version B ("${recordB.title}") outperforms Version A by +${scoreDelta} points.`;
  } else if (scoreDelta < 0) {
    headline = `Version B ("${recordB.title}") scores ${Math.abs(scoreDelta)} points below Version A.`;
  }

  return {
    scriptA: {
      id: recordA.id,
      title: recordA.title,
      script: recordA.script,
      platform: recordA.platform,
      overallScore: scoreA,
      createdAt: recordA.created_at,
      wordCount: wordCountA,
      metrics: metricsA,
    },
    scriptB: {
      id: recordB.id,
      title: recordB.title,
      script: recordB.script,
      platform: recordB.platform,
      overallScore: scoreB,
      createdAt: recordB.created_at,
      wordCount: wordCountB,
      metrics: metricsB,
    },
    scoreDelta,
    overallStatus,
    metricDeltas,
    timelineComparison,
    summary: {
      headline,
      overallScoreDelta: scoreDelta,
      overallStatus,
      strongestImprovement,
      biggestDecline,
      keyObservations,
      lineageContext,
    },
  };
}
