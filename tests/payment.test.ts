import assert from "node:assert/strict";
import test from "node:test";
import { createEntitlementToken, verifyEntitlementToken, verifyRazorpaySignature } from "../ui/lib/payment";
import { createHmac } from "node:crypto";

const SECRET = "test-payment-secret";

function signature(orderId: string, paymentId: string): string {
  return createHmac("sha256", SECRET).update(`${orderId}|${paymentId}`).digest("base64url");
}

test("accepts a valid Razorpay payment signature", () => {
  assert.equal(verifyRazorpaySignature("order_123", "pay_123", signature("order_123", "pay_123"), SECRET), true);
});

test("rejects a tampered Razorpay payment signature", () => {
  assert.equal(verifyRazorpaySignature("order_123", "pay_attacker", signature("order_123", "pay_123"), SECRET), false);
});

test("creates and verifies a signed paid entitlement", () => {
  const now = Date.parse("2026-09-13T00:00:00Z");
  const token = createEntitlementToken(SECRET, now);
  assert.equal(verifyEntitlementToken(token, SECRET, now), true);
});

test("rejects a tampered or expired entitlement", () => {
  const now = Date.parse("2026-09-13T00:00:00Z");
  const token = createEntitlementToken(SECRET, now);
  assert.equal(verifyEntitlementToken(`${token}tampered`, SECRET, now), false);
  assert.equal(verifyEntitlementToken(token, SECRET, now + 31 * 24 * 60 * 60 * 1000), false);
});
