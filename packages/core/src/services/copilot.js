"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeCopilotAction = executeCopilotAction;
const language_1 = require("../analysis/language");
const engine_1 = require("../copilot/engine");
async function executeCopilotAction(context, action, aiProvider) {
    const detected = context.detectedLanguage || (0, language_1.detectLanguage)(context.script).language;
    const targetLanguage = context.targetLanguage || detected;
    if (aiProvider?.executeCopilotAction) {
        return aiProvider.executeCopilotAction(context, action);
    }
    if (action === "generate_hooks") {
        return {
            action,
            targetLanguage,
            items: (0, engine_1.fallbackGenerateHooks)(context.script, context.analysis, targetLanguage),
        };
    }
    return {
        action,
        targetLanguage,
        items: (0, engine_1.fallbackImproveCta)(context.script, context.analysis, targetLanguage),
    };
}
