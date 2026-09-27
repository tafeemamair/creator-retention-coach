import type { AuthContext } from "../../../core/src/index";
import { verifyJwt, type JwtVerifyOptions, type VerifiedJwtResult } from "./jwtVerifier";

export interface McpAuthContext extends AuthContext {
  scopes?: string[];
  role?: string;
}

export interface McpAuthResolution {
  authContext: McpAuthContext;
  isUnauthenticated: boolean;
  error?: string;
  verifiedResult?: VerifiedJwtResult;
}

/**
 * Translates incoming MCP / Streamable HTTP request headers into the verified CRC McpAuthContext.
 * Cryptographically verifies OAuth 2.1 Bearer tokens against JWKS/secret.
 * Rejects arbitrary spoofing; does NOT alter Supabase SSR or website cookies.
 */
export async function resolveMcpAuthContext(
  headers?: Record<string, string | string[] | undefined>,
  options?: JwtVerifyOptions
): Promise<McpAuthResolution> {
  const authHeader = typeof headers?.authorization === "string" ? headers.authorization.trim() : "";
  const apiKeyHeader = typeof headers?.["x-api-key"] === "string" ? headers["x-api-key"].trim() : "";
  const userIdHeader = typeof headers?.["x-user-id"] === "string" ? headers["x-user-id"].trim() : "";

  // 1. Cryptographic Bearer Token Verification (OAuth 2.1)
  if (authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    if (token) {
      const result = await verifyJwt(token, options);
      if (result.valid && result.claims) {
        return {
          authContext: {
            userId: result.claims.sub,
            email: result.claims.email,
            authType: "oauth_token",
            scopes: result.claims.scopes,
            role: result.claims.role,
          },
          isUnauthenticated: false,
          verifiedResult: result,
        };
      }

      return {
        authContext: {
          userId: "mcp_anonymous_user",
          authType: "api_key",
        },
        isUnauthenticated: true,
        error: result.error || "Invalid Bearer token.",
        verifiedResult: result,
      };
    }
  }

  // 2. Gateway header (Allowed only in explicit test/gateway environment)
  const isDevOrTest = process.env.NODE_ENV !== "production";
  if (isDevOrTest) {
    if (apiKeyHeader) {
      return {
        authContext: {
          userId: apiKeyHeader,
          authType: "api_key",
        },
        isUnauthenticated: false,
      };
    }

    if (userIdHeader) {
      return {
        authContext: {
          userId: userIdHeader,
          authType: "api_key",
        },
        isUnauthenticated: false,
      };
    }
  }

  // 3. Default unauthenticated / anonymous context (usable for preview/copilot tools only)
  return {
    authContext: {
      userId: "mcp_anonymous_user",
      authType: "api_key",
    },
    isUnauthenticated: true,
  };
}

export * from "./jwtVerifier";
