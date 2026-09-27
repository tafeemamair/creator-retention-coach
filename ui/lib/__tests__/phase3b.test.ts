import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import { formatFullAuditToMarkdown } from "../formatAudit";
import type { FullAnalysis } from "../analyze";
import { DELETE as deleteAnalysisHandler } from "../../app/api/analyses/[id]/route";

describe("Phase 3B: Workspace Functionality Completion", () => {
  const sampleAnalysis: FullAnalysis = {
    score: 82,
    metrics: {
      hook: 88,
      pacing: 74,
      emotion: 80,
      value: 85,
      cta: 70,
    },
    dropoffPrediction: {
      second: 8,
      reason: "Pacing slows down before the core payoff is introduced.",
    },
    dropOffRisks: [
      {
        line: "So today I wanted to talk about something interesting.",
        risk: "High",
        reason: "Slow opening filler invites immediate viewer swipe-away.",
        fix: "Cut the introductory filler and start directly with the intriguing discovery.",
      },
      {
        line: "Let me explain the background first.",
        risk: "Medium",
        reason: "Premature exposition stalls forward momentum.",
        fix: "Introduce the proof point before explaining the context.",
      },
    ],
    retentionTimeline: [
      { second: 0, retention: 100 },
      { second: 3, retention: 88 },
      { second: 8, retention: 70 },
    ],
    viralTitleSuggestions: [
      "Why Your Hook Is Costing You Views",
      "The 3-Second Fix For Shorts",
      "Stop Losing Viewers Fast",
    ],
    rewrites: [
      {
        type: "Curiosity Hook",
        script: "99% of creators make this exact mistake in the first 3 seconds...",
      },
      {
        type: "Fast-Paced Retention",
        script: "Here is the exact retention fix you need right now...",
      },
      {
        type: "Emotional Storytelling",
        script: "I used to lose half my audience by second 8 until I changed this...",
      },
    ],
    improvedScript: "Improved retention script...",
  };

  const sampleScript = "So today I wanted to talk about something interesting. Let me explain the background first.";

  // ============================================================================
  // 1. Full Audit Formatter Tests
  // ============================================================================
  describe("1. Full Audit Markdown Formatter", () => {
    it("formats complete report containing all scores, signals, risks, titles, and rewrites", () => {
      const output = formatFullAuditToMarkdown(sampleAnalysis, sampleScript, "YouTube Shorts");

      // Score and metadata
      assert.ok(output.includes("Overall Retention Score: 82/100"));
      assert.ok(output.includes("Platform: YouTube Shorts"));
      assert.ok(output.includes("Length: 15 words"));

      // Drop-off timing
      assert.ok(output.includes("Estimated Drop-Off Second: 8s"));
      assert.ok(output.includes("Pacing slows down before the core payoff is introduced."));

      // 5 Core Signals
      assert.ok(output.includes("Hook Strength: 88/100"));
      assert.ok(output.includes("Pacing Rhythm: 74/100"));
      assert.ok(output.includes("Emotional Intensity: 80/100"));
      assert.ok(output.includes("Value Delivery: 85/100"));
      assert.ok(output.includes("Call To Action: 70/100"));

      // Line-Level Risks with fixes
      assert.ok(output.includes("[High Risk] \"So today I wanted to talk about something interesting.\""));
      assert.ok(output.includes("→ Risk: Slow opening filler invites immediate viewer swipe-away."));
      assert.ok(output.includes("→ Suggested Fix: Cut the introductory filler and start directly with the intriguing discovery."));

      // Titles
      assert.ok(output.includes("1. Why Your Hook Is Costing You Views"));
      assert.ok(output.includes("2. The 3-Second Fix For Shorts"));
      assert.ok(output.includes("3. Stop Losing Viewers Fast"));

      // Rewrites
      assert.ok(output.includes("### 1. Curiosity Hook"));
      assert.ok(output.includes("99% of creators make this exact mistake in the first 3 seconds..."));
      assert.ok(output.includes("### 2. Fast-Paced Retention"));
      assert.ok(output.includes("### 3. Emotional Storytelling"));

      // Footer
      assert.ok(output.includes("https://www.creatorretentioncoach.in"));
    });

    it("handles empty or missing risks and rewrites safely without throwing", () => {
      const minimalAnalysis: FullAnalysis = {
        score: 95,
        metrics: { hook: 90, pacing: 95, emotion: 85, value: 90, cta: 80 },
        dropoffPrediction: { second: 25, reason: "Strong retention throughout." },
        dropOffRisks: [],
        retentionTimeline: [],
        viralTitleSuggestions: [],
        rewrites: [],
        improvedScript: "",
      };

      const output = formatFullAuditToMarkdown(minimalAnalysis, "", "TikTok");

      assert.ok(output.includes("Overall Retention Score: 95/100"));
      assert.ok(output.includes("Platform: TikTok"));
      assert.ok(output.includes("No critical drop-off risks detected"));
      assert.ok(output.includes("None generated."));
      assert.ok(output.includes("No rewrites available."));
    });
  });

  // ============================================================================
  // 2. Analysis Deletion Authorization & API Tests
  // ============================================================================
  describe("2. Analysis Deletion Route & Authorization", () => {
    it("returns HTTP 401 when request is unauthenticated", async () => {
      const req = new Request("http://localhost:3000/api/analyses/12345", {
        method: "DELETE",
      });

      const res = await deleteAnalysisHandler(req, {
        params: Promise.resolve({ id: "12345" }),
      });

      assert.equal(res.status, 401);
      const data = await res.json();
      assert.equal(data.error, "Authentication required");
    });

    it("returns HTTP 400 when analysis ID is missing", async () => {
      const req = new Request("http://localhost:3000/api/analyses/", {
        method: "DELETE",
      });

      const res = await deleteAnalysisHandler(req, {
        params: Promise.resolve({ id: "" }),
      });

      assert.equal(res.status, 400);
      const data = await res.json();
      assert.equal(data.error, "Analysis ID is required");
    });

    it("verifies DELETE route enforces user_id and analysis id dual constraint", () => {
      const routePath = path.resolve(__dirname, "../../app/api/analyses/[id]/route.ts");
      const routeSource = fs.readFileSync(routePath, "utf-8");

      assert.ok(
        routeSource.includes('.eq("id", id)') && routeSource.includes('.eq("user_id", user.id)'),
        "Deletion query must strictly scope to BOTH id and authenticated user.id"
      );
      assert.ok(
        routeSource.includes('"Analysis not found"'),
        "Must return 404 Analysis not found if non-owner or nonexistent"
      );
    });

    it("verifies DeleteAnalysisButton is wired into both list and detail views", () => {
      const listPagePath = path.resolve(__dirname, "../../app/app/analyses/page.tsx");
      const detailPagePath = path.resolve(__dirname, "../../app/app/analyses/[id]/page.tsx");

      const listSource = fs.readFileSync(listPagePath, "utf-8");
      const detailSource = fs.readFileSync(detailPagePath, "utf-8");

      assert.ok(
        listSource.includes("<DeleteAnalysisButton"),
        "MyAnalysesPage table must render DeleteAnalysisButton"
      );
      assert.ok(
        detailSource.includes("<DeleteAnalysisButton"),
        "AnalysisDetailPage header must render DeleteAnalysisButton"
      );
    });
  });

  // ============================================================================
  // 3. Saved Re-Analysis Credit State & Idempotency Tests
  // ============================================================================
  describe("3. Saved Re-Analysis Credit State & Parity", () => {
    it("verifies idempotent re-analysis branch returns creditsRemaining", () => {
      const analyzePath = path.resolve(__dirname, "../../app/api/analyze-full/route.ts");
      const analyzeSource = fs.readFileSync(analyzePath, "utf-8");

      assert.ok(
        analyzeSource.includes("idempotent: true") && analyzeSource.includes("creditsRemaining: paidCredits"),
        "Idempotent re-analysis return branch must include creditsRemaining"
      );
    });

    it("verifies SavedAnalysisReportView hydrates entitlement on mount and handles HTTP 402", () => {
      const viewPath = path.resolve(__dirname, "../../components/analyses/SavedAnalysisReportView.tsx");
      const viewSource = fs.readFileSync(viewPath, "utf-8");

      // Fetches entitlement on mount
      assert.ok(
        viewSource.includes('fetch("/api/entitlement")'),
        "SavedAnalysisReportView must fetch active entitlement on mount"
      );

      // Handles HTTP 402 gracefully
      assert.ok(
        viewSource.includes("res.status === 402"),
        "SavedAnalysisReportView must handle HTTP 402 out-of-credits response"
      );

      // Invokes router.refresh() on success
      assert.ok(
        viewSource.includes("router.refresh()"),
        "SavedAnalysisReportView must call router.refresh() on re-analysis completion"
      );

      // Passes real entitlement state to AnalysisDashboardView
      assert.ok(
        !viewSource.includes("creditsRemaining={null}"),
        "SavedAnalysisReportView must not pass null creditsRemaining"
      );
      assert.ok(
        viewSource.includes("creditsRemaining={creditsRemaining}"),
        "SavedAnalysisReportView must pass active creditsRemaining state"
      );
    });

    it("verifies AnalysisDashboardView renders Copy Full Audit button", () => {
      const dashPath = path.resolve(__dirname, "../../components/results/AnalysisDashboardView.tsx");
      const dashSource = fs.readFileSync(dashPath, "utf-8");

      assert.ok(
        dashSource.includes('label="Copy Full Audit"'),
        "AnalysisDashboardView must render Copy Full Audit button"
      );
      assert.ok(
        dashSource.includes("formatFullAuditToMarkdown"),
        "AnalysisDashboardView must use formatFullAuditToMarkdown"
      );
    });
  });
});
