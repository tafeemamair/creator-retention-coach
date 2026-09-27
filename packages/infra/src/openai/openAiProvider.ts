import type {
  AIProvider,
  DropOffRiskInput,
  RewriteInput,
  RewriteOutput,
  DropOffRisk,
  RewriteVersion,
  CopilotContext,
  CopilotAction,
  CopilotResult,
} from "../../../core/src/index";
import {
  fallbackDropOffRisks,
  fallbackRewrites,
  toSentenceLines,
  fallbackGenerateHooks,
  fallbackImproveCta,
  detectLanguage,
} from "../../../core/src/index";

export interface OpenAIProviderConfig {
  apiKey?: string;
  model?: string;
}

type OpenAIDropOffRisks = {
  dropOffRisks?: Array<{
    line?: string;
    risk?: "Low" | "Medium" | "High";
    reason?: string;
    fix?: string;
  }>;
};

type OpenAIRewrites = {
  curiosityHook?: string;
  fastPacedRetention?: string;
  emotionalStorytelling?: string;
  titles?: string[];
};

type OpenAICopilotResponse = {
  items?: Array<{
    text?: string;
    rationale?: string;
    style?: string;
  }>;
};

export class OpenAIProvider implements AIProvider {
  private apiKey: string | undefined;
  private model: string;

  constructor(config?: OpenAIProviderConfig) {
    this.apiKey = config?.apiKey || process.env.OPENAI_API_KEY;
    this.model = config?.model || process.env.OPENAI_MODEL || "gpt-4o-mini";
  }

  async detectDropOffRisks(input: DropOffRiskInput): Promise<DropOffRisk[]> {
    const { script, platform = "YouTube Shorts", sourceLanguage = "en", targetLanguage = "en" } = input;

    if (!this.apiKey) {
      return fallbackDropOffRisks(script, platform, sourceLanguage);
    }

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          temperature: 0.2,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content: `You are a ruthless ${platform} retention strategist. Return strict JSON only.
Source Script Language: ${sourceLanguage}
Target Output Language: ${targetLanguage}
IMPORTANT: All line evaluation reasons and suggested fixes MUST be written in the target language (${targetLanguage}).`,
            },
            {
              role: "user",
              content: `Break the script into sentence-by-sentence feedback. For EVERY sentence or dialogue unit, return exactly one object with keys: line, risk, reason, fix.
Rules:
- risk must be Low, Medium, or High
- apply retention rules for ${platform}: first 2-3 seconds critical, >12 words is risky, repeated ideas cause drop, lack of curiosity causes swipe, slow buildup causes drop, emotionless statements underperform
- be brutally honest; if line adds nothing say "no new information"
- do NOT use generic phrasing like "improve pacing" or "make it more engaging"
- fix must be concrete and measurable
- output reasons and fixes in ${targetLanguage}
Return strict JSON: {"dropOffRisks":[{"line":"...","risk":"High","reason":"...","fix":"..."}]}

Script:
${script}`,
            },
          ],
        }),
      });

      if (!response.ok) throw new Error("OpenAI request failed");

      const json = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
      const parsed = JSON.parse(json.choices?.[0]?.message?.content ?? "{}") as OpenAIDropOffRisks;

      const normalized = (parsed.dropOffRisks ?? [])
        .map((item) => ({
          line: item.line?.trim() ?? "",
          risk: item.risk,
          reason: item.reason?.trim() ?? "",
          fix: item.fix?.trim() ?? "",
        }))
        .filter((item) => item.line);

      if (!normalized.length) return fallbackDropOffRisks(script, platform, sourceLanguage);

      return normalized.map((item) => ({
        line: item.line,
        risk: item.risk === "Low" || item.risk === "Medium" || item.risk === "High" ? item.risk : "Medium",
        reason: item.reason || "No new information in this line.",
        fix: item.fix || "Replace this line with one concrete outcome in under 10 words.",
      }));
    } catch {
      return fallbackDropOffRisks(script, platform, sourceLanguage);
    }
  }

  async generateRewrites(input: RewriteInput): Promise<RewriteOutput> {
    const { script, platform = "YouTube Shorts", sourceLanguage = "en", targetLanguage = "en" } = input;

    if (!this.apiKey) {
      return {
        rewrites: fallbackRewrites(script, targetLanguage),
        titles:
          targetLanguage === "hi" || targetLanguage === "hi-Latn"
            ? ["आपका हुक व्यूज रोक रहा है", "Shorts के लिए 3-सेकंड का फॉर्मूला", "व्यूअर्स तुरंत क्यों छोड़ते हैं"]
            : targetLanguage === "es"
            ? ["Tu gancho te está costando visitas", "El truco de 3 segundos para Shorts", "Por qué la audiencia abandona rápido"]
            : ["Your Hook Is Costing You Views", "The 3-Second Fix For Shorts", "Why Viewers Drop Off Fast"],
      };
    }

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          temperature: 0.7,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content: `You rewrite video scripts for maximum retention on ${platform}. Output punchy one-sentence-per-line scripts with a high-tension opening hook and a clear CTA ending.
Source Script Language: ${sourceLanguage}
Target Output Language: ${targetLanguage}
IMPORTANT: All rewritten scripts, hooks, and viral title suggestions MUST be written strictly in the target language (${targetLanguage}). Do NOT translate into English unless target language is 'en'.`,
            },
            {
              role: "user",
              content: `Rewrite this script in 3 distinct retention styles: Curiosity Hook, Fast-Paced Retention, Emotional Storytelling.
Rules:
- keep concise and punchy for short-form content (30–90 seconds)
- one sentence per line
- first line must be a high-retention hook
- fast pacing and curiosity loops
- include pattern interrupts
- end with clean CTA
- provide 3 viral title suggestions
- all scripts and titles MUST be strictly in ${targetLanguage}

Return strict JSON:
{
  "curiosityHook":"...",
  "fastPacedRetention":"...",
  "emotionalStorytelling":"...",
  "titles":["...","...","..."]
}

Script:
${script}`,
            },
          ],
        }),
      });

      if (!response.ok) throw new Error("OpenAI rewrites failed");

      const json = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
      const parsed = JSON.parse(json.choices?.[0]?.message?.content ?? "{}") as OpenAIRewrites;

      const rewrites: RewriteVersion[] = [
        { type: "Curiosity Hook", script: toSentenceLines(parsed.curiosityHook || fallbackRewrites(script, targetLanguage)[0].script) },
        {
          type: "Fast-Paced Retention",
          script: toSentenceLines(parsed.fastPacedRetention || fallbackRewrites(script, targetLanguage)[1].script),
        },
        {
          type: "Emotional Storytelling",
          script: toSentenceLines(parsed.emotionalStorytelling || fallbackRewrites(script, targetLanguage)[2].script),
        },
      ];

      return {
        rewrites,
        titles: (parsed.titles || []).slice(0, 3).filter(Boolean),
      };
    } catch {
      return {
        rewrites: fallbackRewrites(script, targetLanguage),
        titles:
          targetLanguage === "hi" || targetLanguage === "hi-Latn"
            ? ["आपका हुक व्यूज रोक रहा है", "Shorts के लिए 3-सेकंड का फॉर्मूला", "व्यूअर्स तुरंत क्यों छोड़ते हैं"]
            : targetLanguage === "es"
            ? ["Tu gancho te está costando visitas", "El truco de 3 segundos para Shorts", "Por qué la audiencia abandona rápido"]
            : ["Your Hook Is Costing You Views", "The 3-Second Fix For Shorts", "Why Viewers Drop Off Fast"],
      };
    }
  }

  async executeCopilotAction(context: CopilotContext, action: CopilotAction): Promise<CopilotResult> {
    const detected = context.detectedLanguage || detectLanguage(context.script).language;
    const targetLanguage = context.targetLanguage || detected;
    const platform = context.platform || "YouTube Shorts";

    if (!this.apiKey) {
      if (action === "generate_hooks") {
        return {
          action,
          targetLanguage,
          items: fallbackGenerateHooks(context.script, context.analysis, targetLanguage),
        };
      }
      return {
        action,
        targetLanguage,
        items: fallbackImproveCta(context.script, context.analysis, targetLanguage),
      };
    }

    const systemPrompt =
      action === "generate_hooks"
        ? `You are an elite short-form video retention coach specializing in ${platform}. Return strict JSON.
Source Script Language: ${detected}
Target Output Language: ${targetLanguage}
Generate 3 distinct, high-impact opening hooks that stop viewer scrolling within 2 seconds.
Rules:
- Output strictly in ${targetLanguage}.
- Styles must be: "Curiosity Gap", "Contrarian Hook", "High-Stakes Question".
- Each item must contain: text (under 12 words), rationale (why it stops the swipe), and style.`
        : `You are an elite short-form video retention coach specializing in ${platform}. Return strict JSON.
Source Script Language: ${detected}
Target Output Language: ${targetLanguage}
Generate 3 distinct, high-conversion concluding calls-to-action (CTAs) that preserve completion rate.
Rules:
- Output strictly in ${targetLanguage}.
- Styles must be: "High-Conversion Save", "Low-Friction Comment Loop", "Direct Action Follow".
- Each item must contain: text (under 15 words), rationale (why it drives algorithmic distribution), and style.`;

    const userPrompt = `Script:
${context.script}

Analysis Snapshot:
- Overall Score: ${context.analysis.score}/100
- Hook Score: ${context.analysis.metrics.hook}/100
- Pacing Score: ${context.analysis.metrics.pacing}/100
- CTA Score: ${context.analysis.metrics.cta}/100
- Drop-off Second: ${context.analysis.dropoffPrediction.second}s

Return strict JSON:
{"items":[{"style":"...","text":"...","rationale":"..."}]}`;

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          temperature: 0.7,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }),
      });

      if (!response.ok) throw new Error("OpenAI copilot execution failed");

      const json = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
      const parsed = JSON.parse(json.choices?.[0]?.message?.content ?? "{}") as OpenAICopilotResponse;

      const items = (parsed.items ?? [])
        .map((item) => ({
          style: item.style?.trim() || "Targeted Suggestion",
          text: item.text?.trim() || "",
          rationale: item.rationale?.trim() || "Optimized for viewer watch time and engagement.",
        }))
        .filter((item) => item.text.length > 0);

      if (!items.length) {
        return action === "generate_hooks"
          ? { action, targetLanguage, items: fallbackGenerateHooks(context.script, context.analysis, targetLanguage) }
          : { action, targetLanguage, items: fallbackImproveCta(context.script, context.analysis, targetLanguage) };
      }

      return {
        action,
        targetLanguage,
        items,
      };
    } catch {
      return action === "generate_hooks"
        ? { action, targetLanguage, items: fallbackGenerateHooks(context.script, context.analysis, targetLanguage) }
        : { action, targetLanguage, items: fallbackImproveCta(context.script, context.analysis, targetLanguage) };
    }
  }
}
