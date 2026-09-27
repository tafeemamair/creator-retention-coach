import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  splitIntoSentences,
  metricScore,
  getPlatformProfile,
  generatePredictedTimeline,
  words,
} from "../analyze";

describe("1. Sentence Segmentation & Pacing Heuristic", () => {
  it("correctly segments a single 80-word paragraph without newlines", () => {
    const singleParagraph =
      "Most creators think they fail because of bad luck with the algorithm. They do not. The real issue is that their opening hook is far too slow and viewers swipe away immediately. When you fix the first three seconds, your watch time doubles automatically. Then all you need is a fast-paced rhythm with zero fluff words. Follow this simple framework to fix your retention before filming.";

    const sentences = splitIntoSentences(singleParagraph);
    assert.strictEqual(sentences.length, 6);
    assert.strictEqual(sentences[0], "Most creators think they fail because of bad luck with the algorithm.");
    assert.strictEqual(sentences[1], "They do not.");

    const scoreResult = metricScore(singleParagraph, "YouTube Shorts");
    // Pacing MUST NOT be penalized to 0 simply because there are no newlines
    assert.ok(
      scoreResult.metrics.pacing >= 70,
      `Expected pacing score >= 70 for clean paragraph, got ${scoreResult.metrics.pacing}`
    );
  });

  it("handles normal multiline scripts correctly", () => {
    const multiline = `Stop scrolling right now.
Here is the secret to 100k views on Shorts.
First, cut your opening greeting.
Second, deliver the payoff in the first five seconds.
Save this video for your next shoot.`;

    const sentences = splitIntoSentences(multiline);
    assert.strictEqual(sentences.length, 5);
    assert.strictEqual(sentences[0], "Stop scrolling right now.");
  });

  it("handles scripts with mixed punctuation: '.', '!', '?', and ellipses", () => {
    const script = "Wait... did you know this?! Most creators make this one mistake. Stop doing it today! How do you fix it? Just follow these steps.";
    const sentences = splitIntoSentences(script);
    assert.strictEqual(sentences.length, 5);
    assert.strictEqual(sentences[0], "Wait... did you know this?!");
    assert.strictEqual(sentences[1], "Most creators make this one mistake.");
    assert.strictEqual(sentences[2], "Stop doing it today!");
    assert.strictEqual(sentences[3], "How do you fix it?");
    assert.strictEqual(sentences[4], "Just follow these steps.");
  });

  it("handles multiple spaces and irregular newlines cleanly", () => {
    const script = "  First line here.   \n\n\n   Second line    with   spaces!   \n Third line?  ";
    const sentences = splitIntoSentences(script);
    assert.strictEqual(sentences.length, 3);
    assert.strictEqual(sentences[0], "First line here.");
    assert.strictEqual(sentences[1], "Second line with spaces!");
    assert.strictEqual(sentences[2], "Third line?");
  });

  it("handles very short dialogue/staccato sentences", () => {
    const script = "Look. Stop. Listen. This matters. Do this now.";
    const sentences = splitIntoSentences(script);
    assert.strictEqual(sentences.length, 5);
  });

  it("handles very long run-on sentences with appropriate pacing penalty", () => {
    const runOnScript =
      "This is one massive unbroken sentence that continues for way too long without any punctuation or natural pause which makes it almost impossible to deliver naturally in a fast-paced short-form video where viewers have extremely short attention spans and need rapid pattern interrupts.";
    const sentences = splitIntoSentences(runOnScript);
    assert.strictEqual(sentences.length, 1);

    const scoreResult = metricScore(runOnScript, "YouTube Shorts");
    // Run-on sentence should have a lower pacing score
    assert.ok(
      scoreResult.metrics.pacing < 65,
      `Expected lower pacing score for 40+ word run-on sentence, got ${scoreResult.metrics.pacing}`
    );
  });

  it("handles empty or whitespace-only input safely", () => {
    assert.deepStrictEqual(splitIntoSentences(""), []);
    assert.deepStrictEqual(splitIntoSentences("    \n\n   "), []);
    assert.deepStrictEqual(words(""), []);
  });
});

describe("2. Platform-Aware Scoring", () => {
  const sampleScript =
    "What if one hidden pacing mistake is cutting your views in half? Most creators spend hours filming without checking their first three seconds. Follow these three rules to double your retention rate today.";

  it("produces deterministic results for the same script and platform", () => {
    const run1 = metricScore(sampleScript, "TikTok");
    const run2 = metricScore(sampleScript, "TikTok");

    assert.deepStrictEqual(run1.metrics, run2.metrics);
    assert.strictEqual(run1.dropoffPrediction.second, run2.dropoffPrediction.second);
  });

  it("meaningfully consumes platform context across TikTok, YouTube Shorts, and Instagram Reels", () => {
    const tiktokProfile = getPlatformProfile("TikTok");
    const ytProfile = getPlatformProfile("YouTube Shorts");
    const reelsProfile = getPlatformProfile("Instagram Reels");

    // TikTok weights Hook & Pacing higher
    assert.strictEqual(tiktokProfile.weights.hook, 0.35);
    assert.strictEqual(tiktokProfile.weights.pacing, 0.30);

    // YouTube Shorts weights Value higher
    assert.strictEqual(ytProfile.weights.value, 0.20);

    // Instagram Reels weights Emotion & CTA higher
    assert.strictEqual(reelsProfile.weights.emotion, 0.25);
    assert.strictEqual(reelsProfile.weights.cta, 0.15);

    // Scores should reflect platform profiles
    const scoreTikTok = metricScore(sampleScript, "TikTok");
    const scoreShorts = metricScore(sampleScript, "YouTube Shorts");
    const scoreReels = metricScore(sampleScript, "Instagram Reels");

    assert.ok(scoreTikTok.metrics.hook !== undefined);
    assert.ok(scoreShorts.metrics.hook !== undefined);
    assert.ok(scoreReels.metrics.hook !== undefined);
  });

  it("safely falls back for missing or unsupported platform string", () => {
    const fallbackProfile = getPlatformProfile("UnknownPlatform");
    assert.strictEqual(fallbackProfile.name, "YouTube Shorts");

    const fallbackScore = metricScore(sampleScript, undefined);
    assert.ok(fallbackScore.metrics.hook > 0);
  });
});

describe("3. Predicted Retention Timeline Model", () => {
  const sentences = [
    "What if one mistake is killing your views?",
    "Most creators don't know why viewers swipe away.",
    "The secret is cutting your intro completely.",
    "Deliver the core value in the first five seconds.",
    "Follow for daily retention breakdowns.",
  ];

  const metrics = { hook: 85, pacing: 80, emotion: 70, value: 85, cta: 90 };

  it("generates deterministic timeline from analytical sentence units", () => {
    const timeline1 = generatePredictedTimeline(sentences, metrics, 25);
    const timeline2 = generatePredictedTimeline(sentences, metrics, 25);

    assert.deepStrictEqual(timeline1, timeline2);
    assert.strictEqual(timeline1[0].second, 0);
    assert.strictEqual(timeline1[0].retention, 100);
    assert.ok(timeline1.length >= 5);
  });

  it("reflects high-risk sentences as noticeable retention drops", () => {
    const lowRiskTimeline = generatePredictedTimeline(
      sentences,
      metrics,
      25,
      sentences.map((line) => ({ line, risk: "Low" as const, reason: "Good", fix: "Keep" }))
    );

    const highRiskTimeline = generatePredictedTimeline(
      sentences,
      metrics,
      25,
      sentences.map((line) => ({ line, risk: "High" as const, reason: "Weak", fix: "Fix" }))
    );

    const lastLowPoint = lowRiskTimeline[lowRiskTimeline.length - 1].retention;
    const lastHighPoint = highRiskTimeline[highRiskTimeline.length - 1].retention;

    assert.ok(
      lastLowPoint > lastHighPoint,
      `Low risk retention (${lastLowPoint}) should be higher than high risk retention (${lastHighPoint})`
    );
  });

  it("handles empty sentences or zero duration safely", () => {
    const fallback = generatePredictedTimeline([], metrics, 0);
    assert.ok(fallback.length > 0);
    assert.strictEqual(fallback[0].retention, 100);
  });
});
