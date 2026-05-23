import { NextResponse } from "next/server";
import {
  getRazorpayConfigByTeamId,
  verifyRazorpaySignatureWithConfig,
} from "@/lib/server-integrations";
import { assertTeamUnlockedByPlan } from "@/lib/server-team-access";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, teamId } =
      await req.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        { error: "Razorpay payment verification fields are required" },
        { status: 400 },
      );
    }

    await assertTeamUnlockedByPlan(teamId);

    const razorpayConfig = await getRazorpayConfigByTeamId(teamId);
    const verified = verifyRazorpaySignatureWithConfig({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
      config: razorpayConfig,
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
      { status: error.statusCode || 500 },
    );
  }
}
