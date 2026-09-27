import { z } from "zod";
import type { LedgerRepository, AuthContext } from "../../../core/src/index";

/**
 * Public schema for check_user_credits.
 * Caller cannot pass arbitrary userId; identity is bound strictly to the authenticated context.
 */
export const checkUserCreditsSchema = {};

export async function handleCheckUserCredits(
  _args: Record<string, unknown>,
  deps: { ledger?: LedgerRepository; authContext?: AuthContext }
) {
  // 1. Strict authentication & scope check: Rejects missing or anonymous identity
  if (!deps.authContext?.userId || deps.authContext.userId === "mcp_anonymous_user") {
    return {
      isError: true,
      content: [{ type: "text" as const, text: "Authentication required: You must be authenticated to check your creator credits." }],
    };
  }

  const scopes: string[] = (deps.authContext as any)?.scopes || [];
  const hasCustomCrcScopes = scopes.some((s) => s.startsWith("retention:") || s.startsWith("user:") || s.startsWith("crc:"));
  if (hasCustomCrcScopes && !scopes.includes("user:credits") && !scopes.includes("*")) {
    return {
      isError: true,
      content: [{ type: "text" as const, text: "Forbidden: Missing required OAuth scope 'user:credits'." }],
      _meta: {
        "mcp/www_authenticate": [
          `Bearer realm="mcp", error="insufficient_scope", error_description="The access token does not contain required scope 'user:credits'", scope="user:credits"`,
        ],
      },
    };
  }

  const authenticatedUserId = deps.authContext.userId;

  if (deps.ledger?.getEntitlement) {
    try {
      const entitlement = await deps.ledger.getEntitlement(authenticatedUserId);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(entitlement, null, 2) }],
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: "text" as const, text: `Ledger Error: ${err?.message || "Failed to retrieve entitlement."}` }],
      };
    }
  }

  return {
    isError: true,
    content: [{ type: "text" as const, text: "Ledger infrastructure unavailable." }],
  };
}
