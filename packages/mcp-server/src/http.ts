import http from "node:http";
import { createCrcMcpServer, type ServerDependencies } from "./server";
import { resolveMcpAuthContext, type JwtVerifyOptions } from "./auth/adapter";

export interface HttpServerOptions {
  port?: number;
  host?: string;
  deps?: ServerDependencies;
  jwtVerifyOptions?: JwtVerifyOptions;
}

export function createStreamableHttpServer(options: HttpServerOptions = {}) {
  const port = options.port || Number(process.env.PORT) || 8080;
  const host = options.host || process.env.HOST || "0.0.0.0";
  const mcpServer = createCrcMcpServer(options.deps);
  const jwtVerifyOptions = options.jwtVerifyOptions || options.deps?.jwtVerifyOptions;

  const server = http.createServer(async (req, res) => {
    // 1. CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-user-id, x-api-key");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = req.url || "/";
    const resourceBaseUrl =
      process.env.MCP_RESOURCE_URL ||
      (host === "0.0.0.0" ? `http://localhost:${port}` : `http://${host}:${port}`);
    const authServerIssuer =
      process.env.SUPABASE_AUTH_ISSUER ||
      (process.env.NEXT_PUBLIC_SUPABASE_URL
        ? `${process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/+$/, "")}/auth/v1`
        : "https://auth.creatorretention.coach");

    // 2. Health check
    if (req.method === "GET" && (url === "/" || url === "/health")) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          status: "ok",
          service: "creator-retention-coach-mcp",
          version: "1.0.0",
          transport: "streamable-http",
          tools: [
            "preview_script_retention",
            "analyze_script_retention",
            "generate_viral_hooks",
            "improve_script_cta",
            "get_creator_action_plan",
            "check_user_credits",
          ],
        })
      );
      return;
    }

    // 3. RFC 9728 Protected Resource Metadata Discovery
    if (req.method === "GET" && (url === "/.well-known/oauth-protected-resource" || url.startsWith("/.well-known/oauth-protected-resource"))) {
      res.writeHead(200, {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=3600",
      });
      res.end(
        JSON.stringify({
          resource: resourceBaseUrl,
          authorization_servers: [authServerIssuer],
          scopes_supported: ["retention:analyze", "user:credits"],
          bearer_methods_supported: ["header"],
        })
      );
      return;
    }

    // 4. OpenAI / ChatGPT Domain Verification Challenge
    if (req.method === "GET" && (url === "/.well-known/openai-apps-challenge" || url.startsWith("/.well-known/openai-apps-challenge"))) {
      const challengeToken = process.env.OPENAI_APPS_CHALLENGE_TOKEN || "crc_openai_apps_challenge_verified_token";
      res.writeHead(200, {
        "Content-Type": "text/plain",
        "Cache-Control": "no-cache",
      });
      res.end(challengeToken);
      return;
    }

    // 5. Streamable HTTP JSON-RPC endpoint (POST /mcp, /rpc, or /)
    if (req.method === "POST") {
      let body = "";
      req.on("data", (chunk) => {
        body += chunk;
      });

      req.on("end", async () => {
        try {
          const authResolution = await resolveMcpAuthContext(req.headers, jwtVerifyOptions);
          const jsonRpc = JSON.parse(body || "{}");
          const { id, method, params } = jsonRpc;

          if (!method) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({
                jsonrpc: "2.0",
                id: id || null,
                error: { code: -32600, message: "Invalid Request: missing method" },
              })
            );
            return;
          }

          // Handle MCP JSON-RPC protocol methods
          let result: any = null;

          if (method === "initialize") {
            result = {
              protocolVersion: "2024-11-05",
              capabilities: {
                tools: { listChanged: false },
              },
              serverInfo: {
                name: "creator-retention-coach",
                version: "1.0.0",
              },
            };
          } else if (method === "notifications/initialized") {
            result = {};
          } else if (method === "ping") {
            result = {};
          } else if (method === "tools/list") {
            result = {
              tools: [
                {
                  name: "preview_script_retention",
                  description:
                    "Lightweight script retention preview. Evaluates hooks, pacing, structure, and retention drop-offs without consuming credits or creating database records.",
                  readOnlyHint: true,
                  destructiveHint: false,
                  openWorldHint: false,
                  idempotentHint: true,
                  authRequired: false,
                  securitySchemes: [{ type: "noauth" }],
                  inputSchema: {
                    type: "object",
                    properties: {
                      script: { type: "string", description: "The video script text to analyze (minimum 50 characters)" },
                      platform: {
                        type: "string",
                        enum: ["youtube_longform", "youtube_shorts", "reels", "tiktok", "linkedin_video", "x_video", "podcast"],
                        description: "The target publishing platform",
                      },
                      language: {
                        type: "string",
                        enum: ["en", "es", "fr", "de", "hi"],
                        description: "Optional ISO language code (auto-detected if omitted)",
                      },
                    },
                    required: ["script", "platform"],
                  },
                },
                {
                  name: "analyze_script_retention",
                  description:
                    "Full Creator Retention Coach analysis. Generates 7 retention metric scores, second-by-second drop-off curve, drop-off risks with diagnostic explanations, and targeted rewrites. Requires authenticated user with available credits.",
                  readOnlyHint: false,
                  destructiveHint: false,
                  openWorldHint: true,
                  idempotentHint: true,
                  authRequired: true,
                  securitySchemes: [{ type: "oauth2", scopes: ["retention:analyze"] }],
                  inputSchema: {
                    type: "object",
                    properties: {
                      script: { type: "string", description: "The video script text to analyze (minimum 50 characters)" },
                      platform: {
                        type: "string",
                        enum: ["youtube_longform", "youtube_shorts", "reels", "tiktok", "linkedin_video", "x_video", "podcast"],
                        description: "The target publishing platform",
                      },
                      language: {
                        type: "string",
                        enum: ["en", "es", "fr", "de", "hi"],
                        description: "Optional ISO language code (auto-detected if omitted)",
                      },
                    },
                    required: ["script", "platform"],
                  },
                },
                {
                  name: "generate_viral_hooks",
                  description:
                    "Generates 3 high-retention opening hook variations (Curiosity, Contrarian, and Direct) tailored to the script and platform cadence using CRC Copilot.",
                  readOnlyHint: true,
                  destructiveHint: false,
                  openWorldHint: true,
                  idempotentHint: false,
                  authRequired: false,
                  securitySchemes: [{ type: "noauth" }],
                  inputSchema: {
                    type: "object",
                    properties: {
                      script: { type: "string", description: "The video script text (minimum 50 characters)" },
                      platform: {
                        type: "string",
                        enum: ["youtube_longform", "youtube_shorts", "reels", "tiktok", "linkedin_video", "x_video", "podcast"],
                        description: "The target publishing platform",
                      },
                      language: {
                        type: "string",
                        enum: ["en", "es", "fr", "de", "hi"],
                        description: "Optional ISO language code (auto-detected if omitted)",
                      },
                    },
                    required: ["script", "platform"],
                  },
                },
                {
                  name: "improve_script_cta",
                  description:
                    "Replaces weak or generic call-to-actions with a seamless, high-converting conclusion using CRC Copilot.",
                  readOnlyHint: true,
                  destructiveHint: false,
                  openWorldHint: true,
                  idempotentHint: false,
                  authRequired: false,
                  securitySchemes: [{ type: "noauth" }],
                  inputSchema: {
                    type: "object",
                    properties: {
                      script: { type: "string", description: "The video script text (minimum 50 characters)" },
                      platform: {
                        type: "string",
                        enum: ["youtube_longform", "youtube_shorts", "reels", "tiktok", "linkedin_video", "x_video", "podcast"],
                        description: "The target publishing platform",
                      },
                      language: {
                        type: "string",
                        enum: ["en", "es", "fr", "de", "hi"],
                        description: "Optional ISO language code (auto-detected if omitted)",
                      },
                    },
                    required: ["script", "platform"],
                  },
                },
                {
                  name: "get_creator_action_plan",
                  description:
                    "Generates a deterministic, prioritized 3-tier creator action plan (Immediate Critical Fixes, Quick Wins, and Long-Term Improvements) based on retention diagnostics.",
                  readOnlyHint: true,
                  destructiveHint: false,
                  openWorldHint: false,
                  idempotentHint: true,
                  authRequired: false,
                  securitySchemes: [{ type: "noauth" }],
                  inputSchema: {
                    type: "object",
                    properties: {
                      script: { type: "string", description: "The video script text (minimum 50 characters)" },
                      platform: {
                        type: "string",
                        enum: ["youtube_longform", "youtube_shorts", "reels", "tiktok", "linkedin_video", "x_video", "podcast"],
                        description: "The target publishing platform",
                      },
                      language: {
                        type: "string",
                        enum: ["en", "es", "fr", "de", "hi"],
                        description: "Optional ISO language code (auto-detected if omitted)",
                      },
                    },
                    required: ["script", "platform"],
                  },
                },
                {
                  name: "check_user_credits",
                  description:
                    "Checks the authenticated creator's available CRC credits and entitlement status (free daily credits, paid credits, and next reset window). Requires authenticated user identity.",
                  readOnlyHint: true,
                  destructiveHint: false,
                  openWorldHint: false,
                  idempotentHint: true,
                  authRequired: true,
                  securitySchemes: [{ type: "oauth2", scopes: ["user:credits"] }],
                  inputSchema: {
                    type: "object",
                    properties: {},
                  },
                },
              ],
            };
          } else if (method === "tools/call") {
            const toolName = params?.name;
            const toolArgs = params?.arguments || {};

            // HTTP 401 Challenge for Protected Tools when Unauthenticated
            const isProtectedTool = toolName === "analyze_script_retention" || toolName === "check_user_credits";
            if (isProtectedTool && authResolution.isUnauthenticated) {
              const metadataUrl = `${resourceBaseUrl}/.well-known/oauth-protected-resource`;
              const authChallenge = `Bearer realm="mcp", resource_metadata="${metadataUrl}"`;
              res.writeHead(401, {
                "Content-Type": "application/json",
                "WWW-Authenticate": authChallenge,
              });
              res.end(
                JSON.stringify({
                  jsonrpc: "2.0",
                  id: id || null,
                  error: {
                    code: -32001,
                    message: authResolution.error || "Unauthorized: Valid OAuth 2.1 Bearer token required.",
                    _meta: {
                      "mcp/www_authenticate": [authChallenge],
                    },
                    data: {
                      _meta: {
                        "mcp/www_authenticate": [authChallenge],
                      },
                    },
                  },
                })
              );
              return;
            }

            const authContext = authResolution.authContext;

            // Dynamic execution through tool handlers
            if (toolName === "preview_script_retention") {
              const { handlePreviewScriptRetention } = await import("./tools/previewScriptRetention");
              result = await handlePreviewScriptRetention(toolArgs);
            } else if (toolName === "analyze_script_retention") {
              const { handleAnalyzeScriptRetention } = await import("./tools/analyzeScriptRetention");
              const { OpenAIProvider } = await import("../../infra/src/index");
              const { McpLedgerAdapter } = await import("./ledger/adapter");
              result = await handleAnalyzeScriptRetention(toolArgs, {
                aiProvider: options.deps?.aiProvider || new OpenAIProvider(),
                ledger: options.deps?.ledger || new McpLedgerAdapter(),
                repository: options.deps?.repository,
                authContext,
              });
            } else if (toolName === "generate_viral_hooks") {
              const { handleGenerateViralHooks } = await import("./tools/generateViralHooks");
              const { OpenAIProvider } = await import("../../infra/src/index");
              result = await handleGenerateViralHooks(toolArgs, {
                aiProvider: options.deps?.aiProvider || new OpenAIProvider(),
              });
            } else if (toolName === "improve_script_cta") {
              const { handleImproveScriptCta } = await import("./tools/improveScriptCta");
              const { OpenAIProvider } = await import("../../infra/src/index");
              result = await handleImproveScriptCta(toolArgs, {
                aiProvider: options.deps?.aiProvider || new OpenAIProvider(),
              });
            } else if (toolName === "get_creator_action_plan") {
              const { handleGetCreatorActionPlan } = await import("./tools/getCreatorActionPlan");
              result = await handleGetCreatorActionPlan(toolArgs);
            } else if (toolName === "check_user_credits") {
              const { handleCheckUserCredits } = await import("./tools/checkUserCredits");
              const { McpLedgerAdapter } = await import("./ledger/adapter");
              result = await handleCheckUserCredits(toolArgs, {
                ledger: options.deps?.ledger || new McpLedgerAdapter(),
                authContext,
              });
            } else {
              res.writeHead(404, { "Content-Type": "application/json" });
              res.end(
                JSON.stringify({
                  jsonrpc: "2.0",
                  id,
                  error: { code: -32601, message: `Tool not found: ${toolName}` },
                })
              );
              return;
            }
          } else {
            res.writeHead(404, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({
                jsonrpc: "2.0",
                id,
                error: { code: -32601, message: `Method not found: ${method}` },
              })
            );
            return;
          }

          // Return JSON-RPC response with Streamable HTTP headers
          res.writeHead(200, {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache",
          });
          res.end(
            JSON.stringify({
              jsonrpc: "2.0",
              id: id !== undefined ? id : null,
              result,
            })
          );
        } catch (err: any) {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              jsonrpc: "2.0",
              id: null,
              error: { code: -32603, message: err?.message || "Internal server error" },
            })
          );
        }
      });
      return;
    }

    // 6. Default 404 for unhandled paths
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not Found" }));
  });

  return {
    server,
    start: () =>
      new Promise<void>((resolve) => {
        server.listen(port, host, () => {
          console.log(`[CRC MCP Server] Streamable HTTP listening on http://${host}:${port}`);
          resolve();
        });
      }),
    stop: () =>
      new Promise<void>((resolve, reject) => {
        if (typeof (server as any).closeAllConnections === "function") {
          (server as any).closeAllConnections();
        }
        server.close((err) => (err ? reject(err) : resolve()));
      }),
  };
}
