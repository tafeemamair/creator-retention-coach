import { describe, it } from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";
import {
  validateRazorpayWebhookSignature,
  validateCheckoutSignature,
  getRazorpayWebhookSecret,
  fulfillPaymentOrder,
} from "../payment";
import { getCreditRecord } from "../ledger";
import { verifyEntitlement, signPayload } from "../entitlement";
import { POST as webhookHandler } from "../../app/api/webhooks/razorpay/route";

describe("Phase 2: Razorpay Webhook & Payment Resilience", () => {
  const testSecret = "test_webhook_secret_key_12345";

  // Helper to generate a valid Razorpay webhook signature
  function signWebhookBody(body: string, secret: string = testSecret): string {
    return crypto.createHmac("sha256", secret).update(body).digest("hex");
  }

  it("1. valid webhook signature passes timing-safe validation", () => {
    const rawBody = JSON.stringify({
      event: "payment.captured",
      payload: { payment: { entity: { id: "pay_test123", order_id: "order_test123" } } },
    });
    const signature = signWebhookBody(rawBody);

    const isValid = validateRazorpayWebhookSignature(rawBody, signature, testSecret);
    assert.equal(isValid, true);
  });

  it("2. invalid webhook signature fails validation cleanly", () => {
    const rawBody = JSON.stringify({ event: "payment.captured" });
    const wrongSignature = crypto.createHmac("sha256", "wrong_secret").update(rawBody).digest("hex");

    const isValid = validateRazorpayWebhookSignature(rawBody, wrongSignature, testSecret);
    assert.equal(isValid, false);

    // Also test tampered body
    const validSig = signWebhookBody(rawBody);
    const tamperedBody = JSON.stringify({ event: "payment.captured", tampered: true });
    assert.equal(validateRazorpayWebhookSignature(tamperedBody, validSig, testSecret), false);

    // Empty or malformed signature
    assert.equal(validateRazorpayWebhookSignature(rawBody, "", testSecret), false);
    assert.equal(validateRazorpayWebhookSignature(rawBody, "short_sig", testSecret), false);
  });

  it("3. missing webhook secret fails closed in production", () => {
    const originalEnv = process.env.NODE_ENV;
    const originalSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    try {
      (process.env as Record<string, string | undefined>).NODE_ENV = "production";
      delete process.env.RAZORPAY_WEBHOOK_SECRET;

      assert.throws(
        () => {
          getRazorpayWebhookSecret();
        },
        {
          name: "Error",
          message: /Missing or placeholder RAZORPAY_WEBHOOK_SECRET in production/,
        }
      );
    } finally {
      (process.env as Record<string, string | undefined>).NODE_ENV = originalEnv;
      if (originalSecret !== undefined) {
        process.env.RAZORPAY_WEBHOOK_SECRET = originalSecret;
      } else {
        delete process.env.RAZORPAY_WEBHOOK_SECRET;
      }
    }
  });

  it("4. malformed webhook payload returns 400 Bad Request", async () => {
    const rawBody = "{ invalid_json: ";
    const signature = signWebhookBody(rawBody, "dev_razorpay_webhook_secret_mock");

    const req = new Request("http://localhost:3000/api/webhooks/razorpay", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-razorpay-signature": signature,
      },
      body: rawBody,
    });

    const res = await webhookHandler(req);
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.equal(data.error, "Malformed JSON payload");
  });

  it("5. non-captured events are ignored gracefully without processing", async () => {
    const rawBody = JSON.stringify({
      event: "payment.authorized",
      payload: { payment: { entity: { id: "pay_ignored", order_id: "order_ignored" } } },
    });
    const signature = signWebhookBody(rawBody, "dev_razorpay_webhook_secret_mock");

    const req = new Request("http://localhost:3000/api/webhooks/razorpay", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-razorpay-signature": signature,
      },
      body: rawBody,
    });

    const res = await webhookHandler(req);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, "ignored");
    assert.equal(data.event, "payment.authorized");
  });

  it("6. payment.captured fulfillment resolves plan and grants credits", async () => {
    const orderId = `order_test_${crypto.randomUUID()}`;
    const paymentId = `pay_test_${crypto.randomUUID()}`;

    const result = await fulfillPaymentOrder({
      orderId,
      paymentId,
      amount: 14900,
      currency: "INR",
    });

    assert.equal(result.success, true);
    assert.equal(result.alreadyProcessed, false);
    assert.equal(result.plan, "pack5");
    assert.equal(result.totalCredits, 5);
    assert.equal(result.creditsRemaining, 5);

    // Verify Redis / memory legacy credit record was created
    const record = await getCreditRecord(orderId);
    assert.notEqual(record, null);
    assert.equal(record?.creditsRemaining, 5);
    assert.equal(record?.totalCredits, 5);
  });

  it("7. duplicate webhook delivery is a safe idempotent no-op", async () => {
    const orderId = `order_dup_${crypto.randomUUID()}`;
    const paymentId = `pay_dup_${crypto.randomUUID()}`;

    // Delivery 1
    const res1 = await fulfillPaymentOrder({
      orderId,
      paymentId,
      amount: 4900,
      currency: "INR",
    });
    assert.equal(res1.success, true);
    assert.equal(res1.alreadyProcessed, false);
    assert.equal(res1.creditsRemaining, 1);

    // Delivery 2 (Duplicate)
    const res2 = await fulfillPaymentOrder({
      orderId,
      paymentId,
      amount: 4900,
      currency: "INR",
    });
    assert.equal(res2.success, true);
    assert.equal(res2.alreadyProcessed, true);

    // Credits remain 1, not duplicated
    const record = await getCreditRecord(orderId);
    assert.equal(record?.creditsRemaining, 1);
    assert.equal(record?.totalCredits, 1);
  });

  it("8. client verification followed by webhook delivery does not double-credit", async () => {
    const orderId = `order_client_first_${crypto.randomUUID()}`;
    const paymentId = `pay_client_first_${crypto.randomUUID()}`;

    // 1. Client verification arrives first
    const clientRes = await fulfillPaymentOrder({
      orderId,
      paymentId,
      amount: 14900,
      currency: "INR",
      clientPlanId: "pack5",
    });
    assert.equal(clientRes.success, true);
    assert.equal(clientRes.alreadyProcessed, false);
    assert.equal(clientRes.totalCredits, 5);

    // 2. Webhook delivery arrives subsequently
    const webhookRes = await fulfillPaymentOrder({
      orderId,
      paymentId,
      amount: 14900,
      currency: "INR",
    });
    assert.equal(webhookRes.success, true);
    assert.equal(webhookRes.alreadyProcessed, true);

    // Credit balance is exactly 5
    const record = await getCreditRecord(orderId);
    assert.equal(record?.totalCredits, 5);
  });

  it("9. webhook followed by client verification generates valid cookie and preserves credits", async () => {
    const orderId = `order_webhook_first_${crypto.randomUUID()}`;
    const paymentId = `pay_webhook_first_${crypto.randomUUID()}`;

    // 1. Webhook arrives first
    const webhookRes = await fulfillPaymentOrder({
      orderId,
      paymentId,
      amount: 4900,
      currency: "INR",
    });
    assert.equal(webhookRes.success, true);
    assert.equal(webhookRes.alreadyProcessed, false);

    // 2. Client verification arrives second
    const clientRes = await fulfillPaymentOrder({
      orderId,
      paymentId,
      amount: 4900,
      currency: "INR",
    });
    assert.equal(clientRes.success, true);
    assert.equal(clientRes.alreadyProcessed, true);
    assert.equal(clientRes.cookiePayload.orderId, orderId);
    assert.equal(clientRes.cookiePayload.paymentId, paymentId);
    assert.equal(clientRes.cookiePayload.creditsRemaining, 1);

    // Verify generated cookie payload can be signed and verified
    const cookieToken = signPayload(clientRes.cookiePayload);
    const verified = verifyEntitlement(cookieToken);
    assert.notEqual(verified, null);
    assert.equal(verified?.orderId, orderId);
  });

  it("10. concurrent race fulfillment grants credits exactly once", async () => {
    const orderId = `order_race_${crypto.randomUUID()}`;
    const paymentId = `pay_race_${crypto.randomUUID()}`;

    // Fire 5 concurrent fulfillment calls simultaneously
    const results = await Promise.all([
      fulfillPaymentOrder({ orderId, paymentId, amount: 14900, currency: "INR" }),
      fulfillPaymentOrder({ orderId, paymentId, amount: 14900, currency: "INR" }),
      fulfillPaymentOrder({ orderId, paymentId, amount: 14900, currency: "INR" }),
      fulfillPaymentOrder({ orderId, paymentId, amount: 14900, currency: "INR" }),
      fulfillPaymentOrder({ orderId, paymentId, amount: 14900, currency: "INR" }),
    ]);

    // All should report success
    assert.equal(results.every((r) => r.success), true);

    // Exactly one should be alreadyProcessed: false (the winner)
    const freshClaims = results.filter((r) => !r.alreadyProcessed);
    assert.equal(freshClaims.length, 1);

    // The other 4 should be alreadyProcessed: true
    const duplicates = results.filter((r) => r.alreadyProcessed);
    assert.equal(duplicates.length, 4);

    // Final balance in record is 5
    const record = await getCreditRecord(orderId);
    assert.equal(record?.totalCredits, 5);
    assert.equal(record?.creditsRemaining, 5);
  });

  it("11. no credit grant occurs on invalid webhook signature", async () => {
    const orderId = `order_tamper_${crypto.randomUUID()}`;
    const paymentId = `pay_tamper_${crypto.randomUUID()}`;

    const rawBody = JSON.stringify({
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: paymentId,
            order_id: orderId,
            amount: 14900,
            currency: "INR",
          },
        },
      },
    });

    // Request with invalid signature
    const req = new Request("http://localhost:3000/api/webhooks/razorpay", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-razorpay-signature": "forged_signature_12345",
      },
      body: rawBody,
    });

    const res = await webhookHandler(req);
    assert.equal(res.status, 400);

    // Ensure zero records were created in the ledger
    const record = await getCreditRecord(orderId);
    assert.equal(record, null);
  });

  it("12. existing checkout signature validation remains intact and timing-safe", () => {
    const orderId = "order_9A33XWu170gUtm";
    const paymentId = "pay_29MoEatu7Gbpq2";
    const keySecret = "EnLsTekTuBafFW9eiffzhlgI";

    // Expected valid signature
    const hmac = crypto.createHmac("sha256", keySecret);
    hmac.update(`${orderId}|${paymentId}`);
    const validSignature = hmac.digest("hex");

    const validCheck = validateCheckoutSignature(orderId, paymentId, validSignature, keySecret);
    assert.equal(validCheck, true);

    // Tampered signature fails
    const invalidCheck = validateCheckoutSignature(orderId, paymentId, "tampered_sig", keySecret);
    assert.equal(invalidCheck, false);

    // Wrong order ID fails
    const wrongOrderCheck = validateCheckoutSignature("order_wrong", paymentId, validSignature, keySecret);
    assert.equal(wrongOrderCheck, false);
  });
});
