export const runtime = "nodejs";

import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  validateCheckoutSignature,
  fulfillPaymentOrder,
  resolvePlanFromAmount,
} from "@/lib/payment";
import { signPayload } from "@/lib/entitlement";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      planId: clientPlanId,
    } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        { error: "Missing payment verification parameters" },
        { status: 400 }
      );
    }

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
      console.error(
        "Razorpay verification error: Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET."
      );
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // 1. Verify Razorpay checkout signature: HMAC-SHA256 of "order_id|payment_id"
    const isSignatureValid = validateCheckoutSignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      keySecret
    );

    if (!isSignatureValid) {
      return NextResponse.json(
        { error: "Invalid payment signature" },
        { status: 400 }
      );
    }

    // 2. Authoritatively fetch the order from Razorpay to verify amount and currency
    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    let order: { amount: number; currency: string; notes?: Record<string, string> };
    try {
      order = (await razorpay.orders.fetch(
        razorpay_order_id
      )) as unknown as { amount: number; currency: string; notes?: Record<string, string> };
    } catch (err) {
      console.error("Failed to fetch Razorpay order:", err);
      return NextResponse.json(
        { error: "Failed to verify order details with payment gateway" },
        { status: 400 }
      );
    }

    if (!order || order.currency !== "INR") {
      return NextResponse.json(
        { error: "Invalid order currency or details" },
        { status: 400 }
      );
    }

    const planConfig = resolvePlanFromAmount(order.amount);
    if (!planConfig) {
      return NextResponse.json(
        { error: "Order amount does not match any valid plan." },
        { status: 400 }
      );
    }

    // If client supplied planId, verify it matches the authoritative server plan
    if (clientPlanId && clientPlanId !== planConfig.plan) {
      return NextResponse.json(
        { error: "Plan mismatch between request and order." },
        { status: 400 }
      );
    }

    // 3. Check optional authenticated user session
    const cookieStore = await cookies();
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      "https://placeholder-project.supabase.co";
    const supabaseAnonKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignored in route handler
          }
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // 4. Execute atomic and idempotent fulfillment via shared helper
    const result = await fulfillPaymentOrder({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      amount: order.amount,
      currency: order.currency,
      clientPlanId,
      userId: user?.id || null,
      notes: order.notes,
    });

    // 5. Sign entitlement cookie for anonymous / backward-compatible sessions
    const entitlementCookie = signPayload(result.cookiePayload);

    const isHttps =
      req.headers.get("x-forwarded-proto") === "https" ||
      new URL(req.url).protocol === "https:";
    const secureFlag = isHttps ? "; Secure" : "";
    const maxAgeSeconds = Math.max(
      0,
      Math.floor(
        (result.cookiePayload.expiryTime - result.cookiePayload.issueTime) / 1000
      )
    );

    const response = NextResponse.json({
      success: true,
      alreadyProcessed: result.alreadyProcessed,
      message: "Payment verified successfully",
      plan: result.plan,
      creditsRemaining: result.creditsRemaining,
      totalCredits: result.totalCredits,
    });

    response.headers.set(
      "Set-Cookie",
      `paid_entitlement=${entitlementCookie}; Path=/; Max-Age=${maxAgeSeconds}; HttpOnly${secureFlag}; SameSite=Lax`
    );

    return response;
  } catch (error) {
    console.error("Payment verification failed:", error);
    return NextResponse.json(
      { error: "Payment verification failed" },
      { status: 500 }
    );
  }
}
