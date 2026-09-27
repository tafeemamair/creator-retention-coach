import crypto from "crypto";

export interface EntitlementPayload {
  orderId: string;
  paymentId: string;
  plan?: string;
  creditsRemaining?: number;
  totalCredits?: number;
  issueTime: number;
  expiryTime: number;
  version: number;
}

export interface AnonymousPayload {
  anonId: string;
  created: number;
  version: number;
}

export function getCookieSecret(): string {
  const secret = process.env.COOKIE_SECRET?.trim();
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "COOKIE_SECRET environment variable is missing in production. Application refusing to sign or verify tokens."
      );
    }
    return "crc_default_dev_secret_key_change_in_production_32b";
  }
  if (process.env.NODE_ENV === "production" && secret.length < 16) {
    throw new Error(
      "COOKIE_SECRET must be at least 16 characters in production."
    );
  }
  return secret;
}

/**
 * Signs a payload using HMAC-SHA256 and returns a serialized base64 string + signature.
 */
export function signPayload<T extends object>(payload: T): string {
  const secret = getCookieSecret();
  const serialized = Buffer.from(JSON.stringify(payload)).toString("base64");
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(serialized);
  const signature = hmac.digest("hex");
  return `${serialized}.${signature}`;
}

/**
 * Verifies a signed cookie value using HMAC-SHA256 and returns the parsed payload.
 */
export function verifySignedPayload<T extends object>(cookieValue: string | undefined): T | null {
  if (!cookieValue) return null;
  const parts = cookieValue.split(".");
  if (parts.length !== 2) return null;

  const [serialized, signature] = parts;
  const secret = getCookieSecret();

  try {
    const hmac = crypto.createHmac("sha256", secret);
    hmac.update(serialized);
    const expectedSignature = hmac.digest("hex");

    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (signatureBuffer.length !== expectedBuffer.length) {
      return null;
    }

    if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
      return null;
    }

    const json = Buffer.from(serialized, "base64").toString("utf-8");
    return JSON.parse(json) as T;
  } catch (err) {
    console.warn("Payload verification error:", err);
    return null;
  }
}

/**
 * Validates paid entitlement cookie.
 */
export function verifyEntitlement(cookieValue: string | undefined): EntitlementPayload | null {
  const payload = verifySignedPayload<EntitlementPayload>(cookieValue);
  if (!payload) return null;

  if (!payload.orderId || !payload.paymentId || !payload.issueTime || !payload.expiryTime) {
    return null;
  }

  if (payload.version !== 1) {
    return null;
  }

  if (Date.now() > payload.expiryTime) {
    return null;
  }

  return payload;
}

/**
 * Validates or creates a secure anonymous user ID token.
 */
export function verifyAnonymousToken(cookieValue: string | undefined): AnonymousPayload | null {
  const payload = verifySignedPayload<AnonymousPayload>(cookieValue);
  if (!payload || !payload.anonId || payload.version !== 1) {
    return null;
  }
  return payload;
}

/**
 * Issues a new signed anonymous token payload.
 */
export function createAnonymousToken(): { anonId: string; signedCookie: string } {
  const anonId = `anon_${crypto.randomUUID()}`;
  const payload: AnonymousPayload = {
    anonId,
    created: Date.now(),
    version: 1,
  };
  const signedCookie = signPayload(payload);
  return { anonId, signedCookie };
}
