import { NextResponse } from "next/server";

import { verifyRazorpayPaymentLinkSignature } from "@/lib/razorpay";
import { recordRazorpayPaymentLink } from "../payment-link-record";

export const runtime = "nodejs";

const getParam = (params, ...keys) => {
  for (const key of keys) {
    const value = params.get(key);
    if (value) return value;
  }

  return "";
};

const getRedirectUrl = (origin, teamId, memberId, status = "success") =>
  `${origin}/admin/teams/${teamId}/billing?memberId=${memberId}&payment=${status}`;

export async function GET(req) {
  const url = new URL(req.url);
  const params = url.searchParams;
  const origin = url.origin;
  const teamId = params.get("teamId") || "";
  const memberId = params.get("memberId") || "";
  const periodId = params.get("periodId") || "";

  try {
    const paymentId = getParam(params, "razorpay_payment_id", "payment_id");
    const paymentLinkId = getParam(
      params,
      "razorpay_payment_link_id",
      "payment_link_id",
    );
    const paymentLinkReferenceId = getParam(
      params,
      "razorpay_payment_link_reference_id",
      "payment_link_reference_id",
    );
    const paymentLinkStatus = getParam(
      params,
      "razorpay_payment_link_status",
      "payment_link_status",
    );
    const signature = getParam(params, "razorpay_signature", "signature");

    if (
      !teamId ||
      !memberId ||
      !periodId ||
      !paymentId ||
      !paymentLinkId ||
      !paymentLinkReferenceId ||
      !paymentLinkStatus ||
      !signature
    ) {
      throw new Error("Missing Razorpay callback fields");
    }

    const verified = verifyRazorpayPaymentLinkSignature({
      paymentLinkId,
      paymentLinkReferenceId,
      paymentLinkStatus,
      paymentId,
      signature,
    });

    if (!verified) {
      throw new Error("Invalid Razorpay payment link signature");
    }

    if (paymentLinkStatus !== "paid") {
      return NextResponse.redirect(
        getRedirectUrl(origin, teamId, memberId, paymentLinkStatus || "failed"),
      );
    }

    await recordRazorpayPaymentLink({
      teamId,
      memberId,
      periodId,
      paymentLinkId,
      paymentLinkReferenceId,
      paymentLinkStatus,
      paymentId,
    });

    return NextResponse.redirect(getRedirectUrl(origin, teamId, memberId));
  } catch (error) {
    console.error("Razorpay payment link callback error:", error);

    if (teamId && memberId) {
      return NextResponse.redirect(getRedirectUrl(origin, teamId, memberId, "failed"));
    }

    return NextResponse.redirect(`${origin}/admin/billing?payment=failed`);
  }
}
