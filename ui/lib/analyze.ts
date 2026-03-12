import Sentiment from "sentiment";

const sentimentAnalyzer = new Sentiment();

type RetentionMetrics = {
  hook: number;
  pacing: number;
  emotion: number;
  value: number;
  cta: number;
};

type DropoffPrediction = {
  second: number;
  reason: string;
};

export type RewriteVersion = {
  type: "Curiosity Hook" | "Fast-Paced Retention" | "Emotional Storytelling";
  script: string;
};

export type FullAnalysis = {
  score: number;
  metrics: RetentionMetrics;
  dropoffPrediction: DropoffPrediction;
  retentionTimeline: Array<{ second: number; retention: number }>;
  rewrites: RewriteVersion[];
  improvedScript: string;
  viralTitleSuggestions: string[];
};

export type PreviewAnalysis = {
  score: number;
  metrics: RetentionMetrics;
  dropoffPrediction: DropoffPrediction;
};

type OpenAIRewrites = {
  curiosityHook?: string;
  fastPacedRetention?: string;
  emotionalStorytelling?: string;
  titles?: string[];
};

function words(text: string): string[] {
  return text.trim().split(/\s+/).filter(Boolean);
}

function estimateDurationSeconds(script: string): number {
  return Math.max(10, Math.round((words(script).length / 170) * 60));
}

function toSentenceLines(input: string, maxWords = 120): string {
  const cleaned = input.replace(/\s+/g, " ").trim();
  const sentenceChunks = cleaned
    .split(/(?<=[.!?…])\s+/)
    .map((line) => line.trim())
    .filter(Boolean);

  const lines = sentenceChunks.map((line) => (/[.!?…]$/.test(line) ? line : `${line}.`));
  const result: string[] = [];
  let count = 0;

  for (const line of lines) {
    const lineWords = words(line).length;
    if (count + lineWords > maxWords) break;
    result.push(line);
    count += lineWords;
  }

  if (result.length === 0) return "Stop scrolling.\nThis changes everything.\nFollow for part two.";
  return result.join("\n\n");
}

function fallbackRewrites(script: string): RewriteVersion[] {
  const base = toSentenceLines(script, 80);
  return [
    {
      type: "Curiosity Hook",
      script: toSentenceLines(
        `What if one hidden habit is killing your growth? ${base} The twist is simpler than you think. Want the exact checklist? Comment CHECKLIST now.`,
      ),
    },
    {
      type: "Fast-Paced Retention",
      script: toSentenceLines(
        `Stop scrolling. You are losing viewers in the first 3 seconds. Cut the intro. Hit them with the payoff first. Then stack fast pattern interrupts every sentence. Keep each line short. If this helped, follow for daily retention fixes.`,
      ),
    },
    {
      type: "Emotional Storytelling",
      script: toSentenceLines(
        `I almost quit creating after flat retention for months. Then one script structure changed everything. I opened with pain, revealed the turning point, and ended with one clear action. The audience stayed. Save this and share it with a creator friend.`,
      ),
    },
  ];
}

async function generateRewrites(script: string): Promise<{ rewrites: RewriteVersion[]; titles: string[] }> {
  if (!process.env.OPENAI_API_KEY) {
    return {
      rewrites: fallbackRewrites(script),
      titles: ["Your Hook Is Costing You Views", "The 3-Second Fix For Shorts", "Why Viewers Drop Off Fast"],
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
        temperature: 0.7,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You rewrite YouTube Shorts scripts for retention. Output punchy one-sentence-per-line scripts with strong hook first line and CTA ending.",
          },
          {
            role: "user",
            content: `Rewrite this script in 3 styles: Curiosity Hook, Fast-Paced Retention, Emotional Storytelling.\nRules:\n- max 120 words each\n- one sentence per line\n- short punchy lines\n- first line is a strong hook\n- fast pacing and curiosity gaps\n- include pattern interrupts\n- end with CTA\n\nReturn strict JSON:\n{\n  "curiosityHook":"...",\n  "fastPacedRetention":"...",\n  "emotionalStorytelling":"...",\n  "titles":["...","...","..."]\n}\n\nScript:\n${script}`,
          },
        ],
      }),
    });

    if (!response.ok) throw new Error("OpenAI failed");

    const json = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const parsed = JSON.parse(json.choices?.[0]?.message?.content ?? "{}") as OpenAIRewrites;

    const rewrites: RewriteVersion[] = [
      { type: "Curiosity Hook", script: toSentenceLines(parsed.curiosityHook || fallbackRewrites(script)[0].script) },
      {
        type: "Fast-Paced Retention",
        script: toSentenceLines(parsed.fastPacedRetention || fallbackRewrites(script)[1].script),
      },
      {
        type: "Emotional Storytelling",
        script: toSentenceLines(parsed.emotionalStorytelling || fallbackRewrites(script)[2].script),
      },
    ];

    return {
      rewrites,
      titles: (parsed.titles || []).slice(0, 3).filter(Boolean),
    };
  } catch {
    return {
      rewrites: fallbackRewrites(script),
      titles: ["Your Hook Is Costing You Views", "The 3-Second Fix For Shorts", "Why Viewers Drop Off Fast"],
    };
  }
}

function metricScore(script: string): { metrics: RetentionMetrics; dropoffPrediction: DropoffPrediction; timeline: Array<{ second: number; retention: number }> } {
  const lineList = script.split("\n").map((l) => l.trim()).filter(Boolean);
  const hookLine = lineList[0] ?? "";
  const hook = Math.round(
    Math.max(
      0,
      Math.min(
        100,
        50 +
          (/(\?|secret|mistake|stop|nobody tells you|what if)/i.test(hookLine) ? 25 : 0) +
          (words(hookLine).length <= 12 ? 15 : 0) +
          (hookLine.length > 0 ? 10 : -20),
      ),
    ),
  );

  const avgWordsPerLine = lineList.length ? words(script).length / lineList.length : 30;
  const pacing = Math.round(Math.max(0, Math.min(100, 100 - Math.abs(avgWordsPerLine - 7) * 10)));

  const sentiment = sentimentAnalyzer.analyze(script).score;
  const emotion = Math.round(
    Math.max(0, Math.min(100, 55 + sentiment * 5 + (/(story|felt|pain|fear|win|lost|regret)/i.test(script) ? 15 : 0))),
  );

  const value = Math.round(
    Math.max(0, Math.min(100, 45 + (/(how to|step|framework|exact|do this|here's|the key)/i.test(script) ? 35 : 0) + (/(today|now|instantly|in \d+)/i.test(script) ? 10 : 0))),
  );

  const cta = Math.round(/(follow|comment|subscribe|save|share|dm|click)/i.test(script) ? 90 : 30);

  const duration = estimateDurationSeconds(script);
  const weakMetric = Object.entries({ hook, pacing, emotion, value, cta }).sort((a, b) => a[1] - b[1])[0][0];
  const reasonMap: Record<string, string> = {
    hook: "Hook is not strong enough in the opening seconds.",
    pacing: "Line density is too slow for Shorts pacing.",
    emotion: "Emotional intensity is too flat.",
    value: "Value payoff arrives too late.",
    cta: "No strong CTA to sustain interaction.",
  };

  const dropoffSecond = Math.max(3, Math.round(duration * (0.2 + (100 - Math.min(hook, pacing)) / 200)));
  const timeline = Array.from({ length: 11 }, (_, i) => {
    const second = i * 3;
    const retention = Math.max(20, Math.round(100 - second * (100 - (hook * 0.35 + pacing * 0.4 + emotion * 0.25) / 1.2) / 30));
    return { second, retention };
  });

  return {
    metrics: { hook, pacing, emotion, value, cta },
    dropoffPrediction: { second: dropoffSecond, reason: reasonMap[weakMetric] },
    timeline,
  };
}

export async function analyzeRetention(script: string, options?: { full?: boolean }): Promise<PreviewAnalysis | FullAnalysis> {
  const { metrics, dropoffPrediction, timeline } = metricScore(script);
  const score = Math.round(
    metrics.hook * 0.3 + metrics.pacing * 0.25 + metrics.emotion * 0.2 + metrics.value * 0.15 + metrics.cta * 0.1,
  );

  if (!options?.full) {
    return { score, metrics, dropoffPrediction };
  }

  const assets = await generateRewrites(script);
  return {
    score,
    metrics,
    dropoffPrediction,
    retentionTimeline: timeline,
    rewrites: assets.rewrites,
    improvedScript: assets.rewrites[0]?.script ?? "",
    viralTitleSuggestions: assets.titles.length ? assets.titles : ["Your Hook Is Costing You Views", "The 3-Second Fix For Shorts", "Why Viewers Drop Off Fast"],
  };
}
