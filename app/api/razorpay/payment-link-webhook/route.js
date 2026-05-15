import crypto from "crypto";
import { NextResponse } from "next/server";

import { recordRazorpayPaymentLink } from "../payment-link-record";

export const runtime = "nodejs";

const verifyWebhookSignature = (body, signature) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!secret) {
    throw new Error("Razorpay webhook secret is not configured");
  }

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");

  return expectedSignature === signature;
};

const getPaymentId = (payload) =>
  payload?.payload?.payment?.entity?.id ||
  payload?.payload?.payment_link?.entity?.payments?.[0]?.payment_id ||
  payload?.payload?.payment_link?.entity?.payments?.payment_id ||
  "";

export async function POST(req) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature") || "";

    if (!verifyWebhookSignature(rawBody, signature)) {
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
    }

    const payload = JSON.parse(rawBody);

    if (payload.event !== "payment_link.paid") {
      return NextResponse.json({ success: true, ignored: true });
    }

    const paymentLink = payload?.payload?.payment_link?.entity;
    const notes = paymentLink?.notes || {};
    const teamId = notes.teamId || "";
    const memberId = notes.memberId || "";
    const periodId = notes.periodId || "";
    const paymentLinkId = paymentLink?.id || "";
    const paymentLinkReferenceId = paymentLink?.reference_id || "";
    const paymentId = getPaymentId(payload);

    await recordRazorpayPaymentLink({
      teamId,
      memberId,
      periodId,
      paymentLinkId,
      paymentLinkReferenceId,
      paymentLinkStatus: "paid",
      paymentId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Razorpay payment link webhook error:", error);

    return NextResponse.json(
      { error: error.message || "Failed to process Razorpay webhook" },
      { status: 500 },
    );
  }
}
