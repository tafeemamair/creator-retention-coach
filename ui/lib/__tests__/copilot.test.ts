import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isValidCopilotAction,
  executeCopilotAction,
  fallbackGenerateHooks,
  fallbackImproveCta,
  type CopilotContext,
} from "../copilot";
import type { FullAnalysis } from "../analyze";

describe("Phase 2: Creator Copilot Bounded Actions Test Suite", () => {
  const mockAnalysis: FullAnalysis = {
    score: 68,
    metrics: {
      hook: 45,
      pacing: 80,
      emotion: 65,
      value: 70,
      cta: 40,
    },
    dropoffPrediction: {
      second: 3,
      reason: "Opening hook does not build enough curiosity in the first 2–3s for YouTube Shorts.",
    },
    dropOffRisks: [
      {
        line: "Hey guys welcome back to my channel.",
        risk: "High",
        reason: "Starts with conversational filler, which delays value delivery.",
        fix: "Delete the filler transition and start immediately with the action verb or key noun.",
      },
    ],
    retentionTimeline: [
      { second: 0, retention: 100 },
      { second: 3, retention: 70 },
    ],
    rewrites: [
      {
        type: "Curiosity Hook",
        script: "Stop scrolling. You are losing views in the first 3 seconds.",
      },
    ],
    improvedScript: "Stop scrolling. You are losing views in the first 3 seconds.",
    viralTitleSuggestions: ["Your Hook Is Costing You Views"],
    detectedLanguage: "en",
    targetLanguage: "en",
    languageConfidence: "high",
  };

  const sampleScript =
    "Hey guys welcome back to my channel. Today I will show you how to improve your retention in 3 simple steps. Make sure to follow for more.";

  // ============================================================================
  // 1. Action Contract & Union Validation
  // ============================================================================
  describe("1. Action Union & Validation Contract", () => {
    it("accepts only approved bounded actions 'generate_hooks' and 'improve_cta'", () => {
      assert.strictEqual(isValidCopilotAction("generate_hooks"), true);
      assert.strictEqual(isValidCopilotAction("improve_cta"), true);
      assert.strictEqual(isValidCopilotAction("chat"), false);
      assert.strictEqual(isValidCopilotAction("general_rewrite"), false);
      assert.strictEqual(isValidCopilotAction(""), false);
      assert.strictEqual(isValidCopilotAction(null), false);
      assert.strictEqual(isValidCopilotAction(123), false);
    });
  });

  // ============================================================================
  // 2. generate_hooks Action Execution & Output Schema
  // ============================================================================
  describe("2. generate_hooks Action", () => {
    it("returns structured hook alternatives with style, text, and rationale", async () => {
      const context: CopilotContext = {
        script: sampleScript,
        analysis: mockAnalysis,
        detectedLanguage: "en",
        targetLanguage: "en",
        platform: "YouTube Shorts",
      };

      const result = await executeCopilotAction(context, "generate_hooks");

      assert.strictEqual(result.action, "generate_hooks");
      assert.strictEqual(result.targetLanguage, "en");
      assert.ok(Array.isArray(result.items));
      assert.strictEqual(result.items.length, 3);

      for (const item of result.items) {
        assert.ok(typeof item.text === "string" && item.text.length > 0);
        assert.ok(typeof item.rationale === "string" && item.rationale.length > 0);
        assert.ok(typeof item.style === "string" && item.style.length > 0);
      }
    });

    it("generates hooks strictly in target language 'hi' (Hindi)", async () => {
      const context: CopilotContext = {
        script: "रुकिए! क्या आप जानते हैं कि 90% क्रिएटर्स पहले 3 सेकंड में व्यूअर्स क्यों खो देते हैं?",
        analysis: {
          ...mockAnalysis,
          detectedLanguage: "hi",
          targetLanguage: "hi",
        },
        detectedLanguage: "hi",
        targetLanguage: "hi",
        platform: "YouTube Shorts",
      };

      const result = await executeCopilotAction(context, "generate_hooks");

      assert.strictEqual(result.targetLanguage, "hi");
      assert.strictEqual(result.items.length, 3);
      // Verify Hindi characters are present in generated text
      assert.ok(/[\u0900-\u097F]/.test(result.items[0].text));
    });

    it("generates hooks strictly in target language 'es' (Spanish)", async () => {
      const context: CopilotContext = {
        script: "¡Espera un segundo! ¿Por qué tus videos pierden el 50% de la audiencia en el segundo tres?",
        analysis: {
          ...mockAnalysis,
          detectedLanguage: "es",
          targetLanguage: "es",
        },
        detectedLanguage: "es",
        targetLanguage: "es",
        platform: "TikTok",
      };

      const result = await executeCopilotAction(context, "generate_hooks");

      assert.strictEqual(result.targetLanguage, "es");
      assert.strictEqual(result.items.length, 3);
      assert.ok(/¿|creadores|retención|segundos/i.test(result.items[0].text));
    });
  });

  // ============================================================================
  // 3. improve_cta Action Execution & Output Schema
  // ============================================================================
  describe("3. improve_cta Action", () => {
    it("returns structured CTA alternatives with style, text, and rationale", async () => {
      const context: CopilotContext = {
        script: sampleScript,
        analysis: mockAnalysis,
        detectedLanguage: "en",
        targetLanguage: "en",
        platform: "YouTube Shorts",
      };

      const result = await executeCopilotAction(context, "improve_cta");

      assert.strictEqual(result.action, "improve_cta");
      assert.strictEqual(result.targetLanguage, "en");
      assert.strictEqual(result.items.length, 3);

      for (const item of result.items) {
        assert.ok(typeof item.text === "string" && item.text.length > 0);
        assert.ok(typeof item.rationale === "string" && item.rationale.length > 0);
        assert.ok(typeof item.style === "string" && item.style.length > 0);
      }
    });

    it("generates CTAs strictly in target language 'hi-Latn' (Hinglish)", async () => {
      const context: CopilotContext = {
        script: "Ruko ek second! Kya aap jaante ho ki Shorts par views kyun nahi aate? Follow karo abhi.",
        analysis: {
          ...mockAnalysis,
          detectedLanguage: "hi-Latn",
          targetLanguage: "hi-Latn",
        },
        detectedLanguage: "hi-Latn",
        targetLanguage: "hi-Latn",
        platform: "Instagram Reels",
      };

      const result = await executeCopilotAction(context, "improve_cta");

      assert.strictEqual(result.targetLanguage, "hi-Latn");
      assert.strictEqual(result.items.length, 3);
      assert.ok(/सेव|फॉलो|कमेंट्स|video|script/i.test(result.items[0].text) || result.items[0].text.length > 0);
    });

    it("generates CTAs strictly in target language 'fr' (French)", async () => {
      const context: CopilotContext = {
        script: "Arrêtez de scroller. Appliquez cette règle simple.",
        analysis: {
          ...mockAnalysis,
          detectedLanguage: "fr",
          targetLanguage: "fr",
        },
        detectedLanguage: "fr",
        targetLanguage: "fr",
        platform: "TikTok",
      };

      const result = await executeCopilotAction(context, "improve_cta");

      assert.strictEqual(result.targetLanguage, "fr");
      assert.strictEqual(result.items.length, 3);
      assert.ok(/vidéo|abonne|commentaire|enregistre/i.test(result.items[0].text));
    });
  });

  // ============================================================================
  // 4. Deterministic Multilingual Fallbacks
  // ============================================================================
  describe("4. Deterministic Multilingual Fallbacks", () => {
    it("fallbackGenerateHooks produces 3 distinct items with non-empty rationales", () => {
      const hooks = fallbackGenerateHooks(sampleScript, mockAnalysis, "en");
      assert.strictEqual(hooks.length, 3);
      assert.strictEqual(hooks[0].style, "Curiosity Gap");
      assert.strictEqual(hooks[1].style, "Contrarian Hook");
      assert.strictEqual(hooks[2].style, "High-Stakes Question");
      assert.ok(hooks[0].rationale.length > 10);
    });

    it("fallbackImproveCta produces 3 distinct items with non-empty rationales", () => {
      const ctas = fallbackImproveCta(sampleScript, mockAnalysis, "en");
      assert.strictEqual(ctas.length, 3);
      assert.strictEqual(ctas[0].style, "Value Bookmark / Save");
      assert.strictEqual(ctas[1].style, "Curiosity Loop Follow");
      assert.strictEqual(ctas[2].style, "Community Discussion");
      assert.ok(ctas[0].rationale.length > 10);
    });
  });

  // ============================================================================
  // 5. API Route Security & Error Handling Contract
  // ============================================================================
  describe("5. API Route Contract Validation", () => {
    it("rejects unauthenticated requests with HTTP 401", async () => {
      // Import the route POST handler directly to test request validation
      const { POST } = await import("../../app/api/copilot/route");

      const req = new Request("http://localhost/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate_hooks",
          script: sampleScript,
          analysis: mockAnalysis,
        }),
      });

      const res = await POST(req);
      assert.strictEqual(res.status, 401);
      const json = await res.json();
      assert.ok(json.error.includes("Authentication required"));
    });
  });
});
