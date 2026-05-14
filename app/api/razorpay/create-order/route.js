import { NextResponse } from "next/server";
import { getRazorpayInstance, getRazorpayKeyId } from "@/lib/razorpay";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const { amount, receipt, notes } = await req.json();
    const numericAmount = Number(amount || 0);

    if (!numericAmount || numericAmount <= 0) {
      return NextResponse.json(
        { error: "Valid amount is required" },
        { status: 400 },
      );
    }

    const razorpay = getRazorpayInstance();
    const order = await razorpay.orders.create({
      amount: Math.round(numericAmount * 100),
      currency: "INR",
      receipt: String(receipt || `kda_${Date.now()}`).slice(0, 40),
      notes: notes || {},
    });

    return NextResponse.json({
      success: true,
      keyId: getRazorpayKeyId(),
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (error) {
    console.error("Razorpay create order error:", error);

    return NextResponse.json(
      { error: error.message || "Failed to create Razorpay order" },
      { status: 500 },
    );
  }
}
