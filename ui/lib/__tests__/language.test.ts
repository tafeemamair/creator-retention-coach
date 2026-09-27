import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import { detectLanguage } from "../language";
import {
  splitIntoSentences,
  metricScore,
  analyzeRetention,
  fallbackDropOffRisks,
} from "../analyze";

describe("Phase 1: Multilingual Foundation Test Suite", () => {
  // ============================================================================
  // 1. Language Detection & Script Family Classification
  // ============================================================================
  describe("1. Deterministic Language Detection", () => {
    it("Test 1: English creator script detects 'en' with high confidence", () => {
      const script =
        "Stop scrolling right now. If your retention drops in the first 3 seconds, your hook is broken. Here are 3 fixes.";
      const res = detectLanguage(script);

      assert.strictEqual(res.language, "en");
      assert.strictEqual(res.confidence, "high");
      assert.strictEqual(res.scriptFamily, "latin");
    });

    it("Test 2: Hindi Devanagari script detects 'hi' with high confidence", () => {
      const script =
        "रुकिए! क्या आप जानते हैं कि 90% क्रिएटर्स पहले 3 सेकंड में व्यूअर्स क्यों खो देते हैं? इसका मुख्य कारण है स्लो हुक।";
      const res = detectLanguage(script);

      assert.strictEqual(res.language, "hi");
      assert.strictEqual(res.confidence, "high");
      assert.strictEqual(res.scriptFamily, "devanagari");
    });

    it("Test 3: Spanish script with inverted punctuation detects 'es' with high confidence", () => {
      const script =
        "¡Espera un segundo! ¿Por qué tus videos pierden el 50% de la audiencia en el segundo tres? El problema es tu gancho. Sígueme para más.";
      const res = detectLanguage(script);

      assert.strictEqual(res.language, "es");
      assert.strictEqual(res.confidence, "high");
      assert.strictEqual(res.scriptFamily, "latin");
    });

    it("Test 4: Hinglish (Romanized Hindi) script detects 'hi-Latn' with medium/high confidence", () => {
      const script =
        "Ruko ek second! Kya aap jaante ho ki aapke Shorts par views kyun nahi aate? Problem aapka opening hook hai. Follow karo abhi.";
      const res = detectLanguage(script);

      assert.strictEqual(res.language, "hi-Latn");
      assert.ok(res.confidence === "medium" || res.confidence === "high");
      assert.strictEqual(res.scriptFamily, "latin");
    });

    it("Test 5: French script with diacritics detects 'fr' with high confidence", () => {
      const script =
        "Arrêtez de scroller immédiatement. Si vous voulez doubler votre temps de visionnage, appliquez cette règle simple.";
      const res = detectLanguage(script);

      assert.strictEqual(res.language, "fr");
      assert.strictEqual(res.confidence, "high");
      assert.strictEqual(res.scriptFamily, "latin");
    });

    it("Detects Portuguese creator script accurately", () => {
      const script =
        "Pare de rolar agora. Se você quer dobrar a retenção dos seus vídeos, siga esta dica simples.";
      const res = detectLanguage(script);

      assert.strictEqual(res.language, "pt");
      assert.strictEqual(res.confidence, "high");
      assert.strictEqual(res.scriptFamily, "latin");
    });

    it("Detects German creator script accurately", () => {
      const script =
        "Hör auf zu scrollen. Wenn du deine Zuschauer in den ersten drei Sekunden halten willst, mache diesen Fehler nicht.";
      const res = detectLanguage(script);

      assert.strictEqual(res.language, "de");
      assert.strictEqual(res.confidence, "high");
      assert.strictEqual(res.scriptFamily, "latin");
    });

    it("Test 8: Ambiguous short Latin text falls back conservatively with low confidence", () => {
      const script = "10x your video reach with this secret.";
      const res = detectLanguage(script);

      assert.strictEqual(res.language, "en");
      assert.strictEqual(res.confidence, "low");
      assert.strictEqual(res.scriptFamily, "latin");
    });

    it("Handles empty, whitespace, and non-letter inputs safely", () => {
      assert.strictEqual(detectLanguage("").language, "en");
      assert.strictEqual(detectLanguage("   \n\t  ").confidence, "low");
      assert.strictEqual(detectLanguage("12345 67890 ??? !!!").language, "en");
    });
  });

  // ============================================================================
  // 2. Multilingual Sentence Segmentation
  // ============================================================================
  describe("2. Multilingual Sentence Segmentation", () => {
    it("Test 6: Correctly segments mixed Hindi punctuation across '?' and Devanagari danda '।'", () => {
      const script = "क्या आप तैयार हैं? यह तरीका आपका चैनल बदल देगा। आज ही आज़माएं।";
      const sentences = splitIntoSentences(script);

      assert.strictEqual(sentences.length, 3);
      assert.strictEqual(sentences[0], "क्या आप तैयार हैं?");
      assert.strictEqual(sentences[1], "यह तरीका आपका चैनल बदल देगा।");
      assert.strictEqual(sentences[2], "आज ही आज़माएं।");
    });

    it("Correctly segments Spanish text with inverted question and exclamation marks", () => {
      const script =
        "¡Espera un segundo! ¿Por qué tus videos pierden el 50% de la audiencia en el segundo tres? El problema es tu gancho. Sígueme para más.";
      const sentences = splitIntoSentences(script);

      assert.strictEqual(sentences.length, 4);
      assert.strictEqual(sentences[0], "¡Espera un segundo!");
      assert.strictEqual(
        sentences[1],
        "¿Por qué tus videos pierden el 50% de la audiencia en el segundo tres?"
      );
      assert.strictEqual(sentences[2], "El problema es tu gancho.");
      assert.strictEqual(sentences[3], "Sígueme para más.");
    });
  });

  // ============================================================================
  // 3. Language-Aware Analytical Scoring
  // ============================================================================
  describe("3. Language-Aware Analytical Scoring", () => {
    it("Test 7: Emotional Hindi script produces valid non-zero emotion score without English AFINN distortion", () => {
      const emotionalHindi =
        "मुझे बहुत डर लग रहा था जब मेरे चैनल के व्यूज जीरो हो गए! लेकिन इस एक सीक्रेट ने सब कुछ बदल दिया। क्या आप भी ऐसा महसूस करते हैं?";

      const res = metricScore(emotionalHindi, "YouTube Shorts");

      // Emotion should not be clamped to zero or broken
      assert.ok(
        res.metrics.emotion >= 50,
        `Expected emotion >= 50 for emotional Hindi with exclamation, got ${res.metrics.emotion}`
      );
      assert.ok(
        res.metrics.pacing >= 60,
        `Expected pacing >= 60, got ${res.metrics.pacing}`
      );
      assert.ok(res.dropoffPrediction.second > 0);
    });

    it("Spanish script produces valid retention metrics and timeline", () => {
      const spanishScript =
        "¡Espera un segundo! ¿Por qué tus videos pierden el 50% de la audiencia en el segundo tres? El problema es tu gancho. Sígueme para más.";

      const res = metricScore(spanishScript, "TikTok");

      assert.ok(res.metrics.hook >= 60, `Hook score expected >= 60, got ${res.metrics.hook}`);
      assert.ok(res.metrics.cta >= 70, `CTA score expected >= 70 (Sígueme), got ${res.metrics.cta}`);
      assert.ok(res.timeline.length >= 5);
    });

    it("Hinglish script produces valid retention metrics and non-empty line risks", () => {
      const hinglishScript =
        "Ruko ek second! Kya aap jaante ho ki aapke Shorts par views kyun nahi aate? Problem aapka opening hook hai. Follow karo abhi.";

      const risks = fallbackDropOffRisks(hinglishScript, "YouTube Shorts", "hi-Latn");
      assert.ok(risks.length >= 3);
      assert.strictEqual(risks[0].line, "Ruko ek second!");
    });
  });

  // ============================================================================
  // 4. Main analyzeRetention Engine Contract with Language Metadata
  // ============================================================================
  describe("4. analyzeRetention Language Metadata", () => {
    it("attaches detectedLanguage, targetLanguage, and languageConfidence to preview output", async () => {
      const script = "Stop scrolling right now. This simple formula doubles watch time.";
      const preview = await analyzeRetention(script, { full: false, platform: "YouTube Shorts" });

      assert.strictEqual(preview.detectedLanguage, "en");
      assert.strictEqual(preview.targetLanguage, "en");
      assert.ok(preview.languageConfidence === "high" || preview.languageConfidence === "medium");
      assert.ok(preview.score > 0);
    });

    it("attaches Hindi language context and respects custom targetLanguage", async () => {
      const hindiScript =
        "रुकिए! क्या आप जानते हैं कि 90% क्रिएटर्स पहले 3 सेकंड में व्यूअर्स क्यों खो देते हैं? इसका मुख्य कारण है स्लो हुक।";
      const preview = await analyzeRetention(hindiScript, {
        full: false,
        platform: "YouTube Shorts",
        targetLanguage: "hi",
      });

      assert.strictEqual(preview.detectedLanguage, "hi");
      assert.strictEqual(preview.targetLanguage, "hi");
      assert.strictEqual(preview.languageConfidence, "high");
    });
  });

  // ============================================================================
  // 5. Database Migration File Validation
  // ============================================================================
  describe("5. Multilingual Database Migration", () => {
    it("contains valid migration SQL adding detected_language and target_language", () => {
      const migrationPath = path.join(
        process.cwd(),
        "supabase/migrations/20260924000000_v2_multilingual.sql"
      );
      assert.ok(fs.existsSync(migrationPath), "Migration file must exist");

      const content = fs.readFileSync(migrationPath, "utf-8");
      assert.ok(content.includes("detected_language TEXT NOT NULL DEFAULT 'en'"));
      assert.ok(content.includes("target_language TEXT NOT NULL DEFAULT 'en'"));
      assert.ok(content.includes("idx_analyses_detected_language"));
      assert.ok(content.includes("idx_analyses_target_language"));
    });
  });
});
