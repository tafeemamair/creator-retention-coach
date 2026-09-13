export const runtime = "nodejs";

import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import {
  ENTITLEMENT_COOKIE,
  ENTITLEMENT_TTL_SECONDS,
  RETENTION_ANALYSIS_AMOUNT,
  RETENTION_ANALYSIS_CURRENCY,
  createEntitlementToken,
  verifyRazorpaySignature,
} from "../../../lib/payment";

export async function POST(req: Request) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json();
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    const sessionSecret = process.env.PAYMENT_SESSION_SECRET;

    if (!keyId || !keySecret || !sessionSecret) {
      return NextResponse.json({ error: "Payment verification is not configured." }, { status: 500 });
    }

    if (
      !verifyRazorpaySignature(
        String(razorpay_order_id || ""),
        String(razorpay_payment_id || ""),
        String(razorpay_signature || ""),
        keySecret,
      )
    ) {
      return NextResponse.json({ error: "Payment signature verification failed." }, { status: 400 });
    }

    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
    const order = await razorpay.orders.fetch(String(razorpay_order_id));

    if (
      Number(order.amount) !== RETENTION_ANALYSIS_AMOUNT ||
      order.currency !== RETENTION_ANALYSIS_CURRENCY ||
      order.status !== "paid"
    ) {
      return NextResponse.json({ error: "Payment order could not be verified." }, { status: 400 });
    }

    const response = NextResponse.json({ verified: true });
    response.cookies.set(ENTITLEMENT_COOKIE, createEntitlementToken(sessionSecret), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: ENTITLEMENT_TTL_SECONDS,
    });
    return response;
  } catch (error) {
    console.error("Payment verification error:", error);
    return NextResponse.json({ error: "Payment verification failed." }, { status: 500 });
  }
}
