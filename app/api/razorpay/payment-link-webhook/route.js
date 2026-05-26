import { NextResponse } from "next/server";
import * as admin from "firebase-admin";

import { recordRazorpayPaymentLink } from "../payment-link-record";
import { adminDb } from "@/lib/firebase-admin";
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

const PAYMENT_EVENTS = new Set([
  "payment.authorized",
  "payment.captured",
  "payment.failed",
]);

const PAYMENT_LINK_STATUS_EVENTS = new Set([
  "payment_link.partially_paid",
  "payment_link.expired",
  "payment_link.cancelled",
]);

const getPaymentStatus = (event) => {
  if (event === "payment.captured") return "success";
  if (event === "payment.authorized") return "authorized";
  if (event === "payment.failed") return "failed";
  return "pending";
};

const getPaymentLinkStatus = (event) =>
  event.replace("payment_link.", "").replace(/_/g, "_");

const getEffectiveBalance = (period) => {
  const amount = Number(period?.amount || 0);
  const paid = Number(period?.paid || 0);
  const discount = Number(period?.discountAmount || 0);

  return Math.max(amount - paid - discount, 0);
};

const findOrderTransaction = async (orderId) => {
  if (!orderId) return null;

  const orderSnap = await adminDb.collection("razorpayOrders").doc(orderId).get();

  if (!orderSnap.exists) return null;

  const orderData = orderSnap.data() || {};
  const paymentRef = orderData.paymentDocPath
    ? adminDb.doc(orderData.paymentDocPath)
    : adminDb
        .collection("teams")
        .doc(orderData.teamId)
        .collection("payments")
        .doc(`razorpay_order_${orderId}`);
  const paymentSnap = await paymentRef.get();

  return {
    ref: paymentRef,
    teamId: orderData.teamId || "",
    data: {
      ...orderData,
      ...(paymentSnap.exists ? paymentSnap.data() || {} : {}),
    },
  };
};

const recordRazorpayOrderPayment = async ({ event, payment, context = {} }) => {
  const orderId = payment?.order_id || context.razorpayOrderId || "";
  const orderTransaction = await findOrderTransaction(orderId);
  const notes = {
    ...(orderTransaction?.data || {}),
    ...context,
    ...(payment?.notes || {}),
  };
  const teamId = notes.teamId || "";
  const memberId = notes.memberId || "";
  const periodId = notes.periodId || "";
  const paymentId = payment?.id || context.razorpayPaymentId || "";

  if (!teamId || !memberId || !periodId || (!paymentId && !orderId)) {
    return { ignored: true, reason: "missing payment notes" };
  }

  const status = getPaymentStatus(event);
  const paymentRef =
    orderTransaction?.ref ||
    adminDb
      .collection("teams")
      .doc(teamId)
      .collection("payments")
      .doc(`razorpay_${paymentId || orderId}`);

  if (paymentId) {
    const existingByPaymentId = await adminDb
      .collection("teams")
      .doc(teamId)
      .collection("payments")
      .where("razorpayPaymentId", "==", paymentId)
      .limit(1)
      .get();

    if (
      !existingByPaymentId.empty &&
      existingByPaymentId.docs[0].ref.path !== paymentRef.path
    ) {
      return { success: true, duplicate: true };
    }
  }

  const periodRef = adminDb
    .collection("teams")
    .doc(teamId)
    .collection("members")
    .doc(memberId)
    .collection("billingPeriods")
    .doc(periodId);
  const memberRef = adminDb
    .collection("teams")
    .doc(teamId)
    .collection("members")
    .doc(memberId);
  const now = admin.firestore.FieldValue.serverTimestamp();
  const paidAmount = Number(payment?.amount || 0) / 100;

  await adminDb.runTransaction(async (transaction) => {
    const paymentSnap = await transaction.get(paymentRef);

    if (paymentSnap.exists) return;

    const [periodSnap, memberSnap] = await Promise.all([
      transaction.get(periodRef),
      transaction.get(memberRef),
    ]);

    const period = periodSnap.exists ? periodSnap.data() || {} : {};
    const member = memberSnap.exists ? memberSnap.data() || {} : {};
    const periodAmount = Number(period.amount || paidAmount || 0);
    const previousPaid = Number(period.paid || 0);
    const previousDiscount = Number(period.discountAmount || 0);
    const currentBalance = getEffectiveBalance(period);
    const shouldSettle = status === "success";
    const payableAmount = shouldSettle
      ? Math.min(paidAmount, currentBalance || paidAmount)
      : 0;
    const newPaid = previousPaid + payableAmount;
    const newBalance = shouldSettle
      ? Math.max(periodAmount - newPaid - previousDiscount, 0)
      : currentBalance;
    const memberName =
      `${member.firstName || ""} ${member.lastName || ""}`.trim() ||
      period.memberName ||
      "";

    if (shouldSettle && periodSnap.exists) {
      transaction.update(periodRef, {
        paid: newPaid,
        balance: newBalance,
        status: newBalance <= 0 ? "settled" : "partial",
        paymentMode: "upi",
        lastPaymentAmount: payableAmount,
        lastPaymentDate: now,
        updatedAt: now,
      });
    }

    transaction.set(paymentRef, {
      teamId,
      memberId,
      memberName,
      periodId,
      period: period.periodLabel || notes.periodLabel || "",
      periodLabel: period.periodLabel || notes.periodLabel || "",
      billingCycle: period.billingCycle || "",
      paymentMode: "upi",
      periodAmount,
      previousPaid,
      previousDiscount,
      paidAmount: payableAmount,
      amount: shouldSettle ? payableAmount : paidAmount,
      discountAmount: 0,
      totalDiscountAmount: previousDiscount,
      balanceAfterPayment: newBalance,
      status,
      source: "razorpay_webhook",
      gateway: "razorpay",
      razorpayOrderId: orderId || null,
      razorpayPaymentId: paymentId,
      failureCode: payment?.error_code || null,
      failureReason: payment?.error_reason || null,
      failureDescription: payment?.error_description || null,
      capturedBy: "Razorpay Webhook",
      createdAt: now,
      updatedAt: now,
    }, { merge: true });

    if (orderId) {
      transaction.set(
        adminDb.collection("razorpayOrders").doc(orderId),
        {
          teamId,
          memberId,
          periodId,
          periodLabel: period.periodLabel || notes.periodLabel || "",
          paymentDocPath: paymentRef.path,
          status,
          razorpayPaymentId: paymentId || null,
          updatedAt: now,
        },
        { merge: true },
      );
    }
  });

  if (status === "success") {
    const periodsSnap = await adminDb
      .collection("teams")
      .doc(teamId)
      .collection("members")
      .doc(memberId)
      .collection("billingPeriods")
      .get();

    const billingSummary = periodsSnap.docs.reduce(
      (summary, docSnap) => {
        const period = docSnap.data();
        const amount = Number(period.amount || 0);
        const paid = Number(period.paid || 0);
        const discount = Number(period.discountAmount || 0);

        return {
          totalPaid: summary.totalPaid + paid,
          totalBalance:
            summary.totalBalance + Math.max(amount - paid - discount, 0),
          totalDiscount: summary.totalDiscount + discount,
        };
      },
      { totalPaid: 0, totalBalance: 0, totalDiscount: 0 },
    );

    await memberRef.set(
      {
        billing: {
          ...billingSummary,
          lastPaymentDate: now,
        },
      },
      { merge: true },
    );
  }

  return { success: true };
};

const recordRazorpayPaymentLinkStatus = async ({ event, paymentLink }) => {
  const notes = paymentLink?.notes || {};
  const teamId = notes.teamId || "";
  const memberId = notes.memberId || "";
  const periodId = notes.periodId || "";
  const paymentLinkId = paymentLink?.id || "";

  if (!teamId || !memberId || !periodId || !paymentLinkId) {
    return { ignored: true, reason: "missing payment link notes" };
  }

  const periodRef = adminDb
    .collection("teams")
    .doc(teamId)
    .collection("members")
    .doc(memberId)
    .collection("billingPeriods")
    .doc(periodId);
  const memberRef = adminDb
    .collection("teams")
    .doc(teamId)
    .collection("members")
    .doc(memberId);
  const paymentRef = adminDb
    .collection("teams")
    .doc(teamId)
    .collection("payments")
    .doc(`${paymentLinkId}_${event}`);
  const now = admin.firestore.FieldValue.serverTimestamp();

  await adminDb.runTransaction(async (transaction) => {
    const paymentSnap = await transaction.get(paymentRef);

    if (paymentSnap.exists) return;

    const [periodSnap, memberSnap] = await Promise.all([
      transaction.get(periodRef),
      transaction.get(memberRef),
    ]);

    const period = periodSnap.exists ? periodSnap.data() || {} : {};
    const member = memberSnap.exists ? memberSnap.data() || {} : {};
    const status = getPaymentLinkStatus(event);
    const periodAmount = Number(period.amount || Number(paymentLink?.amount || 0) / 100 || 0);
    const previousPaid = Number(period.paid || 0);
    const previousDiscount = Number(period.discountAmount || 0);
    const paidAmount = Number(paymentLink?.amount_paid || 0) / 100;
    const memberName =
      `${member.firstName || ""} ${member.lastName || ""}`.trim() ||
      period.memberName ||
      "";

    if (periodSnap.exists) {
      transaction.update(periodRef, {
        razorpayPaymentLink: {
          ...(period.razorpayPaymentLink || {}),
          id: paymentLinkId,
          shortUrl: paymentLink.short_url || period.razorpayPaymentLink?.shortUrl || "",
          referenceId:
            paymentLink.reference_id ||
            period.razorpayPaymentLink?.referenceId ||
            "",
          amount: Number(paymentLink?.amount || 0),
          status,
          updatedAt: now,
        },
        updatedAt: now,
      });
    }

    transaction.set(paymentRef, {
      memberId,
      memberName,
      periodId,
      period: period.periodLabel || "",
      periodLabel: period.periodLabel || "",
      billingCycle: period.billingCycle || "",
      paymentMode: "upi",
      periodAmount,
      previousPaid,
      previousDiscount,
      paidAmount,
      amount: paidAmount || Number(paymentLink?.amount || 0) / 100,
      discountAmount: 0,
      totalDiscountAmount: previousDiscount,
      balanceAfterPayment: getEffectiveBalance(period),
      status,
      source: "razorpay_payment_link",
      gateway: "razorpay",
      razorpayPaymentLinkId: paymentLinkId,
      razorpayPaymentLinkReferenceId: paymentLink.reference_id || "",
      capturedBy: "Razorpay Payment Link Webhook",
      createdAt: now,
    });
  });

  return { success: true };
};

export async function POST(req) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature") || "";
    const payload = JSON.parse(rawBody);
    const event = payload.event || "";
    const paymentLink = payload?.payload?.payment_link?.entity;
    const payment = payload?.payload?.payment?.entity;
    const orderTransaction = payment?.order_id
      ? await findOrderTransaction(payment.order_id)
      : null;
    const notes = {
      ...(orderTransaction?.data || {}),
      ...(paymentLink?.notes || {}),
      ...(payment?.notes || {}),
    };
    const teamId = notes.teamId || orderTransaction?.teamId || "";

    if (!teamId) {
      return NextResponse.json({ success: true, ignored: true });
    }

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

    if (event === "payment_link.paid") {
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
    }

    if (PAYMENT_LINK_STATUS_EVENTS.has(event)) {
      const result = await recordRazorpayPaymentLinkStatus({
        event,
        paymentLink,
      });

      return NextResponse.json(result);
    }

    if (PAYMENT_EVENTS.has(event)) {
      const result = await recordRazorpayOrderPayment({
        event,
        payment,
        context: {
          ...notes,
          teamId,
        },
      });

      return NextResponse.json(result);
    }

    if (!event.startsWith("payment.") && !event.startsWith("payment_link.")) {
      return NextResponse.json({ success: true, ignored: true });
    }

    return NextResponse.json({ success: true, ignored: true });
  } catch (error) {
    console.error("Razorpay payment link webhook error:", error);

    return NextResponse.json(
      { error: error.message || "Failed to process Razorpay webhook" },
      { status: 500 },
    );
  }
}
