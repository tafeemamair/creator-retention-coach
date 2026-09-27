import { describe, it } from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";
import {
  syncAuthUserLedger,
  getAuthUserLedger,
  consumeAuthUserCredit,
  rollbackAuthUserCredit,
  markScriptAnalyzedInHotCache,
} from "../ledger";
import { verifyAnonymousToken, signPayload } from "../entitlement";

describe("5. Authenticated Creator Ledger & Bounded Idempotency", () => {
  it("grants 1 full free analysis for a newly registered user", async () => {
    const userId = `usr_${crypto.randomUUID()}`;
    await syncAuthUserLedger(userId, { freeUsed: false, paidCredits: 0 });

    const scriptHash = crypto.createHash("sha256").update("Script Alpha").digest("hex");
    const result = await consumeAuthUserCredit(userId, scriptHash, "YouTube Shorts");

    assert.equal(result.success, true);
    assert.equal(result.status, "consumed_free");
    assert.equal(result.record.freeUsed, true);
  });

  it("blocks a second unique analysis for an authenticated user with 0 paid credits", async () => {
    const userId = `usr_${crypto.randomUUID()}`;
    await syncAuthUserLedger(userId, { freeUsed: true, paidCredits: 0 });

    const scriptHash = crypto.createHash("sha256").update("Script Beta").digest("hex");
    const result = await consumeAuthUserCredit(userId, scriptHash, "YouTube Shorts");

    assert.equal(result.success, false);
    assert.equal(result.status, "no_credits");
  });

  it("permits same-script re-analysis with 0 credits deducted (bounded idempotency)", async () => {
    const userId = `usr_${crypto.randomUUID()}`;
    await syncAuthUserLedger(userId, { freeUsed: true, paidCredits: 2 });

    const scriptHash = crypto.createHash("sha256").update("Script Gamma").digest("hex");
    await markScriptAnalyzedInHotCache(userId, scriptHash, "YouTube Shorts");

    const result = await consumeAuthUserCredit(userId, scriptHash, "YouTube Shorts");
    assert.equal(result.success, true);
    assert.equal(result.status, "idempotent");
    // Balance remains untouched at 2
    assert.equal(result.record.paidCredits, 2);
  });

  it("distinguishes same-script analysis across different platforms", async () => {
    const userId = `usr_${crypto.randomUUID()}`;
    await syncAuthUserLedger(userId, { freeUsed: true, paidCredits: 2 });

    const scriptHash = crypto.createHash("sha256").update("Script Delta").digest("hex");
    // Mark analyzed on Shorts
    await markScriptAnalyzedInHotCache(userId, scriptHash, "YouTube Shorts");

    // Re-analyzing on Shorts is idempotent
    const shortsRes = await consumeAuthUserCredit(userId, scriptHash, "YouTube Shorts");
    assert.equal(shortsRes.status, "idempotent");

    // Analyzing the same script on TikTok consumes 1 credit because platform profiles differ
    const tiktokRes = await consumeAuthUserCredit(userId, scriptHash, "TikTok");
    assert.equal(tiktokRes.status, "consumed_paid");
    assert.equal(tiktokRes.record.paidCredits, 1);
  });

  it("safely rolls back reserved credit if AI or database commit fails", async () => {
    const userId = `usr_${crypto.randomUUID()}`;
    await syncAuthUserLedger(userId, { freeUsed: false, paidCredits: 3 });

    const scriptHash = crypto.createHash("sha256").update("Script Epsilon").digest("hex");
    const consumeRes = await consumeAuthUserCredit(userId, scriptHash, "YouTube Shorts");
    assert.equal(consumeRes.status, "consumed_free");

    // Simulate AI failure and rollback
    const rollbackRes = await rollbackAuthUserCredit(userId, scriptHash, "free", "YouTube Shorts");
    assert.equal(rollbackRes.success, true);
    assert.equal(rollbackRes.status, "rolled_back");
    assert.equal(rollbackRes.record?.freeUsed, false);

    // Verify user can now analyze again
    const retryRes = await consumeAuthUserCredit(userId, scriptHash, "YouTube Shorts");
    assert.equal(retryRes.status, "consumed_free");
  });

  it("deducts paid credits accurately and preserves remaining balance", async () => {
    const userId = `usr_${crypto.randomUUID()}`;
    await syncAuthUserLedger(userId, { freeUsed: true, paidCredits: 5 });

    const scriptHash = crypto.createHash("sha256").update("Script Zeta").digest("hex");
    const res = await consumeAuthUserCredit(userId, scriptHash, "Instagram Reels");

    assert.equal(res.success, true);
    assert.equal(res.status, "consumed_paid");
    assert.equal(res.record.paidCredits, 4);
  });
});

describe("6. Anonymous-to-Authenticated Migration & Security Checks", () => {
  it("rejects forged anonymous tokens during migration attempts", () => {
    const forgedToken = "eyJhbGciOiJIUzI1NiJ9.tampered_signature";
    const parsed = verifyAnonymousToken(forgedToken);
    assert.equal(parsed, null);
  });

  it("accepts valid cryptographically signed anonymous tokens", () => {
    const validToken = signPayload({
      anonId: "anon_test_valid_uuid",
      created: Date.now(),
      version: 1,
    });
    const parsed = verifyAnonymousToken(validToken);
    assert.ok(parsed);
    assert.equal(parsed.anonId, "anon_test_valid_uuid");
  });

  it("rebuilds hot Redis ledger accurately from database state", async () => {
    const userId = `usr_${crypto.randomUUID()}`;
    // Simulate database hydration
    await syncAuthUserLedger(userId, { freeUsed: true, paidCredits: 10 });

    const cached = await getAuthUserLedger(userId);
    assert.ok(cached);
    assert.equal(cached.freeUsed, true);
    assert.equal(cached.paidCredits, 10);
  });
});
