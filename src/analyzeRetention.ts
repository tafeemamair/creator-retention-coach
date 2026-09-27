// 1️⃣ IMPORTS & CONFIG
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
dotenv.config();

import OpenAI from "openai";

// 🔹 mock mode flag
const USE_MOCK = process.env.MOCK_MODE === "true";

// load prompt
const promptPath = path.join(process.cwd(), "MASTER_AGENT_PROMPT.txt");
const MASTER_AGENT_PROMPT = fs.readFileSync(promptPath, "utf-8");

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  throw new Error("OPENAI_API_KEY is missing.");
}

const client = new OpenAI({ apiKey });


// 2️⃣ HELPER FUNCTIONS
function enforceRetentionRules(output: string): string {
  output = output.replace(
    /(\d+)\s*–\s*(\d+)\s*seconds?/gi,
    (_, start) => `Second ${start}`
  );

  output = output.replace(
    /Timestamp:\s*([^\n]+)/i,
    (_, ts) => {
      const match = ts.match(/\d+/);
      return match ? `Timestamp: Second ${match[0]}` : `Timestamp: Second 6`;
    }
  );

  output = output.replace(
    /\b(might|could|may|possibly|seems to|appears to|likely to)\b/gi,
    ""
  );

  output = output.replace(
    /(Reason:.*?)(,| and ).*/i,
    "$1"
  );

  return output;
}
function applyTierGating(output: string, tier: string): string {
  if (tier === "paid") {
    return output;
  }

  // FREE TIER: strip premium sections
  return output
    .replace(/WHAT’S HURTING RETENTION:[\s\S]*?HOW TO FIX IT \(ACTIONABLE\):[\s\S]*?IMPROVED HOOK VERSION:[\s\S]*/i, "")
    .trim();
}


// 3️⃣ 👉 STEP 2 GOES **HERE** (MOCK RESPONSE)
const MOCK_RESPONSE = `
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


// 4️⃣ MAIN FUNCTION
export async function analyzeRetention(input: {
  video_type: string;
  platform: string;
  duration: string;
  title?: string;
  script: string;
}) {
  // 🧪 MOCK MODE CHECK (STEP 3)
  if (USE_MOCK) {
    console.log("🧪 Using MOCK MODE");
    return applyTierGating(MOCK_RESPONSE, process.env.USER_TIER || "free");
  }

  console.log("🤖 Calling OpenAI...");

  const response = await client.responses.create({
    model: "gpt-4o-mini",
    input: [
      { role: "system", content: MASTER_AGENT_PROMPT },
      {
        role: "user",
        content: `
Video Type: ${input.video_type}
Platform: ${input.platform}
Duration: ${input.duration}
Title: ${input.title ?? "Not provided"}

SCRIPT:
${input.script}
        `,
      },
    ],
  });

  const cleaned = enforceRetentionRules(response.output_text);
  return applyTierGating(cleaned, process.env.USER_TIER || "free");
}
