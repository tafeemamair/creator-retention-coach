import type { FullAnalysis, Platform } from "../types";

/**
 * Formats a FullAnalysis object into a clean, structured Markdown retention audit report.
 * Safe against empty or undefined optional fields.
 */
export function formatFullAuditToMarkdown(
  analysis: FullAnalysis,
  script: string = "",
  platform: Platform = "YouTube Shorts"
): string {
  const wordCount = script.trim() ? script.trim().split(/\s+/).filter(Boolean).length : 0;
  const score = analysis?.score ?? 0;
  const metrics = analysis?.metrics ?? {
    hook: 0,
    pacing: 0,
    emotion: 0,
    value: 0,
    cta: 0,
  };
  const dropoff = analysis?.dropoffPrediction ?? {
    second: 0,
    reason: "Pacing decelerates before delivering key insight.",
  };
  const risks = analysis?.dropOffRisks ?? [];
  const titles = analysis?.viralTitleSuggestions ?? [];
  const rewrites = analysis?.rewrites ?? [];

  const lines: string[] = [
    `# Creator Retention Coach — Retention Audit Report`,
    `Platform: ${platform} | Length: ${wordCount} words | Overall Retention Score: ${score}/100`,
    ``,
    `## ⏱️ Predicted Drop-Off Timing`,
    `Estimated Drop-Off Second: ${dropoff.second}s`,
    `Reason: ${dropoff.reason}`,
    ``,
    `## 📊 5 Core Retention Signals`,
    `• Hook Strength: ${metrics.hook}/100`,
    `• Pacing Rhythm: ${metrics.pacing}/100`,
    `• Emotional Intensity: ${metrics.emotion}/100`,
    `• Value Delivery: ${metrics.value}/100`,
    `• Call To Action: ${metrics.cta}/100`,
    ``,
  ];

  // Line-Level Risks Section
  lines.push(`## ⚠️ Line-by-Line Retention Risks`);
  if (risks.length === 0) {
    lines.push(`No critical drop-off risks detected. Strong pacing throughout.`);
  } else {
    risks.forEach((risk) => {
      const riskLevel = risk.risk || "Medium";
      const lineText = risk.line ? `"${risk.line}"` : "General section";
      lines.push(`[${riskLevel} Risk] ${lineText}`);
      if (risk.reason) lines.push(`→ Risk: ${risk.reason}`);
      if (risk.fix) lines.push(`→ Suggested Fix: ${risk.fix}`);
      lines.push(``);
    });
  }
  lines.push(``);

  // Alternative Titles Section
  lines.push(`## 💡 3 Alternative Viral Hook Titles`);
  if (titles.length === 0) {
    lines.push(`None generated.`);
  } else {
    titles.forEach((title, idx) => {
      lines.push(`${idx + 1}. ${title}`);
    });
  }
  lines.push(``);

  // Ready-to-Film Rewrites Section
  lines.push(`## ✨ 3 Ready-to-Film Retention Rewrites`);
  if (rewrites.length === 0) {
    lines.push(`No rewrites available.`);
  } else {
    rewrites.forEach((rw, idx) => {
      lines.push(`### ${idx + 1}. ${rw.type}`);
      lines.push(rw.script);
      lines.push(``);
    });
  }

  lines.push(`---`);
  lines.push(`Analyzed with Creator Retention Coach • https://www.creatorretentioncoach.in`);

  return lines.join("\n").trim();
}
