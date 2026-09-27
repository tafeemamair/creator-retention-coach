import crypto from "node:crypto";
import { z } from "zod";
import {
  validateScript,
  analyzeRetention,
  type Platform,
  type SupportedLanguage,
  type AIProvider,
  type LedgerRepository,
  type AnalysisRepository,
  type AuthContext,
} from "../../../core/src/index";

export const analyzeScriptRetentionSchema = {
  script: z
    .string()
    .min(50, "Script must be at least 50 characters")
    .max(100000, "Script exceeds maximum limit of 100,000 characters")
    .describe("The video script text to analyze (minimum 50 characters)"),
  platform: z
    .enum([
      "youtube_longform",
      "youtube_shorts",
      "reels",
      "tiktok",
      "linkedin_video",
      "x_video",
      "podcast",
    ])
    .describe("The target publishing platform"),
  language: z
    .enum(["en", "es", "fr", "de", "hi"])
    .optional()
    .describe("Optional ISO language code (auto-detected if omitted)"),
};

export async function handleAnalyzeScriptRetention(
  args: {
    script: string;
    platform: Platform;
    language?: SupportedLanguage;
  },
  deps: {
    aiProvider: AIProvider;
    ledger?: LedgerRepository;
    repository?: AnalysisRepository;
    authContext?: AuthContext;
  }
) {
  // 1. Strict authentication & scope check
  if (!deps.authContext?.userId || deps.authContext.userId === "mcp_anonymous_user") {
    return {
      isError: true,
      content: [{ type: "text" as const, text: "Authentication required: Full retention analysis requires an authenticated account." }],
    };
  }

  const scopes: string[] = (deps.authContext as any)?.scopes || [];
  const hasCustomCrcScopes = scopes.some((s) => s.startsWith("retention:") || s.startsWith("user:") || s.startsWith("crc:"));
  if (hasCustomCrcScopes && !scopes.includes("retention:analyze") && !scopes.includes("*")) {
    return {
      isError: true,
      content: [{ type: "text" as const, text: "Forbidden: Missing required OAuth scope 'retention:analyze'." }],
      _meta: {
        "mcp/www_authenticate": [
          `Bearer realm="mcp", error="insufficient_scope", error_description="The access token does not contain required scope 'retention:analyze'", scope="retention:analyze"`,
        ],
      },
    };
  }

  // 2. Pure script validation
  const validation = validateScript(args.script);
  if (!validation.valid) {
    return {
      isError: true,
      content: [{ type: "text" as const, text: `Validation Error: ${validation.error}` }],
    };
  }

  // 3. Compute deterministic SHA-256 script hash for idempotency
  const scriptHash = crypto.createHash("sha256").update(args.script.trim()).digest("hex");
  const userId = deps.authContext.userId;

  // 4. Reserve credit via production ledger repository
  let reservationId: string | undefined;
  if (deps.ledger) {
    const reservation = await deps.ledger.reserveCredit(userId, scriptHash, args.platform);
    if (!reservation.success) {
      return {
        isError: true,
        content: [{ type: "text" as const, text: `Entitlement Error: ${reservation.error || "Insufficient analysis credits."}` }],
      };
    }
    reservationId = reservation.reservationId;
  }

  // 5. Execute analysis and manage credit lifecycle
  try {
    const analysis = await analyzeRetention(
      args.script,
      {
        full: true,
        platform: args.platform,
        targetLanguage: args.language,
      },
      deps.aiProvider
    );

    // Commit credit upon successful analysis
    if (deps.ledger && reservationId) {
      await deps.ledger.commitCredit(reservationId);
    }

    return {
      content: [{ type: "text" as const, text: JSON.stringify(analysis, null, 2) }],
    };
  } catch (err: any) {
    // Rollback credit on failure
    if (deps.ledger && reservationId) {
      await deps.ledger.rollbackCredit(reservationId);
    }
    return {
      isError: true,
      content: [{ type: "text" as const, text: `Analysis Error: ${err?.message || "Analysis execution failed."}` }],
    };
  }
}
