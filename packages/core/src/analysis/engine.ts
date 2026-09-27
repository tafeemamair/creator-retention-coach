import type { DropOffRisk, RetentionMetrics, DropoffPrediction, RewriteVersion } from "../types";
import { getPlatformProfile } from "./profiles";
import { detectLanguage } from "./language";

export interface SentimentAnalyzer {
  analyze(text: string): { score: number };
}

let defaultSentimentAnalyzer: SentimentAnalyzer | null = null;

export function setSentimentAnalyzer(analyzer: SentimentAnalyzer): void {
  defaultSentimentAnalyzer = analyzer;
}

export function getSentimentScore(text: string): number {
  if (defaultSentimentAnalyzer) {
    try {
      return defaultSentimentAnalyzer.analyze(text).score;
    } catch {
      return 0;
    }
  }
  return 0;
}

/**
 * Tokenize a text string into non-empty words.
 */
export function words(text: string): string[] {
  return text.trim().split(/\s+/).filter(Boolean);
}

/**
 * Robust sentence segmentation for spoken scripts across multiple languages.
 * Handles:
 * - Single paragraphs with standard punctuation (. ! ? …)
 * - Devanagari danda (।)
 * - Spanish inverted punctuation (¡ ¿)
 * - Multiline scripts
 * - Repeated punctuation (e.g. "Wait... what?!")
 * - Dialogue indicators and quotations
 * - Multiple spaces and empty segments
 */
export function splitIntoSentences(text: string): string[] {
  if (!text || typeof text !== "string") return [];
  const trimmed = text.trim();
  if (!trimmed) return [];

  const lines = trimmed.split(/\r?\n+/);
  const sentences: string[] = [];

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    // Split on terminal punctuation followed by space and next sentence boundary, or line end
    const rawChunks = trimmedLine
      .split(/(?<=[.!?…।]+["']?)(?:\s+(?=[A-Z0-9"'“‘¡¿\u0900-\u097F\p{Lu}])|\s*$)/u)
      .map((s) => s.trim())
      .filter(Boolean);

    for (const chunk of rawChunks) {
      const cleanChunk = chunk.replace(/\s+/g, " ").trim();
      if (cleanChunk.length > 0) {
        sentences.push(cleanChunk);
      }
    }
  }

  return sentences.length > 0 ? sentences : [trimmed];
}

/**
 * Estimates spoken duration in seconds at a natural spoken cadence (~160 words per minute / 2.67 words/sec).
 */
export function estimateDurationSeconds(script: string): number {
  const wordCount = words(script).length;
  return Math.max(10, Math.round((wordCount / 160) * 60));
}

/**
 * Formats script into clean, readable sentence lines.
 */
export function toSentenceLines(input: string, maxWords = 400): string {
  const sentences = splitIntoSentences(input);
  const result: string[] = [];
  let count = 0;

  for (const line of sentences) {
    const lineWords = words(line).length;
    if (count + lineWords > maxWords) break;
    result.push(line);
    count += lineWords;
  }

  if (result.length === 0) return "Stop scrolling.\nThis changes everything.\nFollow for part two.";
  return result.join("\n\n");
}

export function fallbackRewrites(script: string, targetLanguage = "en"): RewriteVersion[] {
  const base = toSentenceLines(script, 80);

  if (targetLanguage === "hi" || targetLanguage === "hi-Latn") {
    return [
      {
        type: "Curiosity Hook",
        script: toSentenceLines(
          `क्या आपको पता है कि एक छुपी हुई गलती आपके व्यूज रोक रही है? ${base} इसका समाधान बहुत आसान है। पूरा वीडियो देखें।`
        ),
      },
      {
        type: "Fast-Paced Retention",
        script: toSentenceLines(
          `स्क्रॉल करना बंद करें। पहले 3 सेकंड में व्यूअर्स को हुक करें। फालतू बातें काटें। अभी फॉलो करें।`
        ),
      },
      {
        type: "Emotional Storytelling",
        script: toSentenceLines(
          `महीनों तक जब मेरे व्यूज रुक गए थे, तब मैंने इस सीक्रेट को समझा। इस फॉर्मूले को सेव करें और शेयर करें।`
        ),
      },
    ];
  }

  if (targetLanguage === "es") {
    return [
      {
        type: "Curiosity Hook",
        script: toSentenceLines(
          `¿Qué pasaría si un error oculto está arruinando tus vistas? ${base} La solución es más simple de lo que crees. Sígueme para más.`
        ),
      },
      {
        type: "Fast-Paced Retention",
        script: toSentenceLines(
          `Deja de hacer scroll. Pierdes audiencia en los primeros 3 segundos. Entrega valor de inmediato. Guarda este video.`
        ),
      },
      {
        type: "Emotional Storytelling",
        script: toSentenceLines(
          `Casi me rindo cuando nadie veía mis videos. Pero cambié esta estructura y todo mejoró. Compártelo con un creador.`
        ),
      },
    ];
  }

  return [
    {
      type: "Curiosity Hook",
      script: toSentenceLines(
        `What if one hidden habit is killing your growth? ${base} The twist is simpler than you think. Want the exact checklist? Comment CHECKLIST now.`
      ),
    },
    {
      type: "Fast-Paced Retention",
      script: toSentenceLines(
        `Stop scrolling. You are losing viewers in the first 3 seconds. Cut the intro. Hit them with the payoff first. Then stack fast pattern interrupts every sentence. Keep each line short. If this helped, follow for daily retention fixes.`
      ),
    },
    {
      type: "Emotional Storytelling",
      script: toSentenceLines(
        `I almost quit creating after flat retention for months. Then one script structure changed everything. I opened with pain, revealed the turning point, and ended with one clear action. The audience stayed. Save this and share it with a creator friend.`
      ),
    },
  ];
}

function normalizeIdea(line: string): string {
  return line
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\b(the|a|an|and|or|but|so|to|of|in|on|for|with|that|this|it|is|are|be|el|la|los|las|de|que|en|ki|ka|ke|ko|hai|hain)\b/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Fallback heuristic detector for drop-off risks per sentence unit.
 */
export function fallbackDropOffRisks(
  script: string,
  platform = "YouTube Shorts",
  sourceLanguage = "en"
): DropOffRisk[] {
  const sentenceList = splitIntoSentences(script);
  if (!sentenceList.length) return [];

  const profile = getPlatformProfile(platform);
  const seenIdeas = new Map<string, number>();
  const isEnglish = sourceLanguage === "en";

  return sentenceList.map((line, index) => {
    const lineWords = words(line).length;
    const normalizedIdea = normalizeIdea(line);
    const ideaCount = normalizedIdea ? seenIdeas.get(normalizedIdea) ?? 0 : 0;
    if (normalizedIdea) seenIdeas.set(normalizedIdea, ideaCount + 1);

    const isOpeningWindow = index === 0;
    const hasQuestionMark = /[?¿]/.test(line);
    const hasCuriosityGap =
      hasQuestionMark ||
      (isEnglish
        ? /(\?|secret|nobody|without|until|mistake|what if|why|how)/i.test(line)
        : /(secret|mistake|raaz|galati|kyun|kaise|secreto|por qué|cómo|pourquoi)/i.test(line));
    const hasEmotionalTrigger = isEnglish
      ? /(fear|regret|pain|embarrass|shame|win|lose|urgent|danger|stuck|frustrat)/i.test(line)
      : /[!¡]/.test(line) || /(dar|dard|khushi|miedo|dolor|peur)/i.test(line);
    const hasFillerStart = isEnglish
      ? /^(and|so|but|then|anyway|okay|alright|hey guys|hello)\b/i.test(line)
      : /^(aur|to|lekin|hola|bueno|alors)\b/i.test(line);

    let score = 0;
    const reasons: string[] = [];
    const fixes: string[] = [];

    if (isOpeningWindow) {
      if (!hasCuriosityGap) {
        score += 3;
        reasons.push("Opening line misses the hook window and leaves no open curiosity loop.");
        fixes.push("Rewrite as a direct tension line in under 10 words (question or contrarian claim).");
      }
      if (lineWords > profile.hookMaxWords) {
        score += 2;
        reasons.push(`Opening line has ${lineWords} words; for ${profile.name}, target under ${profile.hookMaxWords} words.`);
        fixes.push(`Trim opening line by ${lineWords - profile.hookMaxWords} words to stop initial swipe.`);
      }
    }

    if (lineWords > profile.idealSentenceLength.max + 5) {
      score += 3;
      reasons.push(`Sentence is ${lineWords} words; target ${profile.idealSentenceLength.min}-${profile.idealSentenceLength.max} to keep rapid momentum.`);
      fixes.push(`Split into two shorter punchy sentences or cut ${lineWords - profile.idealSentenceLength.max} words.`);
    } else if (lineWords > profile.idealSentenceLength.max) {
      score += 2;
      reasons.push(`Sentence is ${lineWords} words; slightly dense for ${profile.name} spoken cadence.`);
      fixes.push(`Trim ${lineWords - profile.idealSentenceLength.max} words and eliminate unnecessary adverbs.`);
    }

    if (ideaCount > 0) {
      score += 3;
      reasons.push("No new information; this restates an earlier idea.");
      fixes.push("Replace with a concrete data point, example, or consequence not mentioned earlier.");
    }

    if (!hasCuriosityGap && index < Math.ceil(sentenceList.length * 0.6)) {
      score += 2;
      reasons.push("Line states a fact but generates no forward tension.");
      fixes.push("Add a forward-looking payoff phrase.");
    }

    if (!hasEmotionalTrigger && profile.name === "Instagram Reels") {
      score += 1;
      reasons.push("Emotion is flat; Reels audiences respond to relatable friction or visual contrast.");
      fixes.push("Inject an emotional consequence or visual tension.");
    }

    if (hasFillerStart) {
      score += 2;
      reasons.push("Starts with conversational filler, which delays value delivery.");
      fixes.push("Delete the filler transition and start immediately with the action verb or key noun.");
    }

    const risk: DropOffRisk["risk"] = score >= 6 ? "High" : score >= 3 ? "Medium" : "Low";
    return {
      line,
      risk,
      reason: reasons[0] ?? "Line is clear and maintains pacing momentum.",
      fix: fixes[0] ?? "Keep as-is; ensure dynamic visual pacing during filming.",
    };
  });
}

/**
 * Calculates deterministic analytical metrics and drop-off prediction from the script.
 * Preserves structural pacing across all languages and adapts sentiment/keyword scoring.
 */
export function metricScore(
  script: string,
  platform = "YouTube Shorts",
  languageContext?: { detectedLanguage: string; targetLanguage: string }
): {
  metrics: RetentionMetrics;
  dropoffPrediction: DropoffPrediction;
  timeline: Array<{ second: number; retention: number }>;
} {
  const profile = getPlatformProfile(platform);
  const sentenceList = splitIntoSentences(script);
  const totalWords = words(script).length;
  const hookLine = sentenceList[0] ?? "";
  const hookWordCount = words(hookLine).length;

  const detectedLang = languageContext?.detectedLanguage || detectLanguage(script).language;
  const isEnglish = detectedLang === "en";

  // 1. Hook Strength: Evaluates curiosity gap, length, and filler start
  let hasCuriosityHook: boolean;
  let hasPreamble: boolean;

  if (isEnglish) {
    hasCuriosityHook = /(\?|secret|mistake|stop|nobody tells you|what if|the real reason|don't|why you|hack)/i.test(hookLine);
    hasPreamble = /^(hey guys|hello|welcome back|today i want to|in this video|so basically)\b/i.test(hookLine);
  } else {
    // Language-neutral curiosity checks: Question marks (Western ? or Spanish ¿), exclamation, digits
    hasCuriosityHook = /[?¿!¡\d]/.test(hookLine) || /(secret|mistake|raaz|galati|kyun|kaise|secreto|por qué|cómo|pourquoi|ruko|espera|arrêtez)/i.test(hookLine);
    hasPreamble = /^(aur|to|lekin|hola|bueno|alors|aaj hum baat|aaj mai)\b/i.test(hookLine);
  }

  let hook = 50;
  if (hasCuriosityHook) hook += 25;
  if (hookWordCount > 0 && hookWordCount <= profile.hookMaxWords) hook += 15;
  if (hasPreamble) hook -= 25;
  if (hookWordCount > profile.hookMaxWords + 4) hook -= 15;
  hook = Math.round(Math.max(15, Math.min(100, hook)));

  // 2. Pacing: Evaluates average words per sentence against spoken cadence (Language-Neutral)
  const avgWordsPerSentence = sentenceList.length > 0 ? totalWords / sentenceList.length : totalWords;
  let pacingPenalty = 0;
  if (avgWordsPerSentence > profile.idealSentenceLength.max) {
    pacingPenalty = Math.min(65, (avgWordsPerSentence - profile.idealSentenceLength.max) * 5.5);
  } else if (avgWordsPerSentence < profile.idealSentenceLength.min) {
    pacingPenalty = Math.min(25, (profile.idealSentenceLength.min - avgWordsPerSentence) * 5);
  }
  const pacing = Math.round(Math.max(20, Math.min(100, 100 - pacingPenalty)));

  // 3. Emotion: Evaluates emotional intensity
  let emotion: number;
  if (isEnglish) {
    const sentiment = getSentimentScore(script);
    const hasEmotionalWords = /(story|felt|pain|fear|win|lost|regret|hate|love|secret|ruined|crazy|obsessed|struggle|worst|best)/i.test(script);
    const emotionBonus = profile.name === "Instagram Reels" ? 20 : 15;
    emotion = Math.round(
      Math.max(20, Math.min(100, 50 + Math.min(25, Math.abs(sentiment) * 4) + (hasEmotionalWords ? emotionBonus : 0)))
    );
  } else {
    // Non-English: Bypass English AFINN-165 dictionary to avoid false neutral clamping
    const hasExclamation = /[!¡]/.test(script);
    const hasQuestion = /[?¿]/.test(script);
    const hasEmotionalWords = /(dar|dard|khushi|miedo|dolor|peur|secret|secreto|crazy|hate|love)/i.test(script);
    const emotionBonus = profile.name === "Instagram Reels" ? 20 : 15;
    emotion = Math.round(
      Math.max(25, Math.min(100, 55 + (hasExclamation ? 15 : 0) + (hasQuestion ? 10 : 0) + (hasEmotionalWords ? emotionBonus : 0)))
    );
  }

  // 4. Value Delivery: Actionable steps, insights, framework keywords
  let hasActionableFramework: boolean;
  let hasImmediatePayoff: boolean;

  if (isEnglish) {
    hasActionableFramework = /(how to|step \d|framework|exact|do this|here's how|the key is|rule #\d|formula|blueprint)/i.test(script);
    hasImmediatePayoff = /(today|now|instantly|in \d+ seconds|first step|result)/i.test(script);
  } else {
    // Multilingual framework signals: numbers, step indicators, payoff keywords
    hasActionableFramework = /\d+|\b(step|tarika|nuskha|paso|etape|regla|rule)\b/i.test(script);
    hasImmediatePayoff = /(aaj|abhi|now|hoy|ahora|maintenant|inmediatamente|result)/i.test(script);
  }

  const valueBonus = profile.name === "YouTube Shorts" ? 40 : 35;
  const value = Math.round(
    Math.max(20, Math.min(100, 45 + (hasActionableFramework ? valueBonus : 0) + (hasImmediatePayoff ? 15 : 0)))
  );

  // 5. Call to Action: Multilingual clean closing prompt
  const hasCta = /(follow|comment|subscribe|save|share|dm|link in bio|check out|karo|karein|karen|sígueme|sigueme|suscríbete|suscribete|suivez|partagez|siga|inscreva|folge|abonnieren)/i.test(script);
  const cta = Math.round(hasCta ? 90 : 35);

  const duration = estimateDurationSeconds(script);

  // Identify lowest signal
  const metricsMap: RetentionMetrics = { hook, pacing, emotion, value, cta };
  const sortedMetrics = Object.entries(metricsMap).sort((a, b) => a[1] - b[1]);
  const weakMetric = sortedMetrics[0][0];

  const reasonMap: Record<string, string> = {
    hook: `Opening hook does not build enough curiosity in the first 2–3s for ${profile.name}.`,
    pacing: `Average sentence length (${avgWordsPerSentence.toFixed(1)} words) slows spoken momentum.`,
    emotion: `Emotional stakes are flat; lacks personal friction or high-contrast tension.`,
    value: `Key value takeaway arrives too late in the video.`,
    cta: `Missing or weak concluding call to action.`,
  };

  const dropoffSecond = Math.max(3, Math.round(duration * (0.15 + (100 - Math.min(hook, pacing)) / 220)));

  // Generate deterministic predicted retention timeline based on sentence units and metric decay
  const timeline = generatePredictedTimeline(
    sentenceList,
    metricsMap,
    duration,
    fallbackDropOffRisks(script, platform, detectedLang)
  );

  return {
    metrics: metricsMap,
    dropoffPrediction: { second: dropoffSecond, reason: reasonMap[weakMetric] },
    timeline,
  };
}

/**
 * Generates an authentic, deterministic predicted retention curve based on sentence durations and risk levels.
 */
export function generatePredictedTimeline(
  sentences: string[],
  metrics: RetentionMetrics,
  totalDurationSeconds: number,
  risks?: DropOffRisk[]
): Array<{ second: number; retention: number }> {
  if (!sentences.length || totalDurationSeconds <= 0) {
    return Array.from({ length: 11 }, (_, i) => ({ second: i * 3, retention: Math.max(20, 100 - i * 5) }));
  }

  // Create a map of sentence index to risk penalty
  const riskPenalties = (risks ?? []).map((r) => {
    if (r.risk === "High") return 11;
    if (r.risk === "Medium") return 6;
    return 2;
  });

  // Calculate duration of each sentence based on word count (~2.67 words/sec)
  const sentenceDurations = sentences.map((s) => {
    const w = words(s).length;
    return Math.max(1.5, Math.round((w / 2.67) * 10) / 10);
  });

  // Initial hook drop in first 2-3 seconds based on Hook score
  const hookRetention = Math.max(65, Math.min(95, Math.round(55 + metrics.hook * 0.4)));

  // Build second-by-second simulated points
  const points: Array<{ second: number; retention: number }> = [];
  points.push({ second: 0, retention: 100 });

  let currentRetention = hookRetention;
  let cumulativeTime = 0;

  for (let i = 0; i < sentences.length; i++) {
    const dur = sentenceDurations[i];
    const penalty = riskPenalties[i] ?? 3;
    cumulativeTime += dur;

    // Normal baseline decay per second plus sentence risk penalty
    const decay = penalty * 0.7 + (100 - metrics.pacing) * 0.04;
    currentRetention = Math.max(18, Math.round(currentRetention - decay));

    // Sample points at regular intervals or sentence ends
    points.push({
      second: Math.round(cumulativeTime),
      retention: currentRetention,
    });
  }

  // Normalize into standard timeline points from 0 to min(totalDuration, 30s) or full duration
  const targetEndSecond = Math.max(30, Math.min(60, Math.round(cumulativeTime)));
  const step = Math.max(2, Math.round(targetEndSecond / 10));

  const sampledTimeline: Array<{ second: number; retention: number }> = [];
  sampledTimeline.push({ second: 0, retention: 100 });

  for (let s = step; s <= targetEndSecond; s += step) {
    // Interpolate retention at second `s` from points
    let r = currentRetention;
    for (let p = 0; p < points.length - 1; p++) {
      if (s >= points[p].second && s <= points[p + 1].second) {
        const span = points[p + 1].second - points[p].second;
        const progress = span > 0 ? (s - points[p].second) / span : 0;
        r = Math.round(points[p].retention + progress * (points[p + 1].retention - points[p].retention));
        break;
      }
    }
    sampledTimeline.push({ second: s, retention: Math.max(15, r) });
  }

  return sampledTimeline;
}
