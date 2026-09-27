import type { AuthContext } from "../../../core/src/index";

export interface McpAuthHeaders {
  authorization?: string;
  "x-user-id"?: string;
  "x-api-key"?: string;
}

export interface AuthResolutionResult {
  authenticated: boolean;
  context: AuthContext;
  error?: string;
}
