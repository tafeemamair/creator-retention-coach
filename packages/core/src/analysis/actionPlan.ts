import type { FullAnalysis, PostAnalysisActionPlan, ActionPlanItem, ActionCategory, ActionPriority } from "../types";

export const CATEGORY_LABELS: Record<ActionCategory, string> = {
  hook: "Hook Optimization",
  high_risk_line: "High-Risk Friction Point",
  pacing: "Pacing & Density",
  value: "Value Delivery",
  emotion: "Emotional Resonance",
  cta: "Call to Action",
};

/**
 * Pure, deterministic utility that generates a structured creator action plan
 * from an existing FullAnalysis result.
 *
 * Guarantees:
 * - 0 credits consumed
 * - 0 OpenAI API calls
 * - 0 mutations to input analysis
 * - 100% deterministic outputs across repeated calls
 */
export function generateActionPlan(analysis: FullAnalysis): PostAnalysisActionPlan {
  if (!analysis || typeof analysis !== "object") {
    return {
      summary: "No analysis data available to construct an action plan.",
      totalActions: 0,
      highPriorityCount: 0,
      items: [],
    };
  }

  const items: ActionPlanItem[] = [];
  const metrics = analysis.metrics || { hook: 50, pacing: 50, emotion: 50, value: 50, cta: 50 };
  const dropOffRisks = Array.isArray(analysis.dropOffRisks) ? analysis.dropOffRisks : [];
  const dropoffPrediction = analysis.dropoffPrediction || { second: 5, reason: "" };

  let counter = 1;

  // 1. Hook Fix: Evaluate if hook score is weak or early drop-off occurs in first 5 seconds
  const isHookWeak = metrics.hook < 70;
  const isEarlyDropoff = dropoffPrediction.second <= 5;
  const firstLineRisk = dropOffRisks[0];

  if (isHookWeak || isEarlyDropoff || (firstLineRisk && firstLineRisk.risk === "High")) {
    const hookPriority: ActionPriority = metrics.hook <= 50 || isEarlyDropoff ? "high" : "medium";
    const recommendedFix =
      firstLineRisk?.fix ||
      (analysis.viralTitleSuggestions && analysis.viralTitleSuggestions.length > 0
        ? `Open with a high-tension question or contrarian claim under 10 words. Example: "${analysis.viralTitleSuggestions[0]}"`
        : "Trim preamble and state the primary benefit or tension in the first 3 seconds.");

    items.push({
      id: `action-${counter++}`,
      category: "hook",
      categoryLabel: CATEGORY_LABELS.hook,
      priority: hookPriority,
      title: "Strengthen Opening Hook (0–3s Window)",
      description:
        firstLineRisk?.reason ||
        dropoffPrediction.reason ||
        `Current hook score is ${metrics.hook}/100. Viewers decide whether to swipe within the first 3 seconds.`,
      recommendedFix,
      targetLine: firstLineRisk?.line,
    });
  }

  // 2. High-Risk Line Fixes: Concrete friction points detected in the script body
  dropOffRisks.forEach((riskItem, idx) => {
    // Skip sentence 0 if we already surfaced it in the Hook section
    if (idx === 0 && items.some((i) => i.category === "hook")) {
      return;
    }

    if (riskItem.risk === "High") {
      items.push({
        id: `action-${counter++}`,
        category: "high_risk_line",
        categoryLabel: CATEGORY_LABELS.high_risk_line,
        priority: "high",
        title: `Fix Critical Friction in Sentence ${idx + 1}`,
        description: riskItem.reason || "Viewers are predicted to swipe away during this line.",
        recommendedFix: riskItem.fix || "Cut filler words and increase information density.",
        targetLine: riskItem.line,
      });
    } else if (riskItem.risk === "Medium" && items.length < 5) {
      items.push({
        id: `action-${counter++}`,
        category: "high_risk_line",
        categoryLabel: CATEGORY_LABELS.high_risk_line,
        priority: "medium",
        title: `Optimize Pacing in Sentence ${idx + 1}`,
        description: riskItem.reason || "Sentence momentum slows down noticeably.",
        recommendedFix: riskItem.fix || "Split into two punchier sentences.",
        targetLine: riskItem.line,
      });
    }
  });

  // 3. Pacing Optimization: Check if overall pacing rhythm is dragging
  if (metrics.pacing < 65 && !items.some((i) => i.category === "pacing")) {
    const pacingPriority: ActionPriority = metrics.pacing <= 45 ? "high" : "medium";
    items.push({
      id: `action-${counter++}`,
      category: "pacing",
      categoryLabel: CATEGORY_LABELS.pacing,
      priority: pacingPriority,
      title: "Increase Overall Spoken Velocity",
      description: `Pacing score is ${metrics.pacing}/100. Average sentence length is too long for short-form video retention.`,
      recommendedFix: "Apply a 12-word hard ceiling per sentence. Cut adverbs and use rapid pattern interrupts.",
    });
  }

  // 4. Value / Core Insight Optimization
  if (metrics.value < 60 && !items.some((i) => i.category === "value")) {
    items.push({
      id: `action-${counter++}`,
      category: "value",
      categoryLabel: CATEGORY_LABELS.value,
      priority: "medium",
      title: "Accelerate Payoff Delivery",
      description: `Value delivery score is ${metrics.value}/100. The core takeaway arrives too late in the script.`,
      recommendedFix: "Deliver your first concrete tip or revelation before the 15-second mark.",
    });
  }

  // 5. Emotional Connection / Friction
  if (metrics.emotion < 55 && !items.some((i) => i.category === "emotion")) {
    items.push({
      id: `action-${counter++}`,
      category: "emotion",
      categoryLabel: CATEGORY_LABELS.emotion,
      priority: "low",
      title: "Heighten Emotional Stakes",
      description: `Emotional intensity score is ${metrics.emotion}/100. Script feels informational but lacks personal friction.`,
      recommendedFix: "Inject a relatable struggle, mistake, or strong sensory contrast.",
    });
  }

  // 6. Call to Action (CTA) Fix
  if (metrics.cta < 60 && !items.some((i) => i.category === "cta")) {
    const ctaPriority: ActionPriority = metrics.cta < 35 ? "high" : "medium";
    items.push({
      id: `action-${counter++}`,
      category: "cta",
      categoryLabel: CATEGORY_LABELS.cta,
      priority: ctaPriority,
      title: "Refine Concluding Call-to-Action",
      description: `CTA score is ${metrics.cta}/100. Concluding prompt is either missing or reduces completion rate.`,
      recommendedFix: "End with a 1-sentence prompt tied directly to the video payoff (e.g., 'Save this before filming').",
    });
  }

  // Sort items deterministically: High priority first, then Medium, then Low
  const priorityOrder: Record<ActionPriority, number> = { high: 1, medium: 2, low: 3 };
  items.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  // Cap at top 6 actionable recommendations for optimal creator focus
  const finalItems = items.slice(0, 6);
  const highPriorityCount = finalItems.filter((item) => item.priority === "high").length;

  let summary = `Identified ${finalItems.length} targeted improvement${finalItems.length === 1 ? "" : "s"} to maximize audience retention.`;
  if (highPriorityCount > 0) {
    summary += ` Focus on the ${highPriorityCount} high-priority item${highPriorityCount === 1 ? "" : "s"} before filming.`;
  }

  return {
    summary,
    totalActions: finalItems.length,
    highPriorityCount,
    items: finalItems,
  };
}
