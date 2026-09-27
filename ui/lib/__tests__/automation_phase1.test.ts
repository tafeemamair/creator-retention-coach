import test, { describe } from "node:test";
import assert from "node:assert/strict";
import { generateActionPlan } from "../actionPlan";
import { deriveHistoricalInsights, type HistoricalAnalysisRecord } from "../historicalInsights";
import type { FullAnalysis } from "../analyze";

describe("CRC V2 Automation Phase 1: Deterministic Action Plan & Historical Insights", () => {
  // ============================================================================
  // PART 1: POST-ANALYSIS ACTION PLAN TESTS
  // ============================================================================
  describe("1. Deterministic Post-Analysis Action Plan", () => {
    const baseAnalysis: FullAnalysis = {
      score: 85,
      metrics: {
        hook: 85,
        pacing: 85,
        emotion: 80,
        value: 85,
        cta: 85,
      },
      dropoffPrediction: { second: 18, reason: "Normal decay." },
      dropOffRisks: [
        {
          line: "Stop scrolling right now.",
          risk: "Low",
          reason: "Clear hook line.",
          fix: "Keep as-is.",
        },
      ],
      retentionTimeline: [{ second: 0, retention: 100 }],
      rewrites: [
        { type: "Curiosity Hook", script: "Rewritten script." },
      ],
      improvedScript: "Rewritten script.",
      viralTitleSuggestions: ["Hook Title 1", "Hook Title 2"],
    };

    test("handles normal/strong analysis cleanly with zero or minimal high-priority actions", () => {
      const plan = generateActionPlan(baseAnalysis);
      assert.ok(plan);
      assert.equal(typeof plan.summary, "string");
      assert.equal(plan.highPriorityCount, 0);
      assert.equal(plan.items.length, 0);
    });

    test("detects weak hook and generates prioritized hook fix", () => {
      const weakHookAnalysis: FullAnalysis = {
        ...baseAnalysis,
        metrics: { ...baseAnalysis.metrics, hook: 45 },
        dropoffPrediction: { second: 3, reason: "Opening line misses curiosity gap." },
      };

      const plan = generateActionPlan(weakHookAnalysis);
      assert.ok(plan.items.length >= 1);
      const hookAction = plan.items.find((i) => i.category === "hook");
      assert.ok(hookAction);
      assert.equal(hookAction.priority, "high");
      assert.ok(hookAction.title.includes("Opening Hook"));
      assert.ok(hookAction.recommendedFix.length > 0);
    });

    test("detects high-risk drop-off friction lines in script body", () => {
      const highRiskAnalysis: FullAnalysis = {
        ...baseAnalysis,
        dropOffRisks: [
          { line: "Good opening hook.", risk: "Low", reason: "Good", fix: "Keep" },
          {
            line: "This is a super long sentence that repeats everything we said earlier.",
            risk: "High",
            reason: "Sentence exceeds 20 words and restates previous idea.",
            fix: "Cut 10 words and split into two sentences.",
          },
        ],
      };

      const plan = generateActionPlan(highRiskAnalysis);
      assert.ok(plan.items.length >= 1);
      const frictionAction = plan.items.find((i) => i.category === "high_risk_line");
      assert.ok(frictionAction);
      assert.equal(frictionAction.priority, "high");
      assert.equal(frictionAction.targetLine, highRiskAnalysis.dropOffRisks[1].line);
      assert.equal(frictionAction.recommendedFix, highRiskAnalysis.dropOffRisks[1].fix);
    });

    test("detects weak pacing and weak CTA simultaneously", () => {
      const weakPacingCtaAnalysis: FullAnalysis = {
        ...baseAnalysis,
        metrics: {
          ...baseAnalysis.metrics,
          pacing: 40,
          cta: 35,
        },
      };

      const plan = generateActionPlan(weakPacingCtaAnalysis);
      const pacingAction = plan.items.find((i) => i.category === "pacing");
      const ctaAction = plan.items.find((i) => i.category === "cta");

      assert.ok(pacingAction, "Should contain pacing improvement action");
      assert.ok(ctaAction, "Should contain CTA action");
      assert.equal(pacingAction.priority, "high");
      assert.equal(ctaAction.priority, "medium");
    });

    test("handles multiple simultaneous weaknesses with correct priority sorting", () => {
      const multipleWeaknessAnalysis: FullAnalysis = {
        ...baseAnalysis,
        metrics: {
          hook: 40,
          pacing: 45,
          emotion: 50,
          value: 45,
          cta: 30,
        },
        dropoffPrediction: { second: 2, reason: "Weak hook" },
        dropOffRisks: [
          { line: "Sentence 1", risk: "High", reason: "Friction", fix: "Fix 1" },
          { line: "Sentence 2", risk: "High", reason: "Friction", fix: "Fix 2" },
        ],
      };

      const plan = generateActionPlan(multipleWeaknessAnalysis);
      assert.ok(plan.items.length >= 4);
      assert.ok(plan.highPriorityCount >= 3);

      // Verify strict priority sorting: high -> medium -> low
      const priorities = plan.items.map((i) => i.priority);
      for (let idx = 0; idx < priorities.length - 1; idx++) {
        const order = { high: 1, medium: 2, low: 3 };
        assert.ok(order[priorities[idx]] <= order[priorities[idx + 1]]);
      }
    });

    test("handles missing or malformed optional fields safely without throwing", () => {
      const partialAnalysis = {
        score: 50,
      } as FullAnalysis;

      const plan = generateActionPlan(partialAnalysis);
      assert.ok(plan);
      assert.equal(typeof plan.totalActions, "number");
      assert.equal(typeof plan.summary, "string");
    });

    test("guarantees 100% deterministic output across repeated calls", () => {
      const plan1 = generateActionPlan(baseAnalysis);
      const plan2 = generateActionPlan(baseAnalysis);
      assert.deepEqual(plan1, plan2);
    });
  });

  // ============================================================================
  // PART 2: HISTORICAL CREATOR INSIGHTS TESTS
  // ============================================================================
  describe("2. Deterministic Creator Historical Insights", () => {
    const mockAnalysis1: HistoricalAnalysisRecord = {
      id: "analysis-1",
      title: "Script 1: 3 Mistakes Creators Make",
      platform: "YouTube Shorts",
      overall_score: 65,
      created_at: "2026-09-20T10:00:00Z",
      metrics: { hook: 40, pacing: 75, emotion: 70, value: 80, cta: 85 },
      analysis_result: {
        score: 65,
        metrics: { hook: 40, pacing: 75, emotion: 70, value: 80, cta: 85 },
        dropoffPrediction: { second: 3, reason: "Opening line misses curiosity gap." },
        dropOffRisks: [
          { line: "Hey guys welcome back", risk: "High", reason: "Conversational filler preamble.", fix: "Cut" },
        ],
      },
    };

    const mockAnalysis2: HistoricalAnalysisRecord = {
      id: "analysis-2",
      title: "Script 2: How to 10x Your Views",
      platform: "YouTube Shorts",
      overall_score: 75,
      created_at: "2026-09-22T12:00:00Z",
      metrics: { hook: 50, pacing: 80, emotion: 75, value: 85, cta: 85 },
      analysis_result: {
        score: 75,
        metrics: { hook: 50, pacing: 80, emotion: 75, value: 85, cta: 85 },
        dropoffPrediction: { second: 4, reason: "Opening hook is slightly generic." },
        dropOffRisks: [
          { line: "Today I will show you something cool", risk: "High", reason: "Opening line misses curiosity gap.", fix: "Cut" },
        ],
      },
    };

    const mockAnalysis3: HistoricalAnalysisRecord = {
      id: "analysis-3",
      title: "Script 3: Stop Doing This Right Now",
      platform: "TikTok",
      overall_score: 85,
      created_at: "2026-09-24T14:00:00Z",
      metrics: { hook: 88, pacing: 85, emotion: 80, value: 90, cta: 90 },
      analysis_result: {
        score: 85,
        metrics: { hook: 88, pacing: 85, emotion: 80, value: 90, cta: 90 },
        dropoffPrediction: { second: 20, reason: "Normal decay." },
        dropOffRisks: [],
      },
    };

    test("zero analyses returns safe empty state", () => {
      const insights = deriveHistoricalInsights([]);
      assert.equal(insights.hasSufficientData, false);
      assert.equal(insights.totalAnalyses, 0);
      assert.equal(insights.averageScore, 0);
      assert.equal(insights.scoreTrajectory, null);
    });

    test("one single analysis returns insufficient-history state without fabricating trends", () => {
      const insights = deriveHistoricalInsights([mockAnalysis1]);
      assert.equal(insights.hasSufficientData, false);
      assert.equal(insights.totalAnalyses, 1);
      assert.equal(insights.averageScore, 65);
      assert.equal(insights.scoreTrajectory, null);
      assert.ok(insights.message.includes("at least 2 scripts"));
    });

    test("two analyses activates historical trends and calculates delta", () => {
      const insights = deriveHistoricalInsights([mockAnalysis2, mockAnalysis1]);
      assert.equal(insights.hasSufficientData, true);
      assert.equal(insights.totalAnalyses, 2);
      assert.equal(insights.averageScore, 70); // (75 + 65) / 2
      assert.ok(insights.scoreTrajectory);
      assert.equal(insights.scoreTrajectory.delta, 10); // 75 - 65
      assert.equal(insights.scoreTrajectory.direction, "improving");
    });

    test("identifies score improvement trajectory across multiple analyses", () => {
      const insights = deriveHistoricalInsights([mockAnalysis3, mockAnalysis2, mockAnalysis1]);
      assert.equal(insights.hasSufficientData, true);
      assert.equal(insights.totalAnalyses, 3);
      assert.equal(insights.averageScore, 75); // (85 + 75 + 65) / 3
      assert.ok(insights.scoreTrajectory);
      assert.equal(insights.scoreTrajectory.direction, "improving");
      assert.equal(insights.scoreTrajectory.delta, 20); // 85 - 65
      assert.equal(insights.scoreTrajectory.latestScore, 85);
      assert.equal(insights.scoreTrajectory.earliestScore, 65);
    });

    test("identifies score decline trajectory accurately", () => {
      const decliningAnalyses: HistoricalAnalysisRecord[] = [
        { ...mockAnalysis1, overall_score: 55, created_at: "2026-09-24T12:00:00Z" },
        { ...mockAnalysis2, overall_score: 80, created_at: "2026-09-20T12:00:00Z" },
      ];

      const insights = deriveHistoricalInsights(decliningAnalyses);
      assert.ok(insights.scoreTrajectory);
      assert.equal(insights.scoreTrajectory.direction, "declining");
      assert.equal(insights.scoreTrajectory.delta, -25);
    });

    test("identifies dominant weakest metric and weakness frequency", () => {
      const insights = deriveHistoricalInsights([mockAnalysis3, mockAnalysis2, mockAnalysis1]);
      assert.ok(insights.dominantWeakestMetric);
      // In mockAnalysis1 (hook: 40) and mockAnalysis2 (hook: 50), hook was the lowest metric
      assert.equal(insights.dominantWeakestMetric.metric, "hook");
      assert.equal(insights.dominantWeakestMetric.count, 2);
      assert.ok(insights.dominantWeakestMetric.frequencyPercent >= 60);
      assert.equal(insights.metricWeaknessFrequency.hook, 2);
    });

    test("aggregates top recurring drop-off causes across historical predictions and risks", () => {
      const insights = deriveHistoricalInsights([mockAnalysis3, mockAnalysis2, mockAnalysis1]);
      assert.ok(insights.topRecurringDropOffCause);
      assert.ok(insights.topRecurringDropOffCause.count >= 2);
      assert.ok(
        insights.topRecurringDropOffCause.reason.includes("opening") ||
        insights.topRecurringDropOffCause.reason.includes("hook")
      );
    });

    test("computes platform distribution and average score per platform", () => {
      const insights = deriveHistoricalInsights([mockAnalysis3, mockAnalysis2, mockAnalysis1]);
      assert.equal(insights.platformBreakdown.length, 2);

      const yt = insights.platformBreakdown.find((p) => p.platform === "YouTube Shorts");
      const tt = insights.platformBreakdown.find((p) => p.platform === "TikTok");

      assert.ok(yt);
      assert.equal(yt.count, 2);
      assert.equal(yt.averageScore, 70); // (65 + 75) / 2

      assert.ok(tt);
      assert.equal(tt.count, 1);
      assert.equal(tt.averageScore, 85);
    });
  });

  // ============================================================================
  // PART 3: HARD SAFETY & ZERO CREDIT CONSUMPTION GUARANTEES
  // ============================================================================
  describe("3. Hard Safety & Zero-Credit Guarantees", () => {
    test("action plan generation never modifies original analysis snapshot object", () => {
      const originalAnalysis: FullAnalysis = {
        score: 72,
        metrics: { hook: 50, pacing: 70, emotion: 60, value: 75, cta: 80 },
        dropoffPrediction: { second: 5, reason: "Test reason" },
        dropOffRisks: [{ line: "Test line", risk: "High", reason: "Test", fix: "Fix" }],
        retentionTimeline: [{ second: 0, retention: 100 }],
        rewrites: [{ type: "Curiosity Hook", script: "Rewritten" }],
        improvedScript: "Rewritten",
        viralTitleSuggestions: ["Title 1"],
      };

      const clone = JSON.parse(JSON.stringify(originalAnalysis));
      generateActionPlan(originalAnalysis);
      assert.deepEqual(originalAnalysis, clone, "Original analysis object must remain completely immutable");
    });

    test("historical insights aggregation never mutates input records array", () => {
      const inputRecords: HistoricalAnalysisRecord[] = [
        {
          id: "rec-1",
          title: "Title 1",
          platform: "YouTube Shorts",
          overall_score: 70,
          created_at: "2026-09-21T00:00:00Z",
        },
        {
          id: "rec-2",
          title: "Title 2",
          platform: "YouTube Shorts",
          overall_score: 80,
          created_at: "2026-09-22T00:00:00Z",
        },
      ];

      const inputLength = inputRecords.length;
      deriveHistoricalInsights(inputRecords);
      assert.equal(inputRecords.length, inputLength);
      assert.equal(inputRecords[0].id, "rec-1");
    });
  });
});
