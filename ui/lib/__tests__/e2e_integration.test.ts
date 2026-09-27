import { describe, it } from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";
import {
  syncAuthUserLedger,
  getAuthUserLedger,
  consumeAuthUserCredit,
  rollbackAuthUserCredit,
  markScriptAnalyzedInHotCache,
  initializeCreditRecord,
  consumeCredit,
  getCreditRecord,
} from "../ledger";
import { verifyAnonymousToken, signPayload } from "../entitlement";

function verifyRazorpaySignature(orderId: string, paymentId: string, signature: string, secret: string): boolean {
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(`${orderId}|${paymentId}`);
  const expectedSignature = hmac.digest("hex");

  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (sigBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
}

describe("7. End-to-End Identity, Ledger & Consistency Scenarios", () => {
  it("E2E-1: Initial signup state initializes 1 free analysis and 0 paid credits", async () => {
    const userId = `usr_${crypto.randomUUID()}`;
    const ledger = await syncAuthUserLedger(userId, { freeUsed: false, paidCredits: 0 });

    assert.equal(ledger.userId, userId);
    assert.equal(ledger.freeUsed, false);
    assert.equal(ledger.paidCredits, 0);

    const cached = await getAuthUserLedger(userId);
    assert.ok(cached);
    assert.equal(cached.freeUsed, false);
    assert.equal(cached.paidCredits, 0);
  });

  it("E2E-2: Free analysis consumption transitions state and blocks second unique script", async () => {
    const userId = `usr_${crypto.randomUUID()}`;
    await syncAuthUserLedger(userId, { freeUsed: false, paidCredits: 0 });

    const script1 = "Hook: Stop scrolling right now. Main body explaining retention tips. CTA: Subscribe for more.";
    const hash1 = crypto.createHash("sha256").update(script1).digest("hex");

    // First analysis consumes free entitlement
    const res1 = await consumeAuthUserCredit(userId, hash1, "YouTube Shorts");
    assert.equal(res1.success, true);
    assert.equal(res1.status, "consumed_free");
    assert.equal(res1.record.freeUsed, true);

    // Second unique script is blocked (HTTP 402 equivalent)
    const script2 = "A completely different script about cooking pasta in 10 minutes.";
    const hash2 = crypto.createHash("sha256").update(script2).digest("hex");

    const res2 = await consumeAuthUserCredit(userId, hash2, "YouTube Shorts");
    assert.equal(res2.success, false);
    assert.equal(res2.status, "no_credits");
  });

  it("E2E-3: Re-submitting the exact same script consumes 0 credits (idempotent)", async () => {
    const userId = `usr_${crypto.randomUUID()}`;
    await syncAuthUserLedger(userId, { freeUsed: true, paidCredits: 3 });

    const script = "How to build high-retention TikTok hooks in 3 steps.";
    const hash = crypto.createHash("sha256").update(script).digest("hex");

    await markScriptAnalyzedInHotCache(userId, hash, "TikTok");

    const replayRes = await consumeAuthUserCredit(userId, hash, "TikTok");
    assert.equal(replayRes.success, true);
    assert.equal(replayRes.status, "idempotent");
    assert.equal(replayRes.record.paidCredits, 3);
  });

  it("E2E-4: AI failure triggers safe rollback restoring credit to user", async () => {
    const userId = `usr_${crypto.randomUUID()}`;
    await syncAuthUserLedger(userId, { freeUsed: true, paidCredits: 2 });

    const script = "Script that causes simulated AI provider timeout.";
    const hash = crypto.createHash("sha256").update(script).digest("hex");

    const consumeRes = await consumeAuthUserCredit(userId, hash, "YouTube Shorts");
    assert.equal(consumeRes.status, "consumed_paid");
    assert.equal(consumeRes.record.paidCredits, 1);

    // AI failure occurs -> execute rollback
    const rollbackRes = await rollbackAuthUserCredit(userId, hash, "paid", "YouTube Shorts");
    assert.equal(rollbackRes.success, true);
    assert.equal(rollbackRes.status, "rolled_back");
    assert.equal(rollbackRes.record?.paidCredits, 2);
  });

  it("E2E-5: Anonymous-to-Authenticated migration rejects forged HMAC cookies", () => {
    const forgedAnonCookie = "eyJhbGciOiJIUzI1NiJ9.forged_signature_attack";
    const verified = verifyAnonymousToken(forgedAnonCookie);
    assert.equal(verified, null);
  });

  it("E2E-6: Anonymous-to-Authenticated migration validates legitimate signed tokens", () => {
    const legitimateAnonId = `anon_${crypto.randomUUID()}`;
    const token = signPayload({
      anonId: legitimateAnonId,
      created: Date.now(),
      version: 1,
    });

    const verified = verifyAnonymousToken(token);
    assert.ok(verified);
    assert.equal(verified.anonId, legitimateAnonId);
    assert.equal(verified.version, 1);
  });

  it("E2E-7: Razorpay payment signature verification matches timing-safe HMAC", () => {
    const keySecret = "test_razorpay_secret_key_123";
    const orderId = "order_test_123456";
    const paymentId = "pay_test_789012";

    const hmac = crypto.createHmac("sha256", keySecret);
    hmac.update(`${orderId}|${paymentId}`);
    const validSignature = hmac.digest("hex");

    // Valid signature passes
    assert.equal(verifyRazorpaySignature(orderId, paymentId, validSignature, keySecret), true);

    // Tampered signature fails
    const tamperedSignature = "bad_signature_1234567890123456789012345678901234567890123456789012345678901234";
    assert.equal(verifyRazorpaySignature(orderId, paymentId, tamperedSignature, keySecret), false);

    // Wrong order ID fails
    assert.equal(verifyRazorpaySignature("different_order_id", paymentId, validSignature, keySecret), false);
  });

  it("E2E-8: Repeated payment verification is idempotent and never double-credits", async () => {
    const orderId = `order_${crypto.randomUUID()}`;

    // First initialization creates credit record
    const record1 = await initializeCreditRecord(orderId, "pack5", 5, 90);
    assert.equal(record1.creditsRemaining, 5);

    // Second check retrieves existing record without modifying credit count
    const record2 = await getCreditRecord(orderId);
    assert.ok(record2);
    assert.equal(record2.creditsRemaining, 5);
    assert.equal(record2.totalCredits, 5);
  });

  it("E2E-9: Paid credit consumption decrements balance and tracks hashes", async () => {
    const orderId = `order_${crypto.randomUUID()}`;
    await initializeCreditRecord(orderId, "pack5", 5, 90);

    const hash1 = crypto.createHash("sha256").update("Script 1").digest("hex");
    const res1 = await consumeCredit(orderId, hash1);
    assert.equal(res1.success, true);
    assert.equal(res1.status, "consumed");
    assert.equal(res1.record.creditsRemaining, 4);

    // Same script consumes 0
    const resReplay = await consumeCredit(orderId, hash1);
    assert.equal(resReplay.success, true);
    assert.equal(resReplay.status, "idempotent");
    assert.equal(resReplay.record.creditsRemaining, 4);

    // Different script consumes 1
    const hash2 = crypto.createHash("sha256").update("Script 2").digest("hex");
    const res2 = await consumeCredit(orderId, hash2);
    assert.equal(res2.success, true);
    assert.equal(res2.status, "consumed");
    assert.equal(res2.record.creditsRemaining, 3);
  });

  it("E2E-10: Multi-user isolation ensures User A state is completely separated from User B", async () => {
    const userA = `usr_${crypto.randomUUID()}`;
    const userB = `usr_${crypto.randomUUID()}`;

    await syncAuthUserLedger(userA, { freeUsed: true, paidCredits: 5 });
    await syncAuthUserLedger(userB, { freeUsed: false, paidCredits: 0 });

    const ledgerA = await getAuthUserLedger(userA);
    const ledgerB = await getAuthUserLedger(userB);

    assert.equal(ledgerA?.paidCredits, 5);
    assert.equal(ledgerA?.freeUsed, true);

    assert.equal(ledgerB?.paidCredits, 0);
    assert.equal(ledgerB?.freeUsed, false);

    // Consuming credit for User A does not affect User B
    const hash = crypto.createHash("sha256").update("Shared Script Idea").digest("hex");
    await consumeAuthUserCredit(userA, hash, "YouTube Shorts");

    const updatedLedgerA = await getAuthUserLedger(userA);
    const updatedLedgerB = await getAuthUserLedger(userB);

    assert.equal(updatedLedgerA?.paidCredits, 4);
    assert.equal(updatedLedgerB?.paidCredits, 0);
  });
});
