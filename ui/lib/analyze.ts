export async function analyzeRetention(input: any): Promise<string> {
  return `
RETENTION SCORE: 6 / 10

LIKELY DROP-OFF POINT:
• Timestamp: Second 5
• Reason: Abstract hook delays payoff.

WHAT’S HURTING RETENTION:
1. Hook introduces a concept without a concrete reward.
2. No early momentum reset.

HOW TO FIX IT (ACTIONABLE):
• Deliver payoff by second 3.
• Add a contradiction immediately after the hook.

IMPROVED HOOK VERSION:
"Most people chase motivation. That’s why they fail."
`;
}
