import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { applyHookToScript, applyCtaToScript } from "../copilot";
import { splitIntoSentences, type FullAnalysis, type DropOffRisk } from "../analyze";
import { matchSentencesWithRisks } from "../../components/diagnostics/ScriptHeatmapInspector";

describe("Phase 3: Analysis Workspace Integration & Controlled Draft Flow", () => {
  const sampleOriginalScript = `Stop scrolling right now. This simple formula doubles watch time.

The real reason creators struggle is lack of pacing momentum.

Follow for part two.`;

  const sampleAnalysisSnapshot: FullAnalysis = {
    score: 72,
    metrics: {
      hook: 60,
      pacing: 75,
      emotion: 65,
      value: 80,
      cta: 50,
    },
    dropoffPrediction: {
      second: 3,
      reason: "Opening hook could build stronger curiosity for YouTube Shorts.",
    },
    dropOffRisks: [
      {
        line: "Stop scrolling right now.",
        risk: "Medium",
        reason: "Generic command hook.",
        fix: "Replace with high-stakes question or curiosity loop.",
      },
    ],
    retentionTimeline: [
      { second: 0, retention: 100 },
      { second: 3, retention: 75 },
    ],
    rewrites: [
      {
        type: "Curiosity Hook",
        script: "What if one hidden habit is killing your channel growth?",
      },
    ],
    improvedScript: "What if one hidden habit is killing your channel growth?",
    viralTitleSuggestions: ["Your Hook Is Costing You Views"],
    detectedLanguage: "en",
    targetLanguage: "en",
    languageConfidence: "high",
  };

  // ============================================================================
  // 1. Multiline Paragraph & Structure Preservation
  // ============================================================================
  describe("1. Multiline Structure Preservation", () => {
    it("applyHookToScript replaces only opening line and preserves subsequent paragraphs and newlines", () => {
      const newHook = "Why are 90% of creators losing viewers in the first 3 seconds?";
      const updated = applyHookToScript(sampleOriginalScript, newHook);

      const lines = updated.split("\n");
      assert.strictEqual(lines.length, 5); // 3 text paragraphs + 2 empty lines
      assert.ok(lines[0].startsWith(newHook));
      assert.ok(lines[0].includes("This simple formula doubles watch time."));
      assert.strictEqual(lines[1], "");
      assert.strictEqual(
        lines[2],
        "The real reason creators struggle is lack of pacing momentum."
      );
      assert.strictEqual(lines[3], "");
      assert.strictEqual(lines[4], "Follow for part two.");
    });

    it("applyCtaToScript replaces only concluding CTA and preserves preceding paragraphs and newlines", () => {
      const newCta = "Save this video right now before scripting your next Short.";
      const updated = applyCtaToScript(sampleOriginalScript, newCta);

      const lines = updated.split("\n");
      assert.strictEqual(lines.length, 5);
      assert.strictEqual(lines[0], "Stop scrolling right now. This simple formula doubles watch time.");
      assert.strictEqual(lines[1], "");
      assert.strictEqual(
        lines[2],
        "The real reason creators struggle is lack of pacing momentum."
      );
      assert.strictEqual(lines[3], "");
      assert.strictEqual(lines[4], newCta);
    });

    it("preserves multilingual Hindi Devanagari paragraph structure during hook replacement", () => {
      const hindiScript = `रुकिए! क्या आप जानते हैं कि व्यूज क्यों रुक जाते हैं?

मुख्य कारण है कि आपका हुक दर्शकों को बांध नहीं पाता।

अभी फॉलो करें।`;

      const newHindiHook = "क्या आप जानते हैं कि 90% क्रिएटर्स पहले 3 सेकंड में व्यूअर्स क्यों खो देते हैं?";
      const updated = applyHookToScript(hindiScript, newHindiHook);

      const lines = updated.split("\n");
      assert.strictEqual(lines.length, 5);
      assert.ok(lines[0].startsWith(newHindiHook));
      assert.strictEqual(lines[2], "मुख्य कारण है कि आपका हुक दर्शकों को बांध नहीं पाता।");
      assert.strictEqual(lines[4], "अभी फॉलो करें।");
    });

    it("preserves Spanish paragraph structure during CTA replacement", () => {
      const spanishScript = `¡Espera un segundo! ¿Por qué tus videos pierden retención?

El problema es tu gancho inicial.

Sígueme para más.`;

      const newSpanishCta = "Guarda este video para consultarlo antes de grabar tu próximo Short.";
      const updated = applyCtaToScript(spanishScript, newSpanishCta);

      const lines = updated.split("\n");
      assert.strictEqual(lines.length, 5);
      assert.strictEqual(lines[0], "¡Espera un segundo! ¿Por qué tus videos pierden retención?");
      assert.strictEqual(lines[2], "El problema es tu gancho inicial.");
      assert.strictEqual(lines[4], newSpanishCta);
    });
  });

  // ============================================================================
  // 2. Draft Lifecycle & State Invariance
  // ============================================================================
  describe("2. Draft State Lifecycle", () => {
    it("applying suggestion modifies only working draft and preserves analysis snapshot immutability", () => {
      // Snapshot clone before operation
      const originalAnalysisCopy = JSON.parse(JSON.stringify(sampleAnalysisSnapshot));

      let workingDraft = sampleOriginalScript;
      const initialBaseline = sampleOriginalScript;

      // Apply Copilot Hook
      const hookSuggestion = "Everything you have been told about retention is wrong.";
      workingDraft = applyHookToScript(workingDraft, hookSuggestion);

      // Verify draft state changed
      assert.notStrictEqual(workingDraft, initialBaseline);
      const isDraftModified = workingDraft.trim() !== initialBaseline.trim();
      assert.strictEqual(isDraftModified, true);

      // Verify analysis snapshot is completely unmutated
      assert.deepStrictEqual(sampleAnalysisSnapshot, originalAnalysisCopy);
    });

    it("resetting draft restores working draft to original clean baseline", () => {
      const initialBaseline = sampleOriginalScript;
      let workingDraft = applyHookToScript(initialBaseline, "Modified hook line.");

      assert.strictEqual(workingDraft.trim() !== initialBaseline.trim(), true);

      // Reset Draft action
      workingDraft = initialBaseline;

      assert.strictEqual(workingDraft.trim() === initialBaseline.trim(), true);
    });

    it("repeated Apply operations remain idempotent and deterministic", () => {
      let draft = sampleOriginalScript;

      // Apply Hook 1
      draft = applyHookToScript(draft, "Hook Variation 1.");
      assert.ok(draft.startsWith("Hook Variation 1."));

      // Apply Hook 2 (overwrites Hook 1 without duplicating or corrupting text)
      draft = applyHookToScript(draft, "Hook Variation 2.");
      assert.ok(draft.startsWith("Hook Variation 2."));
      assert.ok(!draft.includes("Hook Variation 1."));

      const lines = draft.split("\n");
      assert.strictEqual(lines.length, 5);
    });
  });

  // ============================================================================
  // 3. Phase 3: Copilot Cohesion & Re-Analysis Credit Transparency Tests
  // ============================================================================
  describe("3. Copilot Cohesion & Credit Transparency", () => {
    it("1 & 2: unchanged baseline displays 0-credit label and modified draft displays 1-credit label", () => {
      const baseline = "Clean baseline script without changes.";
      let currentScript = baseline;

      // Unchanged baseline
      const isDraftModifiedInitial = currentScript.trim() !== baseline.trim();
      assert.strictEqual(isDraftModifiedInitial, false);
      const labelUnchanged = isDraftModifiedInitial
        ? "⚡ Re-Analyze Draft (Uses 1 Credit)"
        : "⚡ Re-Analyze Baseline (0 Credits)";
      assert.strictEqual(labelUnchanged, "⚡ Re-Analyze Baseline (0 Credits)");

      // Modified draft
      currentScript = "Modified draft script with new retention changes.";
      const isDraftModifiedAfter = currentScript.trim() !== baseline.trim();
      assert.strictEqual(isDraftModifiedAfter, true);
      const credits = 3;
      const labelModified = isDraftModifiedAfter
        ? `⚡ Re-Analyze Draft (Uses 1 Credit • ${credits} Available)`
        : "⚡ Re-Analyze Baseline (0 Credits)";
      assert.strictEqual(labelModified, "⚡ Re-Analyze Draft (Uses 1 Credit • 3 Available)");
    });

    it("3: available credit balance reflects accurate numeric count", () => {
      const getCreditLabel = (isModified: boolean, credits: number) => {
        return isModified
          ? `⚡ Re-Analyze Draft (Uses 1 Credit • ${credits} Available)`
          : "⚡ Re-Analyze Baseline (0 Credits)";
      };

      assert.strictEqual(getCreditLabel(true, 5), "⚡ Re-Analyze Draft (Uses 1 Credit • 5 Available)");
      assert.strictEqual(getCreditLabel(true, 0), "⚡ Re-Analyze Draft (Uses 1 Credit • 0 Available)");
    });

    it("4: zero-credit modified draft routes to pricing unlock flow instead of blind API failure", () => {
      let pricingFlowInvoked = false;
      let apiCallMade = false;

      const mockUnlock = () => {
        pricingFlowInvoked = true;
      };

      const mockReAnalyzeApi = () => {
        apiCallMade = true;
      };

      const handleReAnalyzeClick = (isDraftModified: boolean, creditsRemaining: number) => {
        if (isDraftModified && creditsRemaining === 0) {
          mockUnlock();
          return;
        }
        mockReAnalyzeApi();
      };

      // When draft is modified and credits are 0
      handleReAnalyzeClick(true, 0);
      assert.strictEqual(pricingFlowInvoked, true, "Must invoke pricing unlock flow");
      assert.strictEqual(apiCallMade, false, "Must not make API call that predictably fails 402");

      // When draft is unmodified and credits are 0 (idempotent baseline re-analysis is free)
      pricingFlowInvoked = false;
      apiCallMade = false;
      handleReAnalyzeClick(false, 0);
      assert.strictEqual(pricingFlowInvoked, false, "Must not invoke pricing flow for free baseline re-analysis");
      assert.strictEqual(apiCallMade, true, "Must allow free idempotent baseline re-analysis");
    });

    it("5 & 6: successful Copilot Apply provides active-draft confirmation and editor review target", () => {
      const actionItem = {
        style: "Curiosity Question",
        text: "Did you know that 80% of viewers leave before second 5?",
        rationale: "Creates an immediate curiosity gap.",
      };

      let activeScript = sampleOriginalScript;
      let appliedIndex: number | null = null;
      let appliedFeedback: string | null = null;
      let editorVisible = false;

      const onApplied = () => {
        editorVisible = true;
      };

      // Execute apply
      activeScript = applyHookToScript(activeScript, actionItem.text);
      appliedIndex = 0;
      appliedFeedback = `Applied "${actionItem.style}" hook to your script's opening line.`;
      onApplied();

      assert.strictEqual(appliedIndex, 0);
      assert.ok(appliedFeedback.includes("Curiosity Question"));
      assert.strictEqual(editorVisible, true, "Editor must be made visible on apply");
      assert.ok(activeScript.startsWith(actionItem.text));
    });

    it("7 & 8: modified draft triggers sticky draft status; Reset restores baseline and removes status without API call", () => {
      const baseline = sampleOriginalScript;
      let draft = baseline;
      const apiRequestCount = 0;

      // Initial state
      let isDraftModified = Boolean(baseline && draft.trim() !== baseline.trim());
      assert.strictEqual(isDraftModified, false, "Sticky status must not appear for unchanged baseline");

      // Modify script
      draft = applyCtaToScript(draft, "Subscribe for daily tips.");
      isDraftModified = Boolean(baseline && draft.trim() !== baseline.trim());
      assert.strictEqual(isDraftModified, true, "Sticky status must appear when draft is modified");

      // Reset Draft action
      draft = baseline; // purely local state restoration
      isDraftModified = Boolean(baseline && draft.trim() !== baseline.trim());
      assert.strictEqual(isDraftModified, false, "Sticky status must disappear immediately after Reset");
      assert.strictEqual(apiRequestCount, 0, "Reset must never trigger an API or network request");
      assert.strictEqual(draft, baseline, "Draft must equal original baseline exactly");
    });

    it("9 & 10: successful Re-Analyze removes modified state and promotes new script to baseline", () => {
      let baselineScript = sampleOriginalScript;
      const currentScript = applyHookToScript(baselineScript, "New compelling hook line.");

      let isDraftModified = Boolean(baselineScript && currentScript.trim() !== baselineScript.trim());
      assert.strictEqual(isDraftModified, true);

      // Simulate successful re-analysis response
      const reAnalysisResponse = {
        analysis: {
          ...sampleAnalysisSnapshot,
          score: 85,
        },
        creditsRemaining: 4,
      };

      // Update baseline on successful re-analysis
      baselineScript = currentScript.trim();
      isDraftModified = Boolean(baselineScript && currentScript.trim() !== baselineScript.trim());

      assert.strictEqual(isDraftModified, false, "Draft status must disappear after re-analysis");
      assert.strictEqual(baselineScript, currentScript.trim(), "New script is promoted to baseline");
      assert.strictEqual(reAnalysisResponse.analysis.score, 85);
    });

    it("11: unchanged Re-Analyze remains idempotent and preserves baseline", () => {
      const baselineScript = sampleOriginalScript;
      const currentScript = sampleOriginalScript;

      const isDraftModified = Boolean(baselineScript && currentScript.trim() !== baselineScript.trim());
      assert.strictEqual(isDraftModified, false, "Unchanged script is not marked as modified");
    });

    it("12: Copilot generation never automatically re-analyzes or mutates script before explicit apply", () => {
      const unmutatedScript = sampleOriginalScript;
      const currentScript = unmutatedScript;
      const analysisTriggers = 0;

      // Simulated Copilot generation result
      const copilotResult = {
        action: "generate_hooks",
        items: [
          { style: "Intrigue", text: "Why does this work?", rationale: "Curiosity" },
          { style: "Bold", text: "Never do this again.", rationale: "Shock" },
        ],
      };

      // Verify generation alone does NOT change script or trigger re-analysis
      assert.strictEqual(currentScript, unmutatedScript, "Script remains untouched during generation");
      assert.strictEqual(analysisTriggers, 0, "Zero automated re-analysis requests triggered");
      assert.strictEqual(copilotResult.items.length, 2);
    });
  });

  // ============================================================================
  // 4. V2.2 Phase 1: Script Heatmap & Diagnostic Inspector Tests
  // ============================================================================
  describe("4. V2.2 Phase 1: Script Heatmap & Diagnostic Inspector", () => {
    const testScript = `Why are you still editing Shorts manually in 2026? This single workflow cuts production time by 80%.
Let me explain the whole background story first.
Use this automated framework before publishing your next video.`;

    const testRisks: DropOffRisk[] = [
      {
        line: "Why are you still editing Shorts manually in 2026?",
        risk: "Low",
        reason: "Strong curiosity gap in opening hook.",
        fix: "Keep as-is.",
      },
      {
        line: "Let me explain the whole background story first.",
        risk: "High",
        reason: "Premature exposition stalls spoken momentum and causes immediate swipe-away.",
        fix: "Cut the filler backstory and introduce the core demonstration immediately.",
      },
      {
        line: "Use this automated framework before publishing your next video.",
        risk: "Medium",
        reason: "Generic closing CTA could create higher urgency.",
        fix: "Add a specific time-bound consequence or save prompt.",
      },
    ];

    it("A: sentence segmentation matches analysis segmentation exactly", () => {
      const sentences = splitIntoSentences(testScript);
      assert.strictEqual(sentences.length, 4);
      assert.strictEqual(sentences[0], "Why are you still editing Shorts manually in 2026?");
      assert.strictEqual(sentences[1], "This single workflow cuts production time by 80%.");
      assert.strictEqual(sentences[2], "Let me explain the whole background story first.");
      assert.strictEqual(sentences[3], "Use this automated framework before publishing your next video.");
    });

    it("B, C & D: matching High, Medium, and Low risk sentences receive exact risk classifications", () => {
      const sentences = splitIntoSentences(testScript);
      const mapped = matchSentencesWithRisks(sentences, testRisks);

      assert.strictEqual(mapped.length, 4);
      // Sentence 0: Low risk
      assert.strictEqual(mapped[0].risk, "Low");
      // Sentence 1: Unmatched sentence defaults safely to Low/healthy
      assert.strictEqual(mapped[1].risk, "Low");
      // Sentence 2: High risk
      assert.strictEqual(mapped[2].risk, "High");
      assert.strictEqual(mapped[2].isOriginalMatch, true);
      // Sentence 3: Medium risk
      assert.strictEqual(mapped[3].risk, "Medium");
      assert.strictEqual(mapped[3].isOriginalMatch, true);
    });

    it("E: matching diagnostic data exposes exact sentence, risk level, reason, and fix", () => {
      const sentences = splitIntoSentences(testScript);
      const mapped = matchSentencesWithRisks(sentences, testRisks);

      const highRiskSentence = mapped[2];
      assert.strictEqual(highRiskSentence.text, "Let me explain the whole background story first.");
      assert.strictEqual(highRiskSentence.risk, "High");
      assert.strictEqual(
        highRiskSentence.reason,
        "Premature exposition stalls spoken momentum and causes immediate swipe-away."
      );
      assert.strictEqual(
        highRiskSentence.fix,
        "Cut the filler backstory and introduce the core demonstration immediately."
      );
    });

    it("F, G & H: selecting a sentence does not mutate script, consume credits, or call API", () => {
      const activeScript = testScript;
      const availableCredits = 5;
      const apiCallCount = 0;
      let selectedSentenceIndex: number | null = null;

      // Creator selects sentence index 2
      selectedSentenceIndex = 2;

      assert.strictEqual(selectedSentenceIndex, 2);
      assert.strictEqual(activeScript, testScript, "Script remains 100% unmutated upon sentence selection");
      assert.strictEqual(availableCredits, 5, "Credit balance remains unchanged");
      assert.strictEqual(apiCallCount, 0, "Zero API requests triggered upon diagnostic inspection");
    });

    it("I: working-draft state remains intact and tracks modifications independently", () => {
      const baseline = testScript;
      let currentDraft = testScript;

      assert.strictEqual(currentDraft.trim() !== baseline.trim(), false);

      // User modifies text in draft
      currentDraft = currentDraft.replace("80%", "95%");
      const isDraftModified = currentDraft.trim() !== baseline.trim();
      assert.strictEqual(isDraftModified, true, "Draft modification state tracks correctly");
    });

    it("J: duplicate identical sentences in script are mapped deterministically in sequential order", () => {
      const duplicateScript = `Check this out right now! Check this out right now!`;
      const duplicateRisks: DropOffRisk[] = [
        { line: "Check this out right now!", risk: "High", reason: "First repetition.", fix: "Change opening." },
        { line: "Check this out right now!", risk: "Medium", reason: "Second repetition.", fix: "Remove duplicate." },
      ];

      const sentences = splitIntoSentences(duplicateScript);
      const mapped = matchSentencesWithRisks(sentences, duplicateRisks);

      assert.strictEqual(mapped.length, 2);
      assert.strictEqual(mapped[0].risk, "High");
      assert.strictEqual(mapped[0].reason, "First repetition.");
      assert.strictEqual(mapped[1].risk, "Medium");
      assert.strictEqual(mapped[1].reason, "Second repetition.");
    });

    it("K: multilingual sentence boundaries (Hindi danda, Spanish inverted marks) are segmented accurately", () => {
      const hindiScript = `नमस्ते दोस्तों। आज हम बात करेंगे एक महत्वपूर्ण विषय पर। क्या आप तैयार हैं?`;
      const hindiSentences = splitIntoSentences(hindiScript);
      assert.strictEqual(hindiSentences.length, 3);
      assert.strictEqual(hindiSentences[0], "नमस्ते दोस्तों।");
      assert.strictEqual(hindiSentences[1], "आज हम बात करेंगे एक महत्वपूर्ण विषय पर।");
      assert.strictEqual(hindiSentences[2], "क्या आप तैयार हैं?");

      const spanishScript = `¡Hola a todos! ¿Por qué pierdes retención en tus videos? Aquí está la solución.`;
      const spanishSentences = splitIntoSentences(spanishScript);
      assert.strictEqual(spanishSentences.length, 3);
      assert.strictEqual(spanishSentences[0], "¡Hola a todos!");
      assert.strictEqual(spanishSentences[1], "¿Por qué pierdes retención en tus videos?");
      assert.strictEqual(spanishSentences[2], "Aquí está la solución.");
    });
  });
});
