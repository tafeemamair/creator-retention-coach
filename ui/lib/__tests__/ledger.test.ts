import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  consumeFreeEntitlement,
  rollbackFreeEntitlement,
  getFreeEntitlementRecord,
  initializeCreditRecord,
  consumeCredit,
  rollbackCredit,
  getCreditRecord,
} from "../ledger";
import {
  createAnonymousToken,
  verifyAnonymousToken,
} from "../entitlement";

describe("4. Free & Paid Entitlement Ledger", () => {
  it("grants 1 full free analysis for a new anonymous user", async () => {
    const anonId = `test_user_${Date.now()}_1`;
    const scriptHash1 = "hash_script_a";

    const result = await consumeFreeEntitlement(anonId, scriptHash1);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.status, "granted");
    assert.strictEqual(result.record.anonId, anonId);
  });

  it("blocks a second analysis with a different script for the same anonymous user", async () => {
    const anonId = `test_user_${Date.now()}_2`;
    const scriptHash1 = "hash_script_a";
    const scriptHash2 = "hash_script_b";

    // First attempt
    const firstResult = await consumeFreeEntitlement(anonId, scriptHash1);
    assert.strictEqual(firstResult.success, true);

    // Second attempt with different script
    const secondResult = await consumeFreeEntitlement(anonId, scriptHash2);
    assert.strictEqual(secondResult.success, false);
    assert.strictEqual(secondResult.status, "already_used");
  });

  it("permits free idempotent re-analysis of the exact same script", async () => {
    const anonId = `test_user_${Date.now()}_3`;
    const scriptHash1 = "hash_script_a";

    // First attempt
    await consumeFreeEntitlement(anonId, scriptHash1);

    // Re-analyzing same script
    const replayResult = await consumeFreeEntitlement(anonId, scriptHash1);
    assert.strictEqual(replayResult.success, true);
    assert.strictEqual(replayResult.status, "idempotent");
  });

  it("safely rolls back free entitlement if analysis generation fails", async () => {
    const anonId = `test_user_${Date.now()}_4`;
    const scriptHash = "hash_script_fail";

    // Grant free credit
    await consumeFreeEntitlement(anonId, scriptHash);

    // Rollback due to mock analysis error
    const rolledBack = await rollbackFreeEntitlement(anonId);
    assert.strictEqual(rolledBack, true);

    // User should now be eligible for free analysis again
    const recordAfter = await getFreeEntitlementRecord(anonId);
    assert.strictEqual(recordAfter, null);

    const retryResult = await consumeFreeEntitlement(anonId, scriptHash);
    assert.strictEqual(retryResult.success, true);
    assert.strictEqual(retryResult.status, "granted");
  });

  it("manages paid credits accurately with idempotency and deduction", async () => {
    const orderId = `order_test_${Date.now()}`;
    await initializeCreditRecord(orderId, "pack5", 5, 90);

    const initial = await getCreditRecord(orderId);
    assert.strictEqual(initial?.creditsRemaining, 5);

    // First analysis consumes 1 credit
    const consume1 = await consumeCredit(orderId, "script_1");
    assert.strictEqual(consume1.success, true);
    assert.strictEqual(consume1.status, "consumed");
    if (consume1.success) {
      assert.strictEqual(consume1.record.creditsRemaining, 4);
    }

    // Re-analyzing same script costs 0 credits (idempotent)
    const replay = await consumeCredit(orderId, "script_1");
    assert.strictEqual(replay.success, true);
    assert.strictEqual(replay.status, "idempotent");
    if (replay.success) {
      assert.strictEqual(replay.record.creditsRemaining, 4);
    }

    // Second unique script consumes 1 credit
    const consume2 = await consumeCredit(orderId, "script_2");
    assert.strictEqual(consume2.success, true);
    if (consume2.success) {
      assert.strictEqual(consume2.record.creditsRemaining, 3);
    }

    // Rollback restores 1 credit
    const rollback = await rollbackCredit(orderId, "script_2");
    assert.strictEqual(rollback.success, true);
    const afterRollback = await getCreditRecord(orderId);
    assert.strictEqual(afterRollback?.creditsRemaining, 4);
  });

  it("cryptographically verifies anonymous tokens and rejects tampered cookies", () => {
    const { anonId, signedCookie } = createAnonymousToken();
    assert.ok(anonId.startsWith("anon_"));

    const verified = verifyAnonymousToken(signedCookie);
    assert.ok(verified);
    assert.strictEqual(verified?.anonId, anonId);

    // Tampered cookie signature
    const parts = signedCookie.split(".");
    const tampered = `${parts[0]}.bad_signature_12345`;
    const tamperedResult = verifyAnonymousToken(tampered);
    assert.strictEqual(tamperedResult, null);

    // Tampered cookie payload
    const modifiedPayload = Buffer.from(JSON.stringify({ anonId: "fake_id", version: 1 })).toString("base64");
    const tamperedPayloadCookie = `${modifiedPayload}.${parts[1]}`;
    assert.strictEqual(verifyAnonymousToken(tamperedPayloadCookie), null);
  });
});
