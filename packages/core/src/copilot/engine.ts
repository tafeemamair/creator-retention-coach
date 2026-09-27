import type { FullAnalysis, CopilotAction, CopilotActionItem } from "../types";
import { splitIntoSentences, words } from "../analysis/engine";

/**
 * Validates whether an incoming action string is a supported CopilotAction.
 */
export function isValidCopilotAction(action: unknown): action is CopilotAction {
  return action === "generate_hooks" || action === "improve_cta";
}

/**
 * Replaces the opening hook (first sentence/line) of a script while preserving
 * subsequent paragraph breaks, formatting, and newlines.
 */
export function applyHookToScript(script: string, newHook: string): string {
  if (!script || typeof script !== "string") return newHook.trim();
  const trimmedHook = newHook.trim();
  if (!trimmedHook) return script;

  const lines = script.split(/(\r?\n)/);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line && line.trim() && !line.includes("\n")) {
      const sentences = splitIntoSentences(line);
      if (sentences.length <= 1) {
        lines[i] = trimmedHook;
      } else {
        const firstSentence = sentences[0];
        const rest = line.substring(firstSentence.length).trimStart();
        lines[i] = `${trimmedHook} ${rest}`;
      }
      return lines.join("");
    }
  }

  return trimmedHook;
}

/**
 * Replaces the concluding call-to-action (last sentence/line) of a script while
 * preserving preceding paragraph breaks, formatting, and newlines.
 */
export function applyCtaToScript(script: string, newCta: string): string {
  if (!script || typeof script !== "string") return newCta.trim();
  const trimmedCta = newCta.trim();
  if (!trimmedCta) return script;

  const lines = script.split(/(\r?\n)/);

  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    if (line && line.trim() && !line.includes("\n")) {
      const sentences = splitIntoSentences(line);
      if (sentences.length <= 1) {
        lines[i] = trimmedCta;
      } else {
        const lastSentence = sentences[sentences.length - 1];
        const lastIndex = line.lastIndexOf(lastSentence);
        if (lastIndex !== -1) {
          const before = line.substring(0, lastIndex).trimEnd();
          lines[i] = `${before} ${trimmedCta}`;
        } else {
          lines[i] = trimmedCta;
        }
      }
      return lines.join("");
    }
  }

  return `${script.trimEnd()}\n\n${trimmedCta}`;
}

/**
 * Deterministic multilingual fallback for hook generation when AI provider is unavailable.
 */
export function fallbackGenerateHooks(
  script: string,
  analysis: FullAnalysis,
  targetLanguage = "en"
): CopilotActionItem[] {
  const sentences = splitIntoSentences(script);
  const originalHook = sentences[0] || "Stop scrolling right now.";
  const topicSnippet = words(originalHook).slice(0, 6).join(" ");

  if (targetLanguage === "hi" || targetLanguage === "hi-Latn") {
    return [
      {
        style: "Curiosity Gap",
        text: `क्या आप जानते हैं कि 90% क्रिएटर्स इस एक गलती की वजह से व्यूज खो रहे हैं?`,
        rationale: "सीधे दर्शक के दर्द पर हमला करता है और जिज्ञासा पैदा करता है।",
      },
      {
        style: "Contrarian Hook",
        text: `जो तरीका आप अभी तक इस्तेमाल कर रहे थे, वह पूरी तरह से गलत है।`,
        rationale: "मान्यताओं को चुनौती देकर तुरंत स्क्रॉल रोकता है।",
      },
      {
        style: "High-Stakes Question",
        text: `अगर आपको सिर्फ 3 सेकंड में व्यूज डबल करने हों, तो यह एक नियम कभी मत भूलना।`,
        rationale: "स्पष्ट लाभ और तुरंत समाधान का वादा करता है।",
      },
    ];
  }

  if (targetLanguage === "es") {
    return [
      {
        style: "Curiosity Gap",
        text: `¿Por qué el 90% de los creadores pierden audiencia en los primeros 3 segundos?`,
        rationale: "Abre un bucle de curiosidad atacando un error común de retención.",
      },
      {
        style: "Contrarian Hook",
        text: `Todo lo que te dijeron sobre retención en videos cortos está equivocado.`,
        rationale: "Desafía una creencia común para detener el scroll de inmediato.",
      },
      {
        style: "High-Stakes Question",
        text: `¿Quieres evitar que tu audiencia abandone este video antes del segundo 5?`,
        rationale: "Plantea una consecuencia directa y promete una solución inmediata.",
      },
    ];
  }

  return [
    {
      style: "Curiosity Gap",
      text: `Why is everyone getting this completely wrong about ${topicSnippet || "retention"}?`,
      rationale: "Forces viewers to pause by exposing a common misconception in the opening second.",
    },
    {
      style: "Contrarian Hook",
      text: `Stop making this one mistake if you want people to actually watch till the end.`,
      rationale: "Creates immediate negative urgency to prevent the initial swipe.",
    },
    {
      style: "High-Stakes Question",
      text: `What if the real reason your videos drop off at second 3 has nothing to do with the hook?`,
      rationale: "Opens a powerful curiosity loop that requires staying to resolve.",
    },
  ];
}

/**
 * Deterministic multilingual fallback for CTA improvement when AI provider is unavailable.
 */
export function fallbackImproveCta(
  script: string,
  analysis: FullAnalysis,
  targetLanguage = "en"
): CopilotActionItem[] {
  if (targetLanguage === "hi" || targetLanguage === "hi-Latn") {
    return [
      {
        style: "Value Bookmark / Save",
        text: "इस फॉर्मूले को अभी सेव करें ताकि अगली स्क्रिप्ट लिखते समय यह याद रहे।",
        rationale: "दर्शकों को भविष्य के उपयोग के लिए सेव करने के लिए प्रेरित करता है।",
      },
      {
        style: "Curiosity Loop Follow",
        text: "रोजाना ऐसे ही प्रूवेन रिटेंशन हैक्स के लिए अभी फॉलो करें।",
        rationale: "स्पष्ट और बिना रुकावट के फॉलो करने का कारण देता है।",
      },
      {
        style: "Community Discussion",
        text: "नीचे कमेंट में बताएं: क्या आपकी भी रिटेंशन दूसरे 5 पर गिरती है?",
        rationale: "एंगेजमेंट लूप बनाता है जिससे एल्गोरिदम वीडियो को पुश करता है।",
      },
    ];
  }

  if (targetLanguage === "es") {
    return [
      {
        style: "Value Bookmark / Save",
        text: "Guarda este video antes de escribir tu próximo guion.",
        rationale: "Fomenta el guardado para aumentar la distribución algorítmica.",
      },
      {
        style: "Curiosity Loop Follow",
        text: "Sígueme para aprender a optimizar la retención de cada video.",
        rationale: "Llamado a la acción directo y enfocado en el valor continuo.",
      },
      {
        style: "Community Discussion",
        text: "¿Te pasa lo mismo en el segundo 3? Comenta abajo tu experiencia.",
        rationale: "Genera comentarios rápidos y conversación activa.",
      },
    ];
  }

  if (targetLanguage === "fr") {
    return [
      {
        style: "Value Bookmark / Save",
        text: "Enregistre cette vidéo avant d'écrire ton prochain script.",
        rationale: "Encourage l'enregistrement pour maximiser la distribution algorithmique.",
      },
      {
        style: "Curiosity Loop Follow",
        text: "Abonne-toi pour recevoir chaque jour les meilleurs conseils de rétention.",
        rationale: "Crée une incitation claire à suivre le compte pour une valeur continue.",
      },
      {
        style: "Community Discussion",
        text: "Laisse un commentaire avec ta niche pour booster les interactions.",
        rationale: "Génère des signaux d'engagement immédiats sans friction cognitive.",
      },
    ];
  }

  return [
    {
      style: "Value Bookmark / Save",
      text: "Save this checklist so you can apply it before filming your next video.",
      rationale: "Signals high value to platform algorithms through bookmarking without hurting completion rate.",
    },
    {
      style: "Curiosity Loop Follow",
      text: "Follow for daily, proven short-form retention blueprints that actually work.",
      rationale: "Sets a clear expectation of recurring future value in one punchy concluding sentence.",
    },
    {
      style: "Community Discussion",
      text: "Drop a comment below with your niche and I'll audit your first 3 seconds.",
      rationale: "Invites instant interaction with low cognitive burden, triggering viral distribution signals.",
    },
  ];
}
