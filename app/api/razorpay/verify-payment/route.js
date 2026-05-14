import { NextResponse } from "next/server";
import { verifyRazorpaySignature } from "@/lib/razorpay";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      await req.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        { error: "Razorpay payment verification fields are required" },
        { status: 400 },
      );
    }

    const verified = verifyRazorpaySignature({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    });

    if (!verified) {
      return NextResponse.json(
        { error: "Invalid Razorpay payment signature" },
        { status: 400 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Razorpay verify payment error:", error);

    return NextResponse.json(
      { error: error.message || "Failed to verify Razorpay payment" },
      { status: 500 },
    );
  }
}
