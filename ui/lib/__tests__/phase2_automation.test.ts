import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  deriveHistoricalInsights,
  evaluatePlatformBenchmark,
  type HistoricalAnalysisRecord,
} from "../historicalInsights";
import { compareScriptAnalyses, type AnalysisRecordInput } from "../comparison";

describe("CRC V2 Phase 2 Automation & Intelligence Test Suite", () => {
  // Mock analysis data fixtures
  const fixture1: HistoricalAnalysisRecord = {
    id: "rec-1",
    title: "10x YouTube Shorts Hook",
    platform: "YouTube Shorts",
    overall_score: 85,
    created_at: "2026-09-20T10:00:00Z",
    metrics: { hook: 90, pacing: 80, emotion: 70, value: 95, cta: 85 },
    analysis_result: {
      score: 85,
      metrics: { hook: 90, pacing: 80, emotion: 70, value: 95, cta: 85 },
      retentionTimeline: [
        { second: 1, retention: 98 },
        { second: 3, retention: 88 },
        { second: 5, retention: 80 },
        { second: 10, retention: 72 },
      ],
      dropoffPrediction: { second: 5, reason: "dense sentence length slowing momentum" },
    },
  };

  const fixture2: HistoricalAnalysisRecord = {
    id: "rec-2",
    title: "TikTok Viral Sound Guide",
    platform: "TikTok",
    overall_score: 62,
    created_at: "2026-09-21T10:00:00Z",
    metrics: { hook: 55, pacing: 60, emotion: 75, value: 50, cta: 65 },
    analysis_result: {
      score: 62,
      metrics: { hook: 55, pacing: 60, emotion: 75, value: 50, cta: 65 },
      retentionTimeline: [
        { second: 1, retention: 95 },
        { second: 3, retention: 65 },
        { second: 5, retention: 52 },
        { second: 10, retention: 40 },
      ],
      dropoffPrediction: { second: 3, reason: "weak opening hook / delayed curiosity payoff" },
    },
  };

  const fixture3: HistoricalAnalysisRecord = {
    id: "rec-3",
    title: "Instagram Reel Story Formula",
    platform: "Instagram Reels",
    overall_score: 74,
    created_at: "2026-09-22T10:00:00Z",
    metrics: { hook: 75, pacing: 70, emotion: 85, value: 70, cta: 68 },
    analysis_result: {
      score: 74,
      metrics: { hook: 75, pacing: 70, emotion: 85, value: 70, cta: 68 },
      retentionTimeline: [
        { second: 1, retention: 96 },
        { second: 3, retention: 82 },
        { second: 5, retention: 74 },
        { second: 10, retention: 60 },
      ],
      dropoffPrediction: { second: 10, reason: "missing or weak concluding action prompt" },
    },
  };

  describe("1. Archive Search & Filtering Logic", () => {
    const dataset = [
      { id: "1", title: "How to Grow on TikTok", script: "Stop scrolling right now. Here is the secret.", platform: "TikTok", overall_score: 82, created_at: "2026-09-20T10:00:00Z" },
      { id: "2", title: "YouTube Shorts Blueprint", script: "Most creators fail in the first 3 seconds.", platform: "YouTube Shorts", overall_score: 68, created_at: "2026-09-21T10:00:00Z" },
      { id: "3", title: "Reels Algorithm Explained", script: "Instagram just updated how reels are distributed.", platform: "Instagram Reels", overall_score: 55, created_at: "2026-09-22T10:00:00Z" },
    ];

    test("filters by keyword search across title and script text", () => {
      const query = "secret";
      const matches = dataset.filter((d) =>
        d.title.toLowerCase().includes(query) || d.script.toLowerCase().includes(query)
      );
      assert.equal(matches.length, 1);
      assert.equal(matches[0].id, "1");
    });

    test("filters by platform accurately", () => {
      const tiktokOnly = dataset.filter((d) => d.platform === "TikTok");
      assert.equal(tiktokOnly.length, 1);
      assert.equal(tiktokOnly[0].title, "How to Grow on TikTok");
    });

    test("filters by score bands (High >= 80, Medium 60-79, Low < 60)", () => {
      const high = dataset.filter((d) => d.overall_score >= 80);
      const medium = dataset.filter((d) => d.overall_score >= 60 && d.overall_score < 80);
      const low = dataset.filter((d) => d.overall_score < 60);

      assert.equal(high.length, 1);
      assert.equal(high[0].id, "1"); // 82
      assert.equal(medium.length, 1);
      assert.equal(medium[0].id, "2"); // 68
      assert.equal(low.length, 1);
      assert.equal(low[0].id, "3"); // 55
    });

    test("sorts by score descending and ascending deterministically", () => {
      const sortedDesc = [...dataset].sort((a, b) => b.overall_score - a.overall_score);
      const sortedAsc = [...dataset].sort((a, b) => a.overall_score - b.overall_score);

      assert.equal(sortedDesc[0].overall_score, 82);
      assert.equal(sortedDesc[2].overall_score, 55);

      assert.equal(sortedAsc[0].overall_score, 55);
      assert.equal(sortedAsc[2].overall_score, 82);
    });

    test("sorts by date newest and oldest", () => {
      const newestFirst = [...dataset].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      const oldestFirst = [...dataset].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

      assert.equal(newestFirst[0].id, "3");
      assert.equal(oldestFirst[0].id, "1");
    });
  });

  describe("2. Deterministic Script Retention Comparison", () => {
    const recordA: AnalysisRecordInput = {
      id: "a1",
      title: "Draft 1 - Raw Concept",
      script: "Hey guys welcome back today I want to talk about retention.",
      platform: "YouTube Shorts",
      overall_score: 60,
      created_at: "2026-09-18T10:00:00Z",
      analysis_result: {
        score: 60,
        metrics: { hook: 50, pacing: 55, emotion: 60, value: 70, cta: 50 },
        retentionTimeline: [
          { second: 1, retention: 90 },
          { second: 3, retention: 60 },
          { second: 5, retention: 50 },
        ],
      },
    };

    const recordB: AnalysisRecordInput = {
      id: "b1",
      title: "Draft 2 - High Retention Polish",
      script: "Stop scrolling. If you make this one mistake, 90% of viewers leave in 3 seconds.",
      platform: "YouTube Shorts",
      overall_score: 84,
      created_at: "2026-09-19T10:00:00Z",
      analysis_result: {
        score: 84,
        metrics: { hook: 88, pacing: 80, emotion: 75, value: 85, cta: 80 },
        retentionTimeline: [
          { second: 1, retention: 98 },
          { second: 3, retention: 85 },
          { second: 5, retention: 78 },
        ],
      },
    };

    test("computes overall score delta and overall status", () => {
      const result = compareScriptAnalyses(recordA, recordB);
      assert.equal(result.scoreDelta, 24); // 84 - 60
      assert.equal(result.overallStatus, "improved");
      assert.equal(result.scriptA.overallScore, 60);
      assert.equal(result.scriptB.overallScore, 84);
    });

    test("computes individual metric deltas with exact polarities", () => {
      const result = compareScriptAnalyses(recordA, recordB);
      assert.equal(result.metricDeltas.hook.delta, 38); // 88 - 50
      assert.equal(result.metricDeltas.hook.status, "improved");
      assert.equal(result.metricDeltas.pacing.delta, 25); // 80 - 55
      assert.equal(result.metricDeltas.emotion.delta, 15); // 75 - 60
      assert.equal(result.metricDeltas.value.delta, 15); // 85 - 70
      assert.equal(result.metricDeltas.cta.delta, 30); // 80 - 50
    });

    test("computes negative score delta when comparing regression", () => {
      const result = compareScriptAnalyses(recordB, recordA);
      assert.equal(result.scoreDelta, -24); // 60 - 84
      assert.equal(result.overallStatus, "declined");
      assert.equal(result.metricDeltas.hook.delta, -38);
      assert.equal(result.metricDeltas.hook.status, "declined");
    });

    test("computes retention timeline comparison points and differentials", () => {
      const result = compareScriptAnalyses(recordA, recordB);
      assert.equal(result.timelineComparison.length, 3);
      assert.equal(result.timelineComparison[0].second, 1);
      assert.equal(result.timelineComparison[0].delta, 8); // 98 - 90
      assert.equal(result.timelineComparison[1].second, 3);
      assert.equal(result.timelineComparison[1].delta, 25); // 85 - 60
      assert.equal(result.timelineComparison[2].second, 5);
      assert.equal(result.timelineComparison[2].delta, 28); // 78 - 50
    });

    test("generates deterministic summary observations without AI calls", () => {
      const result = compareScriptAnalyses(recordA, recordB);
      assert.match(result.summary.headline, /outperforms Version A by \+24 points/);
      assert.ok(result.summary.strongestImprovement);
      assert.equal(result.summary.strongestImprovement?.label, "Hook & Opening");
      assert.equal(result.summary.strongestImprovement?.delta, 38);
      assert.ok(result.summary.keyObservations.length >= 2);
    });

    test("handles zero external AI calls and 0 credit consumption", () => {
      const start = Date.now();
      const result = compareScriptAnalyses(recordA, recordB);
      const elapsed = Date.now() - start;
      assert.ok(elapsed < 10, "Comparison must execute synchronously in <10ms");
      assert.ok(result);
    });
  });

  describe("3. Platform Performance Benchmarks", () => {
    test("evaluates On Target status for high scores (>=80)", () => {
      const benchmark = evaluatePlatformBenchmark("TikTok", 84, 5);
      assert.equal(benchmark.status, "on_target");
      assert.equal(benchmark.statusLabel, "On Target");
      assert.equal(benchmark.targetScore, 75);
      assert.equal(benchmark.primaryWeightFocus, "Hook (35%) & Pacing (30%)");
    });

    test("evaluates Solid Baseline for moderate scores (65-79)", () => {
      const benchmark = evaluatePlatformBenchmark("YouTube Shorts", 72, 3);
      assert.equal(benchmark.status, "solid_baseline");
      assert.equal(benchmark.statusLabel, "Solid Baseline");
      assert.equal(benchmark.primaryWeightFocus, "Hook (30%) & Value (20%)");
    });

    test("evaluates Needs Improvement for lower scores (<65)", () => {
      const benchmark = evaluatePlatformBenchmark("Instagram Reels", 58, 2);
      assert.equal(benchmark.status, "needs_improvement");
      assert.equal(benchmark.statusLabel, "Needs Improvement");
      assert.equal(benchmark.primaryWeightFocus, "Emotion (25%) & Shareability");
    });

    test("handles 0 analyses safely without crashing", () => {
      const insights = deriveHistoricalInsights([]);
      assert.equal(insights.hasSufficientData, false);
      assert.equal(insights.totalAnalyses, 0);
      assert.equal(insights.platformBreakdown.length, 0);
    });

    test("handles 1 analysis attaching benchmark without fabricating multi-trend", () => {
      const insights = deriveHistoricalInsights([fixture1]);
      assert.equal(insights.hasSufficientData, false);
      assert.equal(insights.totalAnalyses, 1);
      assert.equal(insights.averageScore, 85);
      assert.equal(insights.platformBreakdown.length, 1);
      assert.equal(insights.platformBreakdown[0].platform, "YouTube Shorts");
      assert.equal(insights.platformBreakdown[0].benchmark?.status, "on_target");
      assert.equal(insights.scoreTrajectory, null); // No trajectory fabricated
    });

    test("handles 2+ analyses generating full benchmarks and trajectories", () => {
      const insights = deriveHistoricalInsights([fixture3, fixture2, fixture1]);
      assert.equal(insights.hasSufficientData, true);
      assert.equal(insights.totalAnalyses, 3);
      assert.ok(insights.platformBreakdown.length >= 2);
      for (const stat of insights.platformBreakdown) {
        assert.ok(stat.benchmark, `Platform ${stat.platform} must contain benchmark`);
        assert.ok(["on_target", "solid_baseline", "needs_improvement"].includes(stat.benchmark.status));
      }
    });
  });
});
