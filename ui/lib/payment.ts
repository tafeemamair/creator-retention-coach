import { createHmac, timingSafeEqual } from "node:crypto";

export const ENTITLEMENT_COOKIE = "retention_entitlement";
export const ENTITLEMENT_TTL_SECONDS = 60 * 60 * 24 * 30;
export const RETENTION_ANALYSIS_AMOUNT = 4900;
export const RETENTION_ANALYSIS_CURRENCY = "INR";

function encode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string,
  secret: string,
): boolean {
  if (!orderId || !paymentId || !signature || !secret) return false;
  const expected = sign(`${orderId}|${paymentId}`, secret);
  const actual = Buffer.from(signature, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");
  return actual.length === expectedBuffer.length && timingSafeEqual(actual, expectedBuffer);
}

export function createEntitlementToken(secret: string, now = Date.now()): string {
  if (!secret) throw new Error("PAYMENT_SESSION_SECRET is missing.");
  const payload = JSON.stringify({ paid: true, exp: Math.floor(now / 1000) + ENTITLEMENT_TTL_SECONDS });
  const encoded = encode(payload);
  return `${encoded}.${sign(encoded, secret)}`;
}

export function verifyEntitlementToken(token: string | undefined, secret: string, now = Date.now()): boolean {
  if (!token || !secret) return false;
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return false;

  const expected = sign(encoded, secret);
  const actualBuffer = Buffer.from(signature, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) {
    return false;
  }

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as {
      paid?: boolean;
      exp?: number;
    };
    return payload.paid === true && typeof payload.exp === "number" && payload.exp > Math.floor(now / 1000);
  } catch {
    return false;
  }
}
