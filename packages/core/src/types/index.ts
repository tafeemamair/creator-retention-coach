export type Platform = "YouTube Shorts" | "TikTok" | "Instagram Reels";

export type RetentionMetrics = {
  hook: number;
  pacing: number;
  emotion: number;
  value: number;
  cta: number;
};

export type DropoffPrediction = {
  second: number;
  reason: string;
};

export type DropOffRisk = {
  line: string;
  risk: "Low" | "Medium" | "High";
  reason: string;
  fix: string;
};

export type RewriteVersion = {
  type: "Curiosity Hook" | "Fast-Paced Retention" | "Emotional Storytelling";
  script: string;
};

export type FullAnalysis = {
  score: number;
  metrics: RetentionMetrics;
  dropoffPrediction: DropoffPrediction;
  dropOffRisks: DropOffRisk[];
  retentionTimeline: Array<{ second: number; retention: number }>;
  rewrites: RewriteVersion[];
  improvedScript: string;
  viralTitleSuggestions: string[];
  detectedLanguage?: string;
  targetLanguage?: string;
  languageConfidence?: "high" | "medium" | "low";
};

export type PreviewAnalysis = {
  score: number;
  metrics: RetentionMetrics;
  dropoffPrediction: DropoffPrediction;
  detectedLanguage?: string;
  targetLanguage?: string;
  languageConfidence?: "high" | "medium" | "low";
};

export type ScriptValidationResult = {
  valid: boolean;
  error?: string;
};

export type ScriptFamily =
  | "latin"
  | "devanagari"
  | "cyrillic"
  | "arabic"
  | "cjk"
  | "other";

export interface LanguageDetectionResult {
  language: string;
  confidence: "high" | "medium" | "low";
  scriptFamily: ScriptFamily;
}

export type ActionCategory =
  | "hook"
  | "high_risk_line"
  | "pacing"
  | "value"
  | "emotion"
  | "cta";

export type ActionPriority = "high" | "medium" | "low";

export interface ActionPlanItem {
  id: string;
  category: ActionCategory;
  categoryLabel: string;
  priority: ActionPriority;
  title: string;
  description: string;
  recommendedFix: string;
  targetLine?: string;
}

export interface PostAnalysisActionPlan {
  summary: string;
  totalActions: number;
  highPriorityCount: number;
  items: ActionPlanItem[];
}

export type CopilotAction = "generate_hooks" | "improve_cta";

export interface CopilotActionItem {
  text: string;
  rationale: string;
  style: string;
}

export interface CopilotResult {
  action: CopilotAction;
  targetLanguage: string;
  items: CopilotActionItem[];
}

export interface CopilotContext {
  script: string;
  analysis: FullAnalysis;
  detectedLanguage?: string;
  targetLanguage?: string;
  platform?: Platform | string;
}

export interface AuthContext {
  userId: string;
  email?: string;
  authType: "supabase_session" | "api_key" | "oauth_token";
}

export interface PlatformProfile {
  name: Platform;
  weights: { hook: number; pacing: number; emotion: number; value: number; cta: number };
  idealSentenceLength: { min: number; max: number };
  hookMaxWords: number;
}
