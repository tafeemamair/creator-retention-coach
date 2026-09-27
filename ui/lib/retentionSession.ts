export type Analysis = {
  score: number;
  metrics: { hook: number; pacing: number; emotion: number; value: number; cta: number };
  dropoffPrediction: { second: number; reason: string };
  retentionTimeline: Array<{ second: number; retention: number }>;
  dropOffRisks: Array<{ line: string; reason: string }>;
  rewrites: Array<{ type: "Curiosity Hook" | "Fast-Paced Retention" | "Emotional Storytelling"; script: string }>;
  improvedScript: string;
  viralTitleSuggestions: string[];
};

export type Preview = {
  score: number;
  metrics: Analysis["metrics"];
  dropoffPrediction: Analysis["dropoffPrediction"];
};

export type Platform = "YouTube Shorts" | "TikTok" | "Instagram Reels";
export type PricingPlan = "single" | "pack5";
export type FormStatus = "locked" | "loading" | "unlocked";

export interface RetentionSessionState {
  version: number;
  script: string;
  platform: Platform;
  selectedPlan: PricingPlan;
  preview: Preview | null;
  fullAnalysis: Analysis | null;
  status: "locked" | "unlocked";
  freeLimitReached: boolean;
  showFullScriptComposer: boolean;
  creditsRemaining: number | null;
  totalCredits: number | null;
  currentPlan: PricingPlan | null;
}

export const SESSION_STORAGE_KEY = "crc_retention_session_v1";
export const SESSION_STORAGE_VERSION = 1;

/**
 * Loads and validates the persisted RetentionForm session state from sessionStorage.
 * Safe for SSR: returns null if executed in a server environment.
 * Handles malformed JSON or mismatched version numbers by returning null.
 */
export function loadRetentionSession(): RetentionSessionState | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;

    if (parsed.version !== SESSION_STORAGE_VERSION) {
      // Invalidate incompatible or outdated version
      window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }

    if (typeof parsed.script !== "string") {
      return null;
    }

    const validPlatforms: Platform[] = ["YouTube Shorts", "TikTok", "Instagram Reels"];
    const platform: Platform = validPlatforms.includes(parsed.platform) ? parsed.platform : "YouTube Shorts";

    const selectedPlan: PricingPlan = parsed.selectedPlan === "single" ? "single" : "pack5";
    const status: "locked" | "unlocked" =
      parsed.status === "unlocked" && parsed.fullAnalysis ? "unlocked" : "locked";

    return {
      version: SESSION_STORAGE_VERSION,
      script: parsed.script,
      platform,
      selectedPlan,
      preview: parsed.preview && typeof parsed.preview === "object" ? parsed.preview : null,
      fullAnalysis: parsed.fullAnalysis && typeof parsed.fullAnalysis === "object" ? parsed.fullAnalysis : null,
      status,
      freeLimitReached: Boolean(parsed.freeLimitReached),
      showFullScriptComposer: Boolean(parsed.showFullScriptComposer),
      creditsRemaining: typeof parsed.creditsRemaining === "number" ? parsed.creditsRemaining : null,
      totalCredits: typeof parsed.totalCredits === "number" ? parsed.totalCredits : null,
      currentPlan: parsed.currentPlan === "single" || parsed.currentPlan === "pack5" ? parsed.currentPlan : null,
    };
  } catch (err) {
    console.warn("Failed to read retention session from sessionStorage:", err);
    return null;
  }
}

/**
 * Persists the current RetentionForm working state to sessionStorage.
 * Safe for SSR: returns early if window is undefined.
 */
export function saveRetentionSession(state: Omit<RetentionSessionState, "version">): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const payload: RetentionSessionState = {
      version: SESSION_STORAGE_VERSION,
      script: state.script,
      platform: state.platform,
      selectedPlan: state.selectedPlan,
      preview: state.preview,
      fullAnalysis: state.fullAnalysis,
      status: state.status === "unlocked" ? "unlocked" : "locked",
      freeLimitReached: state.freeLimitReached,
      showFullScriptComposer: state.showFullScriptComposer,
      creditsRemaining: state.creditsRemaining,
      totalCredits: state.totalCredits,
      currentPlan: state.currentPlan,
    };

    window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.warn("Failed to save retention session to sessionStorage:", err);
  }
}

/**
 * Clears the persisted RetentionForm state from sessionStorage.
 */
export function clearRetentionSession(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // Ignore error
  }
}
