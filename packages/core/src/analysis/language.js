"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectLanguage = detectLanguage;
// Hinglish (Romanized Hindi) distinct markers
const HINGLISH_MARKERS = new Set([
    "aaj", "baat", "karo", "kyun", "karein", "karen", "hai", "hain", "aap", "aapke",
    "tum", "ruko", "jaante", "lekin", "yeh", "woh", "kaise", "nahi", "dekho", "karna",
    "kare", "hoga", "hota", "pehle", "sirf", "apne", "apna", "bhai", "dost", "kuch",
    "kisi", "matlab", "shuru", "khatam", "samajh", "bhi", "toh", "ab", "abhi", "hum",
    "mera", "meri", "tere", "teri", "wala", "wali", "wale", "koshish"
]);
// Spanish-unique or high-signal words
const SPANISH_UNIQUE = new Set([
    "el", "la", "los", "las", "del", "por", "para", "con", "este", "esta", "estos", "estas",
    "segundo", "segundos", "gancho", "espera", "suscríbete", "suscribete", "sígueme", "sigueme",
    "porque", "pero", "cómo", "como", "más", "mas", "aquí", "aqui", "todos", "todas", "tiempo",
    "audiencia", "pierden", "tienes", "hacer", "quieres", "sabías", "sabias"
]);
// French-unique or high-signal words
const FRENCH_UNIQUE = new Set([
    "le", "la", "les", "des", "du", "qui", "dans", "pour", "avec", "sur", "vous",
    "scroller", "temps", "visionnage", "règle", "regle", "ceci", "cette", "votre", "vos",
    "pourquoi", "comment", "arrêter", "arretez", "immédiatement", "immediatement",
    "regardez", "suivez", "astuce", "astuces", "appliquez", "doubler", "est",
    "sont", "faire", "avez", "si"
]);
// Portuguese-unique or high-signal words
const PORTUGUESE_UNIQUE = new Set([
    "os", "as", "um", "uma", "uns", "umas", "do", "da", "dos", "das", "em", "para",
    "com", "você", "voce", "estes", "estas", "não", "nao", "mais",
    "segundo", "segundos", "gancho", "retenção", "retencao", "siga", "inscreva",
    "dobrar", "seus", "vídeos", "videos", "pare", "rolar", "dica", "sua"
]);
// German-unique or high-signal words
const GERMAN_UNIQUE = new Set([
    "der", "die", "das", "ein", "eine", "einen", "einem", "einer", "und", "in", "den",
    "von", "zu", "mit", "sich", "des", "auf", "für", "fuer", "ist", "im", "dem", "nicht",
    "als", "auch", "es", "an", "werden", "aus", "er", "hat", "dass", "dieses", "diese",
    "dieser", "diesen", "sekunde", "sekunden", "haken", "folge", "tipps", "hör",
    "scrollen", "zuschauer", "halten", "willst", "mache", "fehler", "wenn", "du", "deine"
]);
// English distinct markers
const ENGLISH_MARKERS = new Set([
    "the", "is", "are", "and", "or", "you", "your", "to", "in", "of", "for", "this",
    "that", "with", "stop", "scrolling", "retention", "first", "second", "seconds", "views",
    "watch", "time", "hook", "video", "channel", "how", "why", "what", "if", "here",
    "their", "they", "them", "because", "follow", "subscribe", "secret", "mistake", "fixes",
    "formula", "drops", "broken", "right", "now", "doubles"
]);
/**
 * Tokenizes text into lowercase words preserving Unicode letters.
 */
function extractTokens(text) {
    return text
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, " ")
        .split(/\s+/)
        .filter(Boolean);
}
/**
 * Deterministically analyzes script character sets and token frequencies
 * to detect writing system and natural language without external network calls.
 */
function detectLanguage(script) {
    if (!script || typeof script !== "string" || !script.trim()) {
        return { language: "en", confidence: "low", scriptFamily: "latin" };
    }
    const trimmed = script.trim();
    // 1. Unicode Script Family Character Counts
    let devanagariCount = 0;
    let cyrillicCount = 0;
    let arabicCount = 0;
    let cjkCount = 0;
    let latinCount = 0;
    let totalLetters = 0;
    for (const char of trimmed) {
        const code = char.codePointAt(0);
        if (!code)
            continue;
        // Devanagari (\u0900 - \u097F)
        if (code >= 0x0900 && code <= 0x097f) {
            devanagariCount++;
            totalLetters++;
        }
        // Cyrillic (\u0400 - \u04FF)
        else if (code >= 0x0400 && code <= 0x04ff) {
            cyrillicCount++;
            totalLetters++;
        }
        // Arabic (\u0600 - \u06FF)
        else if (code >= 0x0600 && code <= 0x06ff) {
            arabicCount++;
            totalLetters++;
        }
        // CJK (\u4E00 - \u9FFF, \u3040 - \u30FF, \uAC00 - \uD7AF)
        else if ((code >= 0x4e00 && code <= 0x9fff) ||
            (code >= 0x3040 && code <= 0x30ff) ||
            (code >= 0xac00 && code <= 0xd7af)) {
            cjkCount++;
            totalLetters++;
        }
        // Basic Latin & Latin Extended (\u0041 - \u024F)
        else if ((code >= 0x0041 && code <= 0x005a) ||
            (code >= 0x0061 && code <= 0x007a) ||
            (code >= 0x00c0 && code <= 0x024f)) {
            latinCount++;
            totalLetters++;
        }
    }
    // Non-Latin Script Decisions
    if (totalLetters > 0) {
        if (devanagariCount / totalLetters > 0.15) {
            return { language: "hi", confidence: "high", scriptFamily: "devanagari" };
        }
        if (cyrillicCount / totalLetters > 0.25) {
            return { language: "ru", confidence: "high", scriptFamily: "cyrillic" };
        }
        if (arabicCount / totalLetters > 0.25) {
            return { language: "ar", confidence: "high", scriptFamily: "arabic" };
        }
        if (cjkCount / totalLetters > 0.15) {
            return { language: "zh", confidence: "high", scriptFamily: "cjk" };
        }
    }
    // 2. Latin-Script Language Disambiguation via Lexical Marker Frequencies
    const tokens = extractTokens(trimmed);
    if (tokens.length === 0) {
        return { language: "en", confidence: "low", scriptFamily: "latin" };
    }
    let hinglishMatches = 0;
    let spanishMatches = 0;
    let frenchMatches = 0;
    let portugueseMatches = 0;
    let germanMatches = 0;
    let englishMatches = 0;
    for (const token of tokens) {
        if (HINGLISH_MARKERS.has(token))
            hinglishMatches++;
        if (SPANISH_UNIQUE.has(token))
            spanishMatches++;
        if (FRENCH_UNIQUE.has(token))
            frenchMatches++;
        if (PORTUGUESE_UNIQUE.has(token))
            portugueseMatches++;
        if (GERMAN_UNIQUE.has(token))
            germanMatches++;
        if (ENGLISH_MARKERS.has(token))
            englishMatches++;
    }
    const nonEnglishScores = [
        { lang: "hi-Latn", matches: hinglishMatches },
        { lang: "es", matches: spanishMatches },
        { lang: "fr", matches: frenchMatches },
        { lang: "pt", matches: portugueseMatches },
        { lang: "de", matches: germanMatches },
    ].sort((a, b) => b.matches - a.matches);
    const bestNonEnglish = nonEnglishScores[0];
    if (bestNonEnglish && bestNonEnglish.matches >= 2) {
        const confidence = bestNonEnglish.matches >= 4 ? "high" : "medium";
        return { language: bestNonEnglish.lang, confidence, scriptFamily: "latin" };
    }
    if (bestNonEnglish && bestNonEnglish.matches === 1 && tokens.length <= 15 && englishMatches <= 1) {
        return { language: bestNonEnglish.lang, confidence: "medium", scriptFamily: "latin" };
    }
    // English detection
    if (englishMatches >= 4 && tokens.length >= 10) {
        const confidence = englishMatches >= 6 ? "high" : "medium";
        return { language: "en", confidence, scriptFamily: "latin" };
    }
    if (englishMatches >= 2 && tokens.length >= 10) {
        return { language: "en", confidence: "medium", scriptFamily: "latin" };
    }
    // Default fallback for Latin scripts
    return { language: "en", confidence: "low", scriptFamily: "latin" };
}
