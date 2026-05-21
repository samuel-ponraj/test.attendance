import { NextResponse } from "next/server";

import { recordRazorpayPaymentLink } from "../payment-link-record";
import {
  getRazorpayConfigByTeamId,
  verifyRazorpayWebhookSignatureWithConfig,
} from "@/lib/server-integrations";

export const runtime = "nodejs";

const getPaymentId = (payload) =>
  payload?.payload?.payment?.entity?.id ||
  payload?.payload?.payment_link?.entity?.payments?.[0]?.payment_id ||
  payload?.payload?.payment_link?.entity?.payments?.payment_id ||
  "";

export async function POST(req) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature") || "";
    const payload = JSON.parse(rawBody);
    const paymentLink = payload?.payload?.payment_link?.entity;
    const notes = paymentLink?.notes || {};
    const teamId = notes.teamId || "";
    const razorpayConfig = await getRazorpayConfigByTeamId(teamId);

    if (
      !verifyRazorpayWebhookSignatureWithConfig(
        rawBody,
        signature,
        razorpayConfig,
      )
    ) {
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
    }

    if (payload.event !== "payment_link.paid") {
      return NextResponse.json({ success: true, ignored: true });
    }

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
