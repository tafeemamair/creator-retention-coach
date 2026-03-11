import Sentiment from "sentiment";

const sentimentAnalyzer = new Sentiment();

export type FullAnalysis = {
  estimatedDuration: string;
  retentionScore: number;
  hookStrength: string;
  whatsWorking: string[];
  whatsHurting: string[];
  exactFixes: string[];
  improvedScriptVersions: {
    version1: string;
    version2: string;
    version3: string;
  };
  viralTitleSuggestions: string[];
  callToActionDetected: boolean;
};

export type PreviewAnalysis = {
  estimatedDuration: string;
  hookScore: number;
  retentionRisk: string;
  dropOffEstimate: string;
};

type OpenAIScriptVersions = {
  version1?: string;
  version2?: string;
  version3?: string;
  titles?: string[];
};

function estimateDuration(script: string): { seconds: number; label: string } {
  const words = script.split(/\s+/).filter(Boolean).length;
  const seconds = Math.max(8, Math.round((words / 150) * 60));
  return {
    seconds,
    label: `${Math.floor(seconds / 60)}m ${seconds % 60}s`,
  };
}

function getLines(script: string): string[] {
  return script
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function fallbackScriptVersions(script: string): FullAnalysis["improvedScriptVersions"] {
  const base = script.trim();
  return {
    version1: `Hook: What if one hidden shift could double your watch time today?\n${base}\nCTA: Comment \"HOOK\" and I will send a stronger intro framework.`,
    version2: `Hook: Stop scrolling—this is the fastest way to keep viewers watching.\n${base}\nPacing note: Use short lines and quick cuts every 2–3 seconds.\nCTA: Follow for the part 2 breakdown.`,
    version3: `Hook: I learned this the hard way after losing viewers for months.\n${base}\nStory beat: Start with conflict, reveal turning point, end with action.\nCTA: Share this with a creator who needs it.`,
  };
}

async function generatePremiumAssets(script: string): Promise<{
  versions: FullAnalysis["improvedScriptVersions"];
  titles: string[];
}> {
  if (!process.env.OPENAI_API_KEY) {
    return {
      versions: fallbackScriptVersions(script),
      titles: [
        "The Silent Habit Destroying Your Life",
        "Why Waiting Until Tomorrow Is Ruining You",
        "The Hidden Mistake 90% of People Repeat Daily",
      ],
    };
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
        temperature: 0.8,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You are an expert YouTube Shorts script optimizer focused on retention and virality.",
          },
          {
            role: "user",
            content: `Rewrite this YouTube short script into 3 improved versions optimized for viewer retention.\nEach version should be under 60 seconds, have a strong hook in the first 3 seconds, and end with a call to action.\nAlso generate 3 viral titles for this script.\n\nReturn strict JSON with this shape:\n{\n  \"version1\": \"...\",\n  \"version2\": \"...\",\n  \"version3\": \"...\",\n  \"titles\": [\"...\",\"...\",\"...\"]\n}\n\nScript:\n${script}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI request failed with status ${response.status}`);
    }

    const json = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const content = json.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("OpenAI response did not include content");
    }

    const parsed = JSON.parse(content) as OpenAIScriptVersions;

    const titles = (parsed.titles ?? []).filter(Boolean).slice(0, 3);

    return {
      versions: {
        version1: parsed.version1 || fallbackScriptVersions(script).version1,
        version2: parsed.version2 || fallbackScriptVersions(script).version2,
        version3: parsed.version3 || fallbackScriptVersions(script).version3,
      },
      titles:
        titles.length === 3
          ? titles
          : [
              "The Silent Habit Destroying Your Life",
              "Why Waiting Until Tomorrow Is Ruining You",
              "The Hidden Mistake 90% of People Repeat Daily",
            ],
    };
  } catch (error) {
    console.error("OpenAI premium generation failed:", error);
    return {
      versions: fallbackScriptVersions(script),
      titles: [
        "The Silent Habit Destroying Your Life",
        "Why Waiting Until Tomorrow Is Ruining You",
        "The Hidden Mistake 90% of People Repeat Daily",
      ],
    };
  }
}

export async function analyzeRetention(
  script: string,
  options?: { full?: boolean }
): Promise<PreviewAnalysis | FullAnalysis> {
  const lines = getLines(script);
  const { seconds: estimatedSeconds, label: estimatedDuration } = estimateDuration(script);

  const hook = lines.slice(0, 2).join(" ").trim();
  const hookWordCount = hook.split(/\s+/).filter(Boolean).length;
  const hookHasCuriosityGap = /(\?|why|what|how|discover|secret|mistake|you’ll never|imagine|surprising)/i.test(hook);
  const hookHasImperative = /^(imagine|what if|here’s why|let’s|picture this|watch this|did you know|stop|don’t)/i.test(hook);

  let hookStrengthScore = 0;
  if (hookHasCuriosityGap) hookStrengthScore += 2;
  if (hookHasImperative) hookStrengthScore += 1;
  if (hookWordCount <= 15) hookStrengthScore += 1;
  if (hookWordCount > 20) hookStrengthScore -= 1;

  const blockLengths = lines.map((line) => line.split(/\s+/).filter(Boolean).length);
  const maxBlockLength = blockLengths.length > 0 ? Math.max(...blockLengths) : 0;
  const averageBlockLength = lines.length > 0 ? Math.round(script.split(/\s+/).filter(Boolean).length / lines.length) : 0;
  const longBlockCount = blockLengths.filter((len) => len > 30).length;

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const fixes: string[] = [];

  let score = 5 + hookStrengthScore;

  if (hookStrengthScore >= 3) {
    strengths.push("Your opening creates a strong curiosity loop quickly.");
  } else {
    weaknesses.push("Hook needs a sharper curiosity angle in the first 3 seconds.");
    fixes.push("Open with a bold claim, surprising fact, or question in under 12 words.");
  }

  if (maxBlockLength > 40 || longBlockCount >= 2 || averageBlockLength > 20) {
    weaknesses.push("Pacing is dense and may cause mid-video drop-offs.");
    fixes.push("Break long lines into shorter beats and add pattern interrupts every 2–3 seconds.");
    score -= 1.5;
  } else {
    strengths.push("Pacing feels skimmable with digestible beats.");
    score += 0.5;
  }

  const hasPayoff = /(here’s|the secret|the key|the answer|let me show|the fix)/i.test(script);
  if (hasPayoff) {
    strengths.push("There is a visible value payoff in the script.");
    score += 0.5;
  } else {
    weaknesses.push("Value reveal is unclear or delayed.");
    fixes.push("Reveal the core outcome earlier so viewers know why they should keep watching.");
    score -= 0.5;
  }

  const callToActionDetected = /(subscribe|comment|click|check|visit|follow|try)/i.test(script);
  if (!callToActionDetected) {
    weaknesses.push("No clear call to action is present.");
    fixes.push("End with one specific CTA: comment, follow, or share.");
    score -= 0.5;
  } else {
    strengths.push("Call to action exists, which can increase engagement signals.");
  }

  const sentimentScore = sentimentAnalyzer.analyze(script).score;
  if (sentimentScore > 2) {
    strengths.push("Emotional tone is energetic and positive.");
    score += 0.5;
  } else if (sentimentScore < -2) {
    weaknesses.push("Emotional tone may feel overly negative.");
    fixes.push("Reframe pain points with a hopeful payoff to keep viewers engaged.");
    score -= 0.5;
  }

  score = Math.max(0, Math.min(10, Math.round(score * 10) / 10));

  const preview: PreviewAnalysis = {
    estimatedDuration,
    hookScore: Math.max(0, Math.min(10, hookStrengthScore + 6)),
    retentionRisk: score >= 7 ? "Low" : score >= 5 ? "Medium" : "High",
    dropOffEstimate: `Around second ${Math.max(5, Math.round(estimatedSeconds * 0.3))}`,
  };

  if (!options?.full) {
    return preview;
  }

  const premiumAssets = await generatePremiumAssets(script);

  return {
    estimatedDuration,
    retentionScore: score,
    hookStrength: hook || "No clear hook detected.",
    whatsWorking: strengths,
    whatsHurting: weaknesses,
    exactFixes: fixes,
    improvedScriptVersions: premiumAssets.versions,
    viralTitleSuggestions: premiumAssets.titles,
    callToActionDetected,
  };
}
