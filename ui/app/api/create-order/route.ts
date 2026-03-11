export const runtime = "nodejs";

import { NextResponse } from "next/server";
import Razorpay from "razorpay";

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
      amount: 4900,
      currency: "INR",
      receipt: `retention_analysis_order_${Date.now()}`,
    });

    return NextResponse.json({
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
    });
  } catch (error) {
    console.error("Razorpay order error:", error);
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 }
    );
  }
}
