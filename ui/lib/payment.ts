import crypto from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "@/lib/supabase/admin";
import {
  getCreditRecord,
  initializeCreditRecord,
  syncAuthUserLedger,
} from "./ledger";
import type { EntitlementPayload } from "./entitlement";

export interface PlanConfig {
  plan: "single" | "pack5";
  amount: number;
  credits: number;
  validityDays: number;
}

export const PLAN_CONFIGS: Record<string, PlanConfig> = {
  single: {
    plan: "single",
    amount: 4900,
    credits: 1,
    validityDays: 30,
  },
  pack5: {
    plan: "pack5",
    amount: 14900,
    credits: 5,
    validityDays: 90,
  },
};

/**
 * In-process concurrency mutex and fallback tracking for orders
 */
const inMemoryOrderClaims = new Set<string>();

export function claimOrderInMemory(orderId: string): boolean {
  if (inMemoryOrderClaims.has(orderId)) {
    return false;
  }
  inMemoryOrderClaims.add(orderId);
  return true;
}

export function releaseOrderInMemory(orderId: string): void {
  inMemoryOrderClaims.delete(orderId);
}

/**
 * Resolves authoritative plan details from an amount in paise.
 */
export function resolvePlanFromAmount(amountInPaise: number): PlanConfig | null {
  if (amountInPaise === 4900) {
    return PLAN_CONFIGS.single;
  }
  if (amountInPaise === 14900) {
    return PLAN_CONFIGS.pack5;
  }
  return null;
}

/**
 * Retrieves the Razorpay webhook secret.
 * In production, fails closed if missing or placeholder.
 */
export function getRazorpayWebhookSecret(): string {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim();
  if (!secret || secret === "your_razorpay_webhook_secret_here") {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Missing or placeholder RAZORPAY_WEBHOOK_SECRET in production.");
    }
    return "dev_razorpay_webhook_secret_mock";
  }
  return secret;
}

/**
 * Validates Razorpay checkout signature: HMAC-SHA256 of "order_id|payment_id" using key_secret.
 * Uses timing-safe byte comparison.
 */
export function validateCheckoutSignature(
  orderId: string,
  paymentId: string,
  signature: string,
  keySecret: string
): boolean {
  if (!orderId || !paymentId || !signature || !keySecret) {
    return false;
  }

  const hmac = crypto.createHmac("sha256", keySecret);
  hmac.update(`${orderId}|${paymentId}`);
  const generatedSignature = hmac.digest("hex");

  const sigBuffer = Buffer.from(signature, "utf-8");
  const expectedBuffer = Buffer.from(generatedSignature, "utf-8");

  if (sigBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
}

/**
 * Validates Razorpay server-side webhook signature (x-razorpay-signature) using timing-safe comparison.
 * Requires raw, unparsed request body string.
 */
export function validateRazorpayWebhookSignature(
  rawBody: string,
  signature: string | null | undefined,
  secretOverride?: string
): boolean {
  if (!rawBody || !signature) {
    return false;
  }

  let secret: string;
  try {
    secret = secretOverride || getRazorpayWebhookSecret();
  } catch (err) {
    console.error("Webhook secret error:", err);
    return false;
  }

  if (!secret) {
    return false;
  }

  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(rawBody);
  const digest = hmac.digest("hex");

  const sigBuffer = Buffer.from(signature, "utf-8");
  const expectedBuffer = Buffer.from(digest, "utf-8");

  if (sigBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
}

export interface FulfillPaymentParams {
  orderId: string;
  paymentId: string;
  amount?: number;
  currency?: string;
  clientPlanId?: string;
  userId?: string | null;
  notes?: Record<string, string>;
  adminOverride?: SupabaseClient | null;
}

export interface FulfillPaymentResult {
  success: boolean;
  alreadyProcessed: boolean;
  orderId: string;
  paymentId: string;
  plan: "single" | "pack5";
  creditsRemaining: number;
  totalCredits: number;
  cookiePayload: EntitlementPayload;
  userCredited: boolean;
  targetUserId: string | null;
}

/**
 * Shared atomic and idempotent payment fulfillment helper.
 * Single source of truth for both POST /api/verify-payment and POST /api/webhooks/razorpay.
 *
 * Guarantees:
 * 1. Only one concurrent execution can transition payment_orders from 'created' to 'paid'.
 * 2. Credits cannot be granted twice on duplicate or interleaved verification/webhook delivery.
 * 3. Credit updates use Optimistic Concurrency Control (OCC) to prevent lost increments.
 * 4. If credit grant fails, order status is rolled back for retries so payment_orders is never left paid without credits.
 * 5. Anonymous payment backward compatibility is preserved via legacy Redis order records & signed cookies.
 */
export async function fulfillPaymentOrder(
  params: FulfillPaymentParams
): Promise<FulfillPaymentResult> {
  const { orderId, paymentId, clientPlanId, notes, adminOverride } = params;

  if (!orderId || !paymentId) {
    throw new Error("Missing required orderId or paymentId for fulfillment.");
  }

  // 1. Resolve plan details
  let planConfig: PlanConfig | null = null;

  if (params.amount) {
    planConfig = resolvePlanFromAmount(params.amount);
  }

  if (!planConfig && clientPlanId && (clientPlanId === "single" || clientPlanId === "pack5")) {
    planConfig = PLAN_CONFIGS[clientPlanId];
  }

  if (!planConfig && notes?.planId && (notes.planId === "single" || notes.planId === "pack5")) {
    planConfig = PLAN_CONFIGS[notes.planId];
  }

  // Default fallback if amount was not matched
  if (!planConfig) {
    planConfig = PLAN_CONFIGS.single;
  }

  const { plan, amount, credits, validityDays } = planConfig;

  // 2. Synchronously check in-process mutex
  const wonInMemoryClaim = claimOrderInMemory(orderId);

  // 3. Determine target user ID (from params, notes, or existing DB order)
  let targetUserId: string | null =
    params.userId ||
    (notes?.userId && notes.userId.trim() !== "" ? notes.userId.trim() : null);

  const admin = adminOverride !== undefined ? adminOverride : getAdminClient();
  let alreadyProcessed = !wonInMemoryClaim;
  let userCredited = false;

  if (admin) {
    try {
      // Step A: Ensure order row exists in payment_orders
      const { error: seedError } = await admin.from("payment_orders").upsert(
        {
          order_id: orderId,
          user_id: targetUserId || null,
          plan,
          amount,
          currency: "INR",
          credits,
          status: "created",
        },
        { onConflict: "order_id", ignoreDuplicates: true }
      );

      if (seedError) {
        console.warn("Notice during payment_orders row seed:", seedError.message);
      }

      // Step B: Atomically transition status from 'created' to 'paid'
      // PostgreSQL row-level lock ensures exactly one concurrent query updates the row
      const { data: updatedOrder, error: updateError } = await admin
        .from("payment_orders")
        .update({
          status: "paid",
          payment_id: paymentId,
          claimed_by_user_id: targetUserId || undefined,
          updated_at: new Date().toISOString(),
        })
        .eq("order_id", orderId)
        .eq("status", "created")
        .select()
        .maybeSingle();

      if (updateError) {
        releaseOrderInMemory(orderId);
        console.error("Database error updating payment_orders status:", updateError);
        throw new Error(`Failed to update payment_orders: ${updateError.message}`);
      }

      if (!updatedOrder) {
        // Zero rows updated: the order was ALREADY marked 'paid'
        alreadyProcessed = true;

        // Fetch existing order to confirm state and target user
        const { data: existingOrder } = await admin
          .from("payment_orders")
          .select("*")
          .eq("order_id", orderId)
          .maybeSingle();

        if (existingOrder) {
          if (!targetUserId && (existingOrder.user_id || existingOrder.claimed_by_user_id)) {
            targetUserId = existingOrder.claimed_by_user_id || existingOrder.user_id;
          }
        }
      } else {
        // This execution won the transition race in PostgreSQL
        alreadyProcessed = false;

        if (!targetUserId && (updatedOrder.user_id || updatedOrder.claimed_by_user_id)) {
          targetUserId = updatedOrder.claimed_by_user_id || updatedOrder.user_id;
        }

        if (targetUserId) {
          // Step C: Atomically grant credits to the user using Optimistic Concurrency Control (OCC)
          let grantSuccess = false;
          let lastError: Error | null = null;

          for (let attempt = 0; attempt < 5; attempt++) {
            try {
              const { data: curEnt, error: fetchEntErr } = await admin
                .from("entitlements")
                .select("free_analysis_used, paid_credits")
                .eq("user_id", targetUserId)
                .maybeSingle();

              if (fetchEntErr) {
                throw fetchEntErr;
              }

              if (!curEnt) {
                // No entitlement row exists yet; insert default with new credits
                const { error: insertErr } = await admin.from("entitlements").insert({
                  user_id: targetUserId,
                  free_analysis_used: false,
                  paid_credits: credits,
                  updated_at: new Date().toISOString(),
                });

                if (!insertErr) {
                  grantSuccess = true;
                  userCredited = true;
                  await syncAuthUserLedger(targetUserId, {
                    freeUsed: false,
                    paidCredits: credits,
                  });
                  break;
                }
              } else {
                const currentPaid = curEnt.paid_credits ?? 0;
                const updatedPaid = currentPaid + credits;

                // Compare-and-swap on paid_credits
                const { data: updatedEnt, error: updateEntErr } = await admin
                  .from("entitlements")
                  .update({
                    paid_credits: updatedPaid,
                    updated_at: new Date().toISOString(),
                  })
                  .eq("user_id", targetUserId)
                  .eq("paid_credits", currentPaid)
                  .select();

                if (!updateEntErr && updatedEnt && updatedEnt.length > 0) {
                  grantSuccess = true;
                  userCredited = true;
                  await syncAuthUserLedger(targetUserId, {
                    freeUsed: curEnt.free_analysis_used ?? false,
                    paidCredits: updatedPaid,
                  });
                  break;
                }
              }
            } catch (occErr) {
              lastError = occErr instanceof Error ? occErr : new Error(String(occErr));
            }
          }

          if (!grantSuccess) {
            // Roll back payment_orders status back to 'created' so retry will succeed
            releaseOrderInMemory(orderId);
            console.error(
              "Failed to atomically grant credits after 5 attempts. Rolling back payment_orders status for retry.",
              lastError
            );
            await admin
              .from("payment_orders")
              .update({
                status: "created",
                payment_id: null,
                updated_at: new Date().toISOString(),
              })
              .eq("order_id", orderId);

            throw new Error(
              `Failed to credit user account: ${lastError?.message || "OCC contention"}`
            );
          }
        }
      }
    } catch (dbErr) {
      releaseOrderInMemory(orderId);
      throw dbErr;
    }
  }

  // 4. Initialize or retrieve credit record in Redis / memory (Legacy Order Ledger)
  let creditRecord = await getCreditRecord(orderId);
  if (!creditRecord) {
    creditRecord = await initializeCreditRecord(
      orderId,
      plan,
      credits,
      validityDays
    );
  } else if (!admin && !wonInMemoryClaim) {
    alreadyProcessed = true;
  }

  // 5. Generate signed entitlement cookie payload (for anonymous/backward-compatible sessions)
  const issueTime = Date.now();
  const expiryTime = creditRecord.expiresAt;

  const cookiePayload: EntitlementPayload = {
    orderId,
    paymentId,
    plan: creditRecord.plan,
    creditsRemaining: creditRecord.creditsRemaining,
    totalCredits: creditRecord.totalCredits,
    issueTime,
    expiryTime,
    version: 1,
  };

  return {
    success: true,
    alreadyProcessed,
    orderId,
    paymentId,
    plan,
    creditsRemaining: creditRecord.creditsRemaining,
    totalCredits: creditRecord.totalCredits,
    cookiePayload,
    userCredited,
    targetUserId,
  };
}
