export const runtime = "nodejs";

import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { RETENTION_ANALYSIS_AMOUNT, RETENTION_ANALYSIS_CURRENCY } from "../../../lib/payment";

export async function POST() {
  try {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      console.error(
        "Razorpay order error: Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET."
      );
      return NextResponse.json(
        { error: "Failed to create order" },
        { status: 500 }
      );
    }

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const order = await razorpay.orders.create({
      amount: RETENTION_ANALYSIS_AMOUNT,
      currency: RETENTION_ANALYSIS_CURRENCY,
      receipt: `retention_analysis_order_${Date.now()}`,
    });

    return NextResponse.json({
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error("Razorpay order error:", error);
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 }
    );
  }
}
