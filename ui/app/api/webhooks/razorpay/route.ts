export const runtime = "nodejs";

import { NextResponse } from "next/server";
import {
  validateRazorpayWebhookSignature,
  fulfillPaymentOrder,
} from "@/lib/payment";

export async function POST(req: Request) {
  try {
    // 1. Read the unparsed raw request body string
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "Missing x-razorpay-signature header" },
        { status: 400 }
      );
    }

    // 2. Validate HMAC-SHA256 signature using timing-safe comparison
    const isValid = validateRazorpayWebhookSignature(rawBody, signature);
    if (!isValid) {
      console.warn("Unauthorized Razorpay webhook delivery: invalid signature.");
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 400 }
      );
    }

    // 3. Parse JSON payload
    let payload: {
      event?: string;
      payload?: {
        payment?: {
          entity?: {
            id?: string;
            order_id?: string;
            amount?: number;
            currency?: string;
            status?: string;
            notes?: Record<string, string>;
          };
        };
      };
    };

    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { error: "Malformed JSON payload" },
        { status: 400 }
      );
    }

    const event = payload.event;

    // 4. We only process 'payment.captured' events for V1 credit fulfillment
    if (event !== "payment.captured") {
      return NextResponse.json(
        { status: "ignored", event },
        { status: 200 }
      );
    }

    const paymentEntity = payload.payload?.payment?.entity;
    if (!paymentEntity) {
      return NextResponse.json(
        { error: "Missing payment entity in webhook payload" },
        { status: 400 }
      );
    }

    const orderId = paymentEntity.order_id;
    const paymentId = paymentEntity.id;
    const amount = paymentEntity.amount;
    const currency = paymentEntity.currency;
    const notes = paymentEntity.notes;

    if (!orderId || !paymentId) {
      return NextResponse.json(
        { error: "Missing order_id or payment id in event entity" },
        { status: 400 }
      );
    }

    // 5. Execute atomic, idempotent fulfillment
    const result = await fulfillPaymentOrder({
      orderId,
      paymentId,
      amount,
      currency,
      notes,
    });

    return NextResponse.json(
      {
        status: "success",
        orderId: result.orderId,
        paymentId: result.paymentId,
        plan: result.plan,
        alreadyProcessed: result.alreadyProcessed,
        userCredited: result.userCredited,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Razorpay webhook fulfillment error:", err);
    // Return non-200 status so Razorpay retries the webhook on server/DB error
    return NextResponse.json(
      { error: "Internal payment fulfillment error" },
      { status: 500 }
    );
  }
}
