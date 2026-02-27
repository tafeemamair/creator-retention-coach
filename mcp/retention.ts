const FREE_MAX_CHARS = 500;

export function analyzeRetentionFree(input: { script: string }) {
  const script = (input.script || "").trim();

  if (script.length === 0) {
    return "ERROR: Script is empty.";
  }

  if (script.length > FREE_MAX_CHARS) {
    return `SCRIPT TOO LONG (Free Tier)

Limit: ${FREE_MAX_CHARS} characters.
Your script: ${script.length} characters.

Tip: Analyze only the hook or opening section.`;
  }

  // --- FREE TIER ANALYSIS LOGIC ---
  let score = 6;
  let dropPoint = "Second 5";
  let reason = "Abstract hook delays payoff.";

  if (script.length > 200) {
    dropPoint = "Midpoint";
    reason = "Momentum drops due to slow payoff delivery.";
  }

  return `RETENTION SCORE: ${score} / 10

LIKELY DROP-OFF POINT:
• Timestamp: ${dropPoint}
• Reason: ${reason}
`;
}
