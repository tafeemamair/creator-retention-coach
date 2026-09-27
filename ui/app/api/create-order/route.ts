export const runtime = "nodejs";

import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    let body: { planId?: string } = {};
    try {
      body = (await req.json()) as { planId?: string };
    } catch {
      // Empty or non-JSON body
    }

    const planId = body?.planId;
    if (planId !== "single" && planId !== "pack5") {
      return NextResponse.json(
        { error: "Invalid plan ID. Must be 'single' or 'pack5'." },
        { status: 400 }
      );
    }

    const amount = planId === "pack5" ? 14900 : 4900;
    const credits = planId === "pack5" ? 5 : 1;
    const validityDays = planId === "pack5" ? 90 : 30;

    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      console.error(
        "Razorpay order error: Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET."
      );
      return NextResponse.json(
        { error: "Failed to create order" },
        { status: 500 }
      );
    }

    // Check optional authenticated user
    const cookieStore = await cookies();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-project.supabase.co";
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

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
            // Ignored
          }
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const order = await razorpay.orders.create({
      amount,
      currency: "INR",
      receipt: `retention_${planId}_${Date.now()}`,
      notes: {
        planId,
        credits: String(credits),
        validityDays: String(validityDays),
        userId: user?.id || "",
      },
    });

    // Record order in payment_orders table
    const admin = getAdminClient();
    if (admin) {
      try {
        await admin.from("payment_orders").upsert({
          order_id: order.id,
          user_id: user?.id || null,
          plan: planId,
          amount,
          currency: "INR",
          credits,
          status: "created",
        });
      } catch (dbErr) {
        console.warn("Failed to record created order in payment_orders table:", dbErr);
      }
    }

    return NextResponse.json({
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
      planId,
    });
  } catch (error) {
    console.error("Razorpay order error:", error);
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 }
    );
  }
}
