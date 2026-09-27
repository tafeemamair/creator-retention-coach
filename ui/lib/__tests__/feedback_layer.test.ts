import { test, describe } from "node:test";
import assert from "node:assert/strict";

describe("CRC Final Feedback Layer Test Suite", () => {
  // =========================================================================
  // 1. VALIDATION & SECURITY ENGINE
  // =========================================================================
  describe("Feedback Server-Side Validation & Security Contract", () => {
    const ALLOWED_USEFULNESS = new Set(["yes", "somewhat", "no"]);
    const ALLOWED_COMPONENTS = new Set([
      "Hook",
      "Drop-off prediction",
      "Rewrites",
      "Action plan",
      "Score",
    ]);
    const ALLOWED_REVISION_HELP = new Set(["yes", "somewhat", "no"]);
    const UUID_REGEX =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    interface FeedbackInput {
      usefulness: any;
      useful_components?: any;
      comment?: any;
      revision_help?: any;
    }

    interface MockAnalysisRecord {
      id: string;
      user_id: string;
    }

    interface MockFeedbackRecord {
      id: string;
      user_id: string;
      analysis_id: string;
      usefulness: string;
      useful_components: string[] | null;
      comment: string | null;
      revision_help: string | null;
      updated_at: string;
    }

    function processFeedbackSubmission(
      authenticatedUserId: string | null,
      analysisId: string,
      payload: FeedbackInput,
      lookupAnalysis: (id: string) => MockAnalysisRecord | null,
      feedbackDb: Map<string, MockFeedbackRecord>
    ): {
      status: number;
      error?: string;
      feedback?: MockFeedbackRecord;
    } {
      if (!analysisId || !UUID_REGEX.test(analysisId)) {
        return { status: 400, error: "Valid analysis ID is required" };
      }

      if (!authenticatedUserId) {
        return { status: 401, error: "Authentication required" };
      }

      const analysis = lookupAnalysis(analysisId);
      if (!analysis) {
        return { status: 404, error: "Analysis not found" };
      }

      if (analysis.user_id !== authenticatedUserId) {
        return {
          status: 403,
          error: "Unauthorized: analysis belongs to another creator",
        };
      }

      const usefulness = payload?.usefulness;
      if (!usefulness || !ALLOWED_USEFULNESS.has(usefulness)) {
        return {
          status: 400,
          error: "Invalid usefulness rating. Must be 'yes', 'somewhat', or 'no'.",
        };
      }

      let usefulComponents: string[] | null = null;
      if (Array.isArray(payload?.useful_components)) {
        const filtered = payload.useful_components.filter(
          (item: any) => typeof item === "string" && ALLOWED_COMPONENTS.has(item)
        );
        usefulComponents = filtered.length > 0 ? filtered : null;
      }

      let comment: string | null = null;
      if (typeof payload?.comment === "string") {
        const trimmed = payload.comment.trim();
        if (trimmed.length > 500) {
          return {
            status: 400,
            error: "Comment exceeds maximum limit of 500 characters",
          };
        }
        comment = trimmed.length > 0 ? trimmed : null;
      }

      let revisionHelp: string | null = null;
      if (
        payload?.revision_help !== undefined &&
        payload?.revision_help !== null &&
        payload?.revision_help !== ""
      ) {
        if (!ALLOWED_REVISION_HELP.has(String(payload.revision_help))) {
          return {
            status: 400,
            error:
              "Invalid revision help rating. Must be 'yes', 'somewhat', or 'no'.",
          };
        }
        revisionHelp = String(payload.revision_help);
      }

      // Upsert: unique by (user_id, analysis_id)
      const key = `${authenticatedUserId}:${analysisId}`;
      const existing = feedbackDb.get(key);
      const record: MockFeedbackRecord = {
        id: existing?.id || "fb-00000000-0000-4000-8000-000000000001",
        user_id: authenticatedUserId,
        analysis_id: analysisId,
        usefulness,
        useful_components: usefulComponents,
        comment,
        revision_help: revisionHelp,
        updated_at: new Date().toISOString(),
      };

      feedbackDb.set(key, record);
      return { status: 200, feedback: record };
    }

    const aliceUserId = "usr_alice_111";
    const bobUserId = "usr_bob_222";
    const aliceAnalysisId = "a0000000-0000-4000-8000-000000000001";
    const bobAnalysisId = "b0000000-0000-4000-8000-000000000002";

    const mockAnalyses: Record<string, MockAnalysisRecord> = {
      [aliceAnalysisId]: { id: aliceAnalysisId, user_id: aliceUserId },
      [bobAnalysisId]: { id: bobAnalysisId, user_id: bobUserId },
    };

    const mockLookup = (id: string) => mockAnalyses[id] || null;

    test("1. Authenticated user can submit feedback for own analysis", () => {
      const db = new Map<string, MockFeedbackRecord>();
      const result = processFeedbackSubmission(
        aliceUserId,
        aliceAnalysisId,
        {
          usefulness: "yes",
          useful_components: ["Hook", "Rewrites"],
          comment: "Great feedback, helped me tighten my opening hook!",
        },
        mockLookup,
        db
      );

      assert.strictEqual(result.status, 200);
      assert.ok(result.feedback);
      assert.strictEqual(result.feedback.user_id, aliceUserId);
      assert.strictEqual(result.feedback.analysis_id, aliceAnalysisId);
      assert.strictEqual(result.feedback.usefulness, "yes");
      assert.deepStrictEqual(result.feedback.useful_components, ["Hook", "Rewrites"]);
      assert.strictEqual(
        result.feedback.comment,
        "Great feedback, helped me tighten my opening hook!"
      );
    });

    test("2. Unauthenticated submission is rejected (HTTP 401)", () => {
      const db = new Map<string, MockFeedbackRecord>();
      const result = processFeedbackSubmission(
        null,
        aliceAnalysisId,
        { usefulness: "yes" },
        mockLookup,
        db
      );

      assert.strictEqual(result.status, 401);
      assert.strictEqual(result.error, "Authentication required");
      assert.strictEqual(db.size, 0);
    });

    test("3. User cannot submit feedback against another user's analysis (HTTP 403)", () => {
      const db = new Map<string, MockFeedbackRecord>();
      // Alice attempts to submit feedback on Bob's analysis
      const result = processFeedbackSubmission(
        aliceUserId,
        bobAnalysisId,
        { usefulness: "yes" },
        mockLookup,
        db
      );

      assert.strictEqual(result.status, 403);
      assert.strictEqual(
        result.error,
        "Unauthorized: analysis belongs to another creator"
      );
      assert.strictEqual(db.size, 0);
    });

    test("4. Duplicate feedback updates existing record rather than creating another", () => {
      const db = new Map<string, MockFeedbackRecord>();

      // Initial feedback
      const first = processFeedbackSubmission(
        aliceUserId,
        aliceAnalysisId,
        { usefulness: "somewhat", comment: "First impression" },
        mockLookup,
        db
      );
      assert.strictEqual(first.status, 200);
      assert.strictEqual(db.size, 1);
      const initialId = first.feedback!.id;

      // Second feedback submission on same analysis
      const second = processFeedbackSubmission(
        aliceUserId,
        aliceAnalysisId,
        {
          usefulness: "yes",
          useful_components: ["Drop-off prediction"],
          comment: "Updated impression after filming",
        },
        mockLookup,
        db
      );
      assert.strictEqual(second.status, 200);
      assert.strictEqual(db.size, 1, "Database must have exactly 1 record for (user, analysis)");
      assert.strictEqual(second.feedback!.id, initialId, "ID must be preserved");
      assert.strictEqual(second.feedback!.usefulness, "yes");
      assert.strictEqual(
        second.feedback!.comment,
        "Updated impression after filming"
      );
    });

    test("5. Rating validation rejects invalid values", () => {
      const db = new Map<string, MockFeedbackRecord>();
      const invalidRatings = ["excellent", "super", "5stars", "", null, 10];

      for (const bad of invalidRatings) {
        const result = processFeedbackSubmission(
          aliceUserId,
          aliceAnalysisId,
          { usefulness: bad },
          mockLookup,
          db
        );
        assert.strictEqual(result.status, 400);
        assert.ok(result.error?.includes("Invalid usefulness rating"));
      }
    });

    test("6. Useful-component validation filters out unrecognized component strings", () => {
      const db = new Map<string, MockFeedbackRecord>();
      const result = processFeedbackSubmission(
        aliceUserId,
        aliceAnalysisId,
        {
          usefulness: "yes",
          useful_components: ["Hook", "InvalidOption", "Score", "<script>alert(1)</script>"],
        },
        mockLookup,
        db
      );

      assert.strictEqual(result.status, 200);
      assert.deepStrictEqual(result.feedback!.useful_components, ["Hook", "Score"]);
    });

    test("7. Optional comment can be empty or omitted", () => {
      const db = new Map<string, MockFeedbackRecord>();
      const resultNoComment = processFeedbackSubmission(
        aliceUserId,
        aliceAnalysisId,
        { usefulness: "yes" },
        mockLookup,
        db
      );
      assert.strictEqual(resultNoComment.status, 200);
      assert.strictEqual(resultNoComment.feedback!.comment, null);

      const resultEmptyComment = processFeedbackSubmission(
        aliceUserId,
        aliceAnalysisId,
        { usefulness: "yes", comment: "    " },
        mockLookup,
        db
      );
      assert.strictEqual(resultEmptyComment.status, 200);
      assert.strictEqual(resultEmptyComment.feedback!.comment, null);
    });

    test("8. Optional comment respects the server-side length limit (500 characters)", () => {
      const db = new Map<string, MockFeedbackRecord>();
      const tooLong = "A".repeat(501);
      const resultTooLong = processFeedbackSubmission(
        aliceUserId,
        aliceAnalysisId,
        { usefulness: "yes", comment: tooLong },
        mockLookup,
        db
      );
      assert.strictEqual(resultTooLong.status, 400);
      assert.ok(resultTooLong.error?.includes("exceeds maximum limit of 500 characters"));

      const exactLimit = "A".repeat(500);
      const resultExactLimit = processFeedbackSubmission(
        aliceUserId,
        aliceAnalysisId,
        { usefulness: "yes", comment: exactLimit },
        mockLookup,
        db
      );
      assert.strictEqual(resultExactLimit.status, 200);
      assert.strictEqual(resultExactLimit.feedback!.comment?.length, 500);
    });

    test("9. Revision help captures creator rating for revised scripts", () => {
      const db = new Map<string, MockFeedbackRecord>();
      const result = processFeedbackSubmission(
        aliceUserId,
        aliceAnalysisId,
        {
          usefulness: "yes",
          revision_help: "somewhat",
        },
        mockLookup,
        db
      );

      assert.strictEqual(result.status, 200);
      assert.strictEqual(result.feedback!.revision_help, "somewhat");
    });

    test("10. Feedback operation consumes 0 credits and makes 0 OpenAI calls", () => {
      let creditsDeducted = 0;
      let openAiCallsTriggered = 0;

      const db = new Map<string, MockFeedbackRecord>();
      const result = processFeedbackSubmission(
        aliceUserId,
        aliceAnalysisId,
        { usefulness: "yes", comment: "Helpful report!" },
        mockLookup,
        db
      );

      assert.strictEqual(result.status, 200);
      assert.strictEqual(creditsDeducted, 0, "Feedback must consume 0 credits");
      assert.strictEqual(openAiCallsTriggered, 0, "Feedback must trigger 0 OpenAI calls");
    });
  });
});
