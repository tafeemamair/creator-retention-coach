import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { OpenAIProvider } from "../../infra/src/index";
import { McpLedgerAdapter } from "./ledger/adapter";
import type {
  AIProvider,
  LedgerRepository,
  AnalysisRepository,
  AuthContext,
} from "../../core/src/index";

import {
  previewScriptRetentionSchema,
  handlePreviewScriptRetention,
} from "./tools/previewScriptRetention";
import {
  analyzeScriptRetentionSchema,
  handleAnalyzeScriptRetention,
} from "./tools/analyzeScriptRetention";
import {
  generateViralHooksSchema,
  handleGenerateViralHooks,
} from "./tools/generateViralHooks";
import {
  improveScriptCtaSchema,
  handleImproveScriptCta,
} from "./tools/improveScriptCta";
import {
  getCreatorActionPlanSchema,
  handleGetCreatorActionPlan,
} from "./tools/getCreatorActionPlan";
import {
  checkUserCreditsSchema,
  handleCheckUserCredits,
} from "./tools/checkUserCredits";

import type { JwtVerifyOptions } from "./auth/adapter";

export interface ServerDependencies {
  aiProvider?: AIProvider;
  ledger?: LedgerRepository;
  repository?: AnalysisRepository;
  authContext?: AuthContext;
  jwtVerifyOptions?: JwtVerifyOptions;
}

export function createCrcMcpServer(deps?: ServerDependencies) {
  const aiProvider = deps?.aiProvider || new OpenAIProvider();
  const ledger = deps?.ledger || new McpLedgerAdapter();
  const repository = deps?.repository;
  const authContext = deps?.authContext;

  const server = new McpServer({
    name: "creator-retention-coach",
    version: "1.0.0",
  });

  // Tool 1: preview_script_retention (Deterministic, Read-Only, No Auth Required)
  server.tool(
    "preview_script_retention",
    "Lightweight script retention preview. Evaluates hooks, pacing, structure, and retention drop-offs without consuming credits or creating database records.",
    previewScriptRetentionSchema,
    async (args: any) => {
      return handlePreviewScriptRetention(args);
    }
  );

  // Tool 2: analyze_script_retention (State-Mutating, Credit-Consuming, Auth Required)
  server.tool(
    "analyze_script_retention",
    "Full Creator Retention Coach analysis. Generates 7 retention metric scores, second-by-second drop-off curve, drop-off risks with diagnostic explanations, and targeted rewrites. Requires authenticated user with available credits.",
    analyzeScriptRetentionSchema,
    async (args: any) => {
      return handleAnalyzeScriptRetention(args, {
        aiProvider,
        ledger,
        repository,
        authContext,
      });
    }
  );

  // Tool 3: generate_viral_hooks (AI Generative, Read-Only, No Auth Required)
  server.tool(
    "generate_viral_hooks",
    "Generates 3 high-retention opening hook variations (Curiosity, Contrarian, and Direct) tailored to the script and platform cadence using CRC Copilot.",
    generateViralHooksSchema,
    async (args: any) => {
      return handleGenerateViralHooks(args, { aiProvider });
    }
  );

  // Tool 4: improve_script_cta (AI Generative, Read-Only, No Auth Required)
  server.tool(
    "improve_script_cta",
    "Replaces weak or generic call-to-actions with a seamless, high-converting conclusion using CRC Copilot.",
    improveScriptCtaSchema,
    async (args: any) => {
      return handleImproveScriptCta(args, { aiProvider });
    }
  );

  // Tool 5: get_creator_action_plan (Deterministic, Read-Only, No Auth Required)
  server.tool(
    "get_creator_action_plan",
    "Generates a deterministic, prioritized 3-tier creator action plan (Immediate Critical Fixes, Quick Wins, and Long-Term Improvements) based on retention diagnostics.",
    getCreatorActionPlanSchema,
    async (args: any) => {
      return handleGetCreatorActionPlan(args);
    }
  );

  // Tool 6: check_user_credits (Identity-Bound, Read-Only, Auth Required)
  server.tool(
    "check_user_credits",
    "Checks the authenticated creator's available CRC credits and entitlement status (free daily credits, paid credits, and next reset window). Requires authenticated user identity.",
    checkUserCreditsSchema,
    async (args: any) => {
      return handleCheckUserCredits(args, { ledger, authContext });
    }
  );

  return server;
}
