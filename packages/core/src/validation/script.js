"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateScript = validateScript;
function validateScript(script) {
    if (typeof script !== "string" || !script.trim()) {
        return {
            valid: false,
            error: "Please paste or write a script before analyzing.",
        };
    }
    const trimmed = script.trim();
    const words = trimmed.split(/\s+/).filter(Boolean);
    if (words.length > 800) {
        return {
            valid: false,
            error: "Script exceeds the maximum limit of 800 words for analysis.",
        };
    }
    // Extract all letter characters across any language (Unicode letter category \p{L})
    const letters = trimmed.match(/\p{L}/gu) || [];
    // Count words that contain at least one letter
    const wordsWithLetters = words.filter((word) => /\p{L}/u.test(word));
    if (letters.length < 10 || wordsWithLetters.length < 3) {
        return {
            valid: false,
            error: "Please enter a valid script with readable sentences or dialogue.",
        };
    }
    return { valid: true };
}
