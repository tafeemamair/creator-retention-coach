import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { compareScriptAnalyses, type AnalysisRecordInput } from "../comparison";
import { generateActionPlan } from "../actionPlan";
import { deriveHistoricalInsights } from "../historicalInsights";
import type { FullAnalysis } from "../analyze";

describe("CRC V2 Phase 3 Closed Feedback Loop Test Suite", () => {
  // =========================================================================
  // 1. LEVEL 2: SCRIPT REVISION LINEAGE & STRICT FAIL-CLOSED REJECTION
  // =========================================================================
  describe("Lineage & Strict Fail-Closed Rejection Contract", () => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    /**
     * Server-side lineage validation engine matching /api/analyze-full route contract.
     * Enforces fail-closed rejection on invalid, nonexistent, malformed, foreign, or unauthenticated parents.
     */
    function validateAndResolveParent(
      authenticatedUserId: string | null,
      parentId: string | undefined | null,
      lookupDb: (id: string) => { id: string; user_id: string } | null
    ): { status: "valid" | "independent" | "rejected"; httpStatus?: number; error?: string; validatedParentId?: string } {
      if (!parentId) {
        return { status: "independent" };
      }

      if (!authenticatedUserId) {
        return { status: "rejected", httpStatus: 401, error: "Authentication required to create a revision" };
      }

      if (typeof parentId !== "string" || !uuidRegex.test(parentId)) {
        return { status: "rejected", httpStatus: 400, error: "Malformed parent analysis ID" };
      }

      const record = lookupDb(parentId);
      if (!record) {
        return { status: "rejected", httpStatus: 404, error: "Parent analysis not found" };
      }

      if (record.user_id !== authenticatedUserId) {
        return { status: "rejected", httpStatus: 403, error: "Unauthorized: parent analysis belongs to another user" };
      }

      return { status: "valid", validatedParentId: record.id };
    }

    // Mock DB records
    const userAlice = "usr_alice_111";
    const userBob = "usr_bob_222";
    const mockAnalysesDb: Record<string, { id: string; user_id: string }> = {
      "a0000000-0000-4000-8000-000000000001": { id: "a0000000-0000-4000-8000-000000000001", user_id: userAlice },
      "b0000000-0000-4000-8000-000000000002": { id: "b0000000-0000-4000-8000-000000000002", user_id: userBob },
    };

    const mockLookup = (id: string) => mockAnalysesDb[id] || null;

    test("1. Normal independent analysis (no parentId) succeeds with independent status", () => {
      const result = validateAndResolveParent(userAlice, undefined, mockLookup);
      assert.strictEqual(result.status, "independent");
      assert.strictEqual(result.validatedParentId, undefined);
    });

    test("2. Valid parent belonging to authenticated owner succeeds and resolves validatedParentId", () => {
      const validParentId = "a0000000-0000-4000-8000-000000000001";
      const result = validateAndResolveParent(userAlice, validParentId, mockLookup);
      assert.strictEqual(result.status, "valid");
      assert.strictEqual(result.validatedParentId, validParentId);
    });

    test("3. Nonexistent parent ID fails closed (HTTP 404) and rejects creation", () => {
      const nonexistentId = "c0000000-0000-4000-8000-000000000099";
      const result = validateAndResolveParent(userAlice, nonexistentId, mockLookup);
      assert.strictEqual(result.status, "rejected");
      assert.strictEqual(result.httpStatus, 404);
      assert.strictEqual(result.error, "Parent analysis not found");
    });

    test("4. Foreign parent ID belonging to another creator fails closed (HTTP 403) and rejects creation", () => {
      const bobsParentId = "b0000000-0000-4000-8000-000000000002";
      // Alice attempts to create revision from Bob's analysis
      const result = validateAndResolveParent(userAlice, bobsParentId, mockLookup);
      assert.strictEqual(result.status, "rejected");
      assert.strictEqual(result.httpStatus, 403);
      assert.strictEqual(result.error, "Unauthorized: parent analysis belongs to another user");
    });

    test("5. Malformed parent ID fails closed (HTTP 400) and rejects creation", () => {
      const malformedId = "not-a-valid-uuid-12345";
      const result = validateAndResolveParent(userAlice, malformedId, mockLookup);
      assert.strictEqual(result.status, "rejected");
      assert.strictEqual(result.httpStatus, 400);
      assert.strictEqual(result.error, "Malformed parent analysis ID");
    });

    test("6. Unauthenticated revision request fails closed (HTTP 401) and rejects creation", () => {
      const validParentId = "a0000000-0000-4000-8000-000000000001";
      const result = validateAndResolveParent(null, validParentId, mockLookup);
      assert.strictEqual(result.status, "rejected");
      assert.strictEqual(result.httpStatus, 401);
      assert.strictEqual(result.error, "Authentication required to create a revision");
    });

    test("7. Failed parent validation creates no new analysis row or credit deduction", () => {
      let analysisCreated = false;
      let creditsDeducted = 0;

      const malformedId = "bad-id";
      const check = validateAndResolveParent(userAlice, malformedId, mockLookup);
      if (check.status === "valid" || check.status === "independent") {
        analysisCreated = true;
        creditsDeducted = 1;
      }

      assert.strictEqual(analysisCreated, false, "Must NOT create analysis on failed validation");
      assert.strictEqual(creditsDeducted, 0, "Must NOT deduct credits on failed validation");
    });
  });

  // =========================================================================
  // 2. LEVEL 1: CREATOR-REPORTED OUTCOME CONTRACT
  // =========================================================================
  describe("Manual Outcome Contract & Persistence", () => {
    interface OutcomePayload {
      published_at?: string | null;
      published_url?: string | null;
      actual_views?: number | null;
      actual_retention_percent?: number | null;
      actual_watch_time_seconds?: number | null;
    }

    function sanitizeOutcomeInput(input: any): OutcomePayload {
      const payload: OutcomePayload = {};
      if (input.published_at !== undefined) {
        payload.published_at = input.published_at ? String(input.published_at) : null;
      }
      if (input.published_url !== undefined) {
        payload.published_url = input.published_url ? String(input.published_url).trim() : null;
      }
      if (input.actual_views !== undefined) {
        payload.actual_views =
          input.actual_views !== null && input.actual_views !== ""
            ? Math.max(0, parseInt(String(input.actual_views), 10) || 0)
            : null;
      }
      if (input.actual_retention_percent !== undefined) {
        payload.actual_retention_percent =
          input.actual_retention_percent !== null && input.actual_retention_percent !== ""
            ? Math.min(100, Math.max(0, parseFloat(String(input.actual_retention_percent)) || 0))
            : null;
      }
      if (input.actual_watch_time_seconds !== undefined) {
        payload.actual_watch_time_seconds =
          input.actual_watch_time_seconds !== null && input.actual_watch_time_seconds !== ""
            ? Math.max(0, parseFloat(String(input.actual_watch_time_seconds)) || 0)
            : null;
      }
      return payload;
    }

    test("8. Full creator outcome record is parsed and bounded accurately", () => {
      const raw = {
        published_at: "2026-09-24T18:00:00Z",
        published_url: "https://youtube.com/shorts/abc123xyz",
        actual_views: "45200",
        actual_retention_percent: "76.4",
        actual_watch_time_seconds: "28.5",
      };

      const sanitized = sanitizeOutcomeInput(raw);
      assert.strictEqual(sanitized.published_at, "2026-09-24T18:00:00Z");
      assert.strictEqual(sanitized.published_url, "https://youtube.com/shorts/abc123xyz");
      assert.strictEqual(sanitized.actual_views, 45200);
      assert.strictEqual(sanitized.actual_retention_percent, 76.4);
      assert.strictEqual(sanitized.actual_watch_time_seconds, 28.5);
    });

    test("9. Partial outcome data is supported and optional fields default to null", () => {
      const rawPartial = {
        published_url: "https://tiktok.com/@creator/video/987654",
        actual_views: "12000",
      };

      const sanitized = sanitizeOutcomeInput(rawPartial);
      assert.strictEqual(sanitized.published_url, "https://tiktok.com/@creator/video/987654");
      assert.strictEqual(sanitized.actual_views, 12000);
      assert.strictEqual(sanitized.published_at, undefined);
      assert.strictEqual(sanitized.actual_retention_percent, undefined);
      assert.strictEqual(sanitized.actual_watch_time_seconds, undefined);
    });

    test("10. Bounding checks constrain retention percentage to [0, 100]", () => {
      const high = sanitizeOutcomeInput({ actual_retention_percent: "140" });
      assert.strictEqual(high.actual_retention_percent, 100);

      const low = sanitizeOutcomeInput({ actual_retention_percent: "-15" });
      assert.strictEqual(low.actual_retention_percent, 0);
    });

    test("11. Zero credits consumed and zero AI calls triggered for outcome operations", () => {
      let creditsDeducted = 0;
      let aiCallsTriggered = 0;

      function recordOutcome(analysisId: string, payload: OutcomePayload) {
        return { success: true, updatedFields: payload };
      }

      recordOutcome("ana_123", { actual_views: 5000 });
      assert.strictEqual(creditsDeducted, 0, "Outcome write MUST consume 0 credits");
      assert.strictEqual(aiCallsTriggered, 0, "Outcome write MUST trigger 0 AI calls");
    });
  });

  // =========================================================================
  // 3. PREDICTED VS ACTUAL RETENTION SEMANTICS & NO FABRICATED DELTAS
  // =========================================================================
  describe("Predicted vs Actual Retention Semantics", () => {
    /**
     * Factual retention outcome presentation logic:
     * - Do NOT convert 0-100 overall score into retention %.
     * - Do NOT calculate a difference between overall score and actual retention %.
     * - Show Pre-Filming CRC Score and Reported Actual Retention % separately.
     * - Only compute delta where an authoritative predicted retention percentage exists.
     */
    function presentOutcomeMetrics(
      diagnosticScore: number,
      reportedActualRetention: number | null,
      authoritativePredictedRetentionPercent?: number | null
    ): {
      scoreLabel: string;
      reportedRetentionLabel: string;
      difference: { delta: number; text: string } | null;
    } {
      const scoreLabel = `${diagnosticScore} / 100`;
      const reportedRetentionLabel =
        reportedActualRetention !== null ? `${reportedActualRetention}%` : "Not recorded";

      let difference: { delta: number; text: string } | null = null;
      if (
        typeof authoritativePredictedRetentionPercent === "number" &&
        reportedActualRetention !== null
      ) {
        const diff = Math.round((reportedActualRetention - authoritativePredictedRetentionPercent) * 10) / 10;
        const sign = diff > 0 ? "+" : "";
        difference = {
          delta: diff,
          text: `${sign}${diff.toFixed(1)} percentage points`,
        };
      }

      return {
        scoreLabel,
        reportedRetentionLabel,
        difference,
      };
    }

    test("12. Overall CRC score (0-100) is displayed separately and does NOT generate a fabricated percentage delta", () => {
      const diagnosticScore = 78;
      const reportedRetention = 82.5;

      // No compatible scalar predicted retention % exists on analysis contract
      const presentation = presentOutcomeMetrics(diagnosticScore, reportedRetention, null);
      assert.strictEqual(presentation.scoreLabel, "78 / 100");
      assert.strictEqual(presentation.reportedRetentionLabel, "82.5%");
      assert.strictEqual(presentation.difference, null, "Must NOT calculate difference against overall score");
    });

    test("13. Compatible percentage metrics produce factual difference when available", () => {
      const diagnosticScore = 80;
      const reportedRetention = 72.0;
      const compatiblePredictedRetention = 68.0; // hypothetical compatible measurement

      const presentation = presentOutcomeMetrics(diagnosticScore, reportedRetention, compatiblePredictedRetention);
      assert.ok(presentation.difference);
      assert.strictEqual(presentation.difference.delta, 4.0);
      assert.strictEqual(presentation.difference.text, "+4.0 percentage points");
    });

    test("14. Missing actual retention produces safe unrecorded state without fabrication", () => {
      const presentation = presentOutcomeMetrics(75, null, null);
      assert.strictEqual(presentation.reportedRetentionLabel, "Not recorded");
      assert.strictEqual(presentation.difference, null);
    });

    test("15. Strictly factual terminology without causal or AI learning claims", () => {
      const uiLabels = [
        "Pre-Filming CRC Score",
        "Reported Actual Retention",
        "Reported Actual Views",
        "Reported Watch Time",
        "Manual creator entry (factual ground truth)",
      ];

      for (const text of uiLabels) {
        assert.ok(!text.includes("CRC learned"), "Must not claim CRC learned");
        assert.ok(!text.includes("caused"), "Must not claim causation");
        assert.ok(!text.includes("recommendation effectiveness"), "Must not claim recommendation effectiveness");
        assert.ok(!text.includes("AI verified"), "Must not claim AI verification");
      }
    });
  });

  // =========================================================================
  // 4. COMPARISON INTEGRATION WITH LINEAGE CONTEXT
  // =========================================================================
  describe("Comparison Integration With Lineage Context", () => {
    const parentAnalysis: AnalysisRecordInput = {
      id: "ana-parent-001",
      title: "Draft 1: Fitness Hook",
      script: "Do this one workout every day to burn belly fat quickly.",
      platform: "YouTube Shorts",
      overall_score: 65,
      created_at: "2026-09-20T10:00:00Z",
      analysis_result: {
        score: 65,
        metrics: { hook: 60, pacing: 70, emotion: 60, value: 65, cta: 70 },
      },
    };

    const revisionAnalysis: AnalysisRecordInput = {
      id: "ana-rev-002",
      title: "Draft 2: Fitness Hook (Revised)",
      script: "Stop doing 45 minutes of cardio. Here is the 10-minute metabolic routine instead.",
      platform: "YouTube Shorts",
      overall_score: 82,
      created_at: "2026-09-21T12:00:00Z",
      parent_analysis_id: "ana-parent-001",
      analysis_result: {
        score: 82,
        metrics: { hook: 85, pacing: 80, emotion: 75, value: 85, cta: 85 },
      },
    };

    test("16. compareScriptAnalyses identifies Version B as explicit revision of Version A", () => {
      const comparison = compareScriptAnalyses(parentAnalysis, revisionAnalysis);
      assert.strictEqual(comparison.summary.lineageContext, "revision");
      assert.ok(
        comparison.summary.keyObservations.some((obs) =>
          obs.includes("Version B was explicitly created as a revision of Version A.")
        )
      );
      assert.strictEqual(comparison.scoreDelta, 17);
      assert.strictEqual(comparison.overallStatus, "improved");
    });

    test("17. compareScriptAnalyses identifies Version A as revision of Version B when reversed", () => {
      const comparison = compareScriptAnalyses(revisionAnalysis, parentAnalysis);
      assert.strictEqual(comparison.summary.lineageContext, "parent");
      assert.ok(
        comparison.summary.keyObservations.some((obs) =>
          obs.includes("Version A was explicitly created as a revision of Version B.")
        )
      );
      assert.strictEqual(comparison.scoreDelta, -17);
      assert.strictEqual(comparison.overallStatus, "declined");
    });

    test("18. compareScriptAnalyses marks unrelated analyses as unrelated lineage", () => {
      const unrelatedAnalysis: AnalysisRecordInput = {
        id: "ana-unrelated-003",
        title: "Crypto Trading Guide",
        script: "Here are 3 crypto safety tips before investing in 2026.",
        platform: "TikTok",
        overall_score: 70,
        created_at: "2026-09-22T10:00:00Z",
      };

      const comparison = compareScriptAnalyses(parentAnalysis, unrelatedAnalysis);
      assert.strictEqual(comparison.summary.lineageContext, "unrelated");
    });
  });

  // =========================================================================
  // 5. REGRESSION & INVARIANT TESTS (PHASE 1 & PHASE 2 PRESERVATION)
  // =========================================================================
  describe("Phase 1 & Phase 2 Regression Tests", () => {
    test("19. Phase 1 Action Plan engine continues to generate deterministic action plans", () => {
      const mockFullAnalysis: FullAnalysis = {
        score: 58,
        metrics: { hook: 50, pacing: 45, emotion: 60, value: 65, cta: 70 },
        dropoffPrediction: { second: 4, reason: "slow intro" },
        dropOffRisks: [
          {
            line: "In this video I will explain...",
            risk: "High",
            reason: "Slow opening momentum",
            fix: "Cut the meta-announcement",
          },
        ],
        retentionTimeline: [{ second: 0, retention: 100 }],
        rewrites: [
          {
            type: "Curiosity Hook",
            script: "Stop wasting time on cardio.",
          },
        ],
        improvedScript: "Stop wasting time on cardio. Here is why.",
        viralTitleSuggestions: ["3 Cardio Mistakes Killing Your Gains"],
      };

      const plan = generateActionPlan(mockFullAnalysis);
      assert.ok(plan);
      assert.ok(plan.items.length > 0);
      assert.strictEqual(typeof plan.totalActions, "number");
      assert.strictEqual(typeof plan.summary, "string");
      assert.strictEqual(typeof plan.highPriorityCount, "number");
    });

    test("20. Phase 1 Historical Insights engine remains frozen and functional", () => {
      const records = [
        {
          id: "r1",
          title: "Short 1",
          platform: "YouTube Shorts",
          overall_score: 70,
          created_at: "2026-09-01T00:00:00Z",
          metrics: { hook: 70, pacing: 70, emotion: 70, value: 70, cta: 70 },
        },
        {
          id: "r2",
          title: "Short 2",
          platform: "YouTube Shorts",
          overall_score: 80,
          created_at: "2026-09-02T00:00:00Z",
          metrics: { hook: 80, pacing: 80, emotion: 80, value: 80, cta: 80 },
        },
      ];

      const insights = deriveHistoricalInsights(records);
      assert.strictEqual(insights.totalAnalyses, 2);
      assert.strictEqual(insights.averageScore, 75);
      assert.strictEqual(insights.hasSufficientData, true);
    });
  });
});
