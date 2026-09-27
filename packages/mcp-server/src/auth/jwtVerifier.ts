import crypto from "node:crypto";

export interface JsonWebKeyItem {
  kty: string;
  kid?: string;
  use?: string;
  alg?: string;
  n?: string;
  e?: string;
  crv?: string;
  x?: string;
  y?: string;
  [key: string]: any;
}

export interface JwksResponse {
  keys: JsonWebKeyItem[];
}

export interface JwtVerifyOptions {
  jwksUri?: string;
  jwtSecret?: string;
  expectedIssuer?: string;
  expectedAudience?: string;
  allowedAlgorithms?: string[];
  clockSkewSeconds?: number;
  customJwks?: JwksResponse;
}

export interface JwtClaims {
  sub: string;
  user_id?: string;
  email?: string;
  role?: string;
  iss?: string;
  aud?: string | string[];
  exp?: number;
  nbf?: number;
  iat?: number;
  scopes?: string[];
  [key: string]: any;
}

export interface VerifiedJwtResult {
  valid: boolean;
  error?: string;
  claims?: JwtClaims;
}

// In-memory JWKS Cache with TTL
interface CachedJwks {
  jwks: JwksResponse;
  expiresAt: number;
}

const jwksCache = new Map<string, CachedJwks>();
const JWKS_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export function clearJwksCache(): void {
  jwksCache.clear();
}

export async function fetchJwks(jwksUri: string, forceRefresh = false): Promise<JwksResponse> {
  const now = Date.now();
  if (!forceRefresh && jwksCache.has(jwksUri)) {
    const cached = jwksCache.get(jwksUri)!;
    if (now < cached.expiresAt) {
      return cached.jwks;
    }
  }

  const response = await fetch(jwksUri, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch JWKS from ${jwksUri}: HTTP ${response.status}`);
  }

  const jwks = (await response.json()) as JwksResponse;
  if (!jwks || !Array.isArray(jwks.keys)) {
    throw new Error(`Invalid JWKS response structure from ${jwksUri}`);
  }

  jwksCache.set(jwksUri, {
    jwks,
    expiresAt: now + JWKS_CACHE_TTL_MS,
  });

  return jwks;
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4 !== 0) {
    base64 += "=";
  }
  return Buffer.from(base64, "base64").toString("utf-8");
}

export async function verifyJwt(
  token: string,
  options: JwtVerifyOptions = {}
): Promise<VerifiedJwtResult> {
  if (!token || typeof token !== "string") {
    return { valid: false, error: "Missing or invalid token string." };
  }

  const parts = token.trim().split(".");
  if (parts.length !== 3) {
    return { valid: false, error: "Malformed JWT: expected 3 dot-separated parts." };
  }

  const [rawHeader, rawPayload, signature] = parts;

  let header: { alg?: string; kid?: string; typ?: string };
  let payload: Record<string, any>;

  try {
    header = JSON.parse(base64UrlDecode(rawHeader));
    payload = JSON.parse(base64UrlDecode(rawPayload));
  } catch (err: any) {
    return { valid: false, error: `Malformed JWT JSON: ${err?.message || "parse error"}` };
  }

  const alg = header.alg || "RS256";
  const allowedAlgs = options.allowedAlgorithms || ["RS256", "ES256", "HS256"];

  if (!allowedAlgs.includes(alg)) {
    return { valid: false, error: `Disallowed JWT algorithm: ${alg}. Expected one of: ${allowedAlgs.join(", ")}` };
  }

  const signedContent = `${rawHeader}.${rawPayload}`;
  let signatureVerified = false;

  // 1. Asymmetric Verification (RS256 / ES256 via JWKS)
  if (alg === "RS256" || alg === "ES256") {
    let jwks: JwksResponse | null = options.customJwks || null;

    if (!jwks && options.jwksUri) {
      try {
        jwks = await fetchJwks(options.jwksUri, false);
      } catch (err: any) {
        return { valid: false, error: `JWKS retrieval failure: ${err?.message}` };
      }
    }

    if (!jwks || !Array.isArray(jwks.keys)) {
      return { valid: false, error: "No JWKS available for asymmetric signature verification." };
    }

    let matchingKey = header.kid ? jwks.keys.find((k) => k.kid === header.kid) : jwks.keys[0];

    // If kid not found and jwksUri configured, try one force-refresh for key rotation
    if (!matchingKey && options.jwksUri && !options.customJwks) {
      try {
        jwks = await fetchJwks(options.jwksUri, true);
        matchingKey = header.kid ? jwks.keys.find((k) => k.kid === header.kid) : jwks.keys[0];
      } catch {
        // Ignored, will fail below
      }
    }

    if (!matchingKey) {
      return { valid: false, error: `No matching JWK found for kid: ${header.kid || "default"}` };
    }

    try {
      const publicKey = crypto.createPublicKey({
        key: matchingKey as any,
        format: "jwk",
      });

      if (alg === "ES256") {
        // JOSE/RFC 7515 specifies ECDSA signatures as IEEE-P1363 (concatenated r || s)
        try {
          signatureVerified = crypto.verify(
            "SHA256",
            Buffer.from(signedContent),
            { key: publicKey, dsaEncoding: "ieee-p1363" },
            Buffer.from(signature, "base64url")
          );
        } catch {
          // Fallback to standard DER verification in case a non-standard producer signed in DER format
          signatureVerified = crypto.verify(
            "SHA256",
            Buffer.from(signedContent),
            publicKey,
            Buffer.from(signature, "base64url")
          );
        }
      } else if (alg === "RS256") {
        signatureVerified = crypto.verify(
          "RSA-SHA256",
          Buffer.from(signedContent),
          publicKey,
          Buffer.from(signature, "base64url")
        );
      }
    } catch (err: any) {
      return { valid: false, error: `Asymmetric signature verification error: ${err?.message}` };
    }
  }

  // 2. Symmetric Verification (HS256 via Secret)
  else if (alg === "HS256") {
    const secret = options.jwtSecret || process.env.SUPABASE_JWT_SECRET;
    if (!secret) {
      return { valid: false, error: "HS256 token verification requires configured JWT secret." };
    }

    try {
      const hmac = crypto.createHmac("sha256", secret);
      hmac.update(signedContent);
      const expectedSignature = hmac.digest("base64url");

      if (signature.length === expectedSignature.length && crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
        signatureVerified = true;
      }
    } catch (err: any) {
      return { valid: false, error: `HMAC verification error: ${err?.message}` };
    }
  }

  if (!signatureVerified) {
    return { valid: false, error: "Invalid JWT cryptographic signature." };
  }

  // 3. Claims Validation
  const now = Math.floor(Date.now() / 1000);
  const skew = options.clockSkewSeconds ?? 60; // 60-second skew tolerance

  // Expiration Check
  if (typeof payload.exp === "number") {
    if (payload.exp + skew < now) {
      return { valid: false, error: `Token expired at ${payload.exp}, current time is ${now}.` };
    }
  }

  // Not-Before Check
  if (typeof payload.nbf === "number") {
    if (payload.nbf - skew > now) {
      return { valid: false, error: `Token not valid before ${payload.nbf}, current time is ${now}.` };
    }
  }

  // Issuer Check
  const expectedIssuer = options.expectedIssuer || process.env.SUPABASE_AUTH_ISSUER;
  if (expectedIssuer && payload.iss) {
    const normPayloadIss = payload.iss.replace(/\/+$/, "");
    const normExpectedIss = expectedIssuer.replace(/\/+$/, "");
    if (normPayloadIss !== normExpectedIss) {
      return { valid: false, error: `Issuer mismatch: expected ${normExpectedIss}, received ${normPayloadIss}.` };
    }
  }

  // Audience / Resource Check
  const expectedAud = options.expectedAudience || process.env.MCP_RESOURCE_URL || process.env.MCP_AUDIENCE;
  if (expectedAud && (payload.aud || payload.resource)) {
    const tokenAuds: string[] = Array.isArray(payload.aud)
      ? payload.aud
      : typeof payload.aud === "string"
      ? [payload.aud]
      : [];
    if (typeof payload.resource === "string") {
      tokenAuds.push(payload.resource);
    }

    const matchesAud = tokenAuds.some((a) => a.replace(/\/+$/, "") === expectedAud.replace(/\/+$/, ""));
    if (tokenAuds.length > 0 && !matchesAud) {
      return { valid: false, error: `Audience mismatch: expected ${expectedAud}, received [${tokenAuds.join(", ")}].` };
    }
  }

  // Extract Scopes & Capabilities from all supported OAuth/Supabase locations
  const scopesSet = new Set<string>();

  // 1. scope (OAuth 2.0 space-delimited string or array)
  if (typeof payload.scope === "string") {
    payload.scope.split(" ").filter(Boolean).forEach((s: string) => scopesSet.add(s));
  } else if (Array.isArray(payload.scope)) {
    payload.scope.forEach((s: any) => typeof s === "string" && scopesSet.add(s));
  }

  // 2. scopes (array or space-delimited string)
  if (Array.isArray(payload.scopes)) {
    payload.scopes.forEach((s: any) => typeof s === "string" && scopesSet.add(s));
  } else if (typeof payload.scopes === "string") {
    payload.scopes.split(" ").filter(Boolean).forEach((s: string) => scopesSet.add(s));
  }

  // 3. permissions (array)
  if (Array.isArray(payload.permissions)) {
    payload.permissions.forEach((s: any) => typeof s === "string" && scopesSet.add(s));
  }

  // 4. crc_scopes (Custom Access Token Hook claim)
  if (Array.isArray(payload.crc_scopes)) {
    payload.crc_scopes.forEach((s: any) => typeof s === "string" && scopesSet.add(s));
  } else if (typeof payload.crc_scopes === "string") {
    payload.crc_scopes.split(" ").filter(Boolean).forEach((s: string) => scopesSet.add(s));
  }

  // 5. app_metadata.scopes or app_metadata.scope
  if (payload.app_metadata && typeof payload.app_metadata === "object") {
    if (Array.isArray(payload.app_metadata.scopes)) {
      payload.app_metadata.scopes.forEach((s: any) => typeof s === "string" && scopesSet.add(s));
    } else if (typeof payload.app_metadata.scopes === "string") {
      payload.app_metadata.scopes.split(" ").filter(Boolean).forEach((s: string) => scopesSet.add(s));
    }
    if (typeof payload.app_metadata.scope === "string") {
      payload.app_metadata.scope.split(" ").filter(Boolean).forEach((s: string) => scopesSet.add(s));
    }
  }

  const extractedScopes = Array.from(scopesSet);
  const role = payload.role || payload.app_metadata?.role;

  // Extract User Subject
  const sub = payload.sub || payload.user_id || payload.userId;
  if (!sub || typeof sub !== "string") {
    return { valid: false, error: "JWT payload missing valid subject ('sub') claim." };
  }

  return {
    valid: true,
    claims: {
      sub,
      user_id: payload.user_id,
      email: payload.email,
      role,
      iss: payload.iss,
      aud: payload.aud,
      exp: payload.exp,
      nbf: payload.nbf,
      iat: payload.iat,
      scopes: extractedScopes,
      ...payload,
    },
  };
}
