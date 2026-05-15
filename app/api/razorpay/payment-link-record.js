import * as admin from "firebase-admin";

import { adminDb } from "@/lib/firebase-admin";
import { getRazorpayInstance } from "@/lib/razorpay";

const getPaymentIdFromLink = (paymentLink, fallbackPaymentId) => {
  if (fallbackPaymentId) return fallbackPaymentId;

  const payments = paymentLink?.payments;

  if (Array.isArray(payments)) {
    return payments[0]?.payment_id || payments[0]?.id || "";
  }

  return payments?.payment_id || payments?.id || "";
};

export const recordRazorpayPaymentLink = async ({
  teamId,
  memberId,
  periodId,
  paymentLinkId,
  paymentLinkReferenceId,
  paymentLinkStatus = "paid",
  paymentId,
}) => {
  if (!teamId || !memberId || !periodId || !paymentLinkId) {
    throw new Error("Payment link recording fields are required");
  }

  const razorpay = getRazorpayInstance();
  const paymentLink = await razorpay.paymentLink.fetch(paymentLinkId);
  const resolvedPaymentId = getPaymentIdFromLink(paymentLink, paymentId);
  const paidAmount =
    Number(paymentLink?.amount_paid || paymentLink?.amount || 0) / 100;

  if (!resolvedPaymentId) {
    throw new Error("Razorpay payment id not found");
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
    .doc(`${paymentLinkId}_${resolvedPaymentId}`);

  await adminDb.runTransaction(async (transaction) => {
    const paymentSnap = await transaction.get(paymentRef);

    if (paymentSnap.exists) return;

    const [periodSnap, memberSnap] = await Promise.all([
      transaction.get(periodRef),
      transaction.get(memberRef),
    ]);

    if (!periodSnap.exists) {
      throw new Error("Billing period not found");
    }

    const period = periodSnap.data() || {};
    const member = memberSnap.exists ? memberSnap.data() || {} : {};
    const periodAmount = Number(period.amount || 0);
    const previousPaid = Number(period.paid || 0);
    const discount = Number(period.discountAmount || 0);
    const currentBalance = Math.max(periodAmount - previousPaid - discount, 0);
    const payableAmount = Math.min(paidAmount, currentBalance || paidAmount);
    const newPaid = previousPaid + payableAmount;
    const newBalance = Math.max(periodAmount - newPaid - discount, 0);
    const newStatus = newBalance <= 0 ? "settled" : "partial";
    const now = admin.firestore.FieldValue.serverTimestamp();
    const memberName =
      `${member.firstName || ""} ${member.lastName || ""}`.trim() ||
      period.memberName ||
      "";

    transaction.update(periodRef, {
      paid: newPaid,
      balance: newBalance,
      status: newStatus,
      paymentMode: "upi",
      lastPaymentAmount: payableAmount,
      totalAmount: payableAmount,
      lastPaymentDate: now,
      updatedAt: now,
      razorpayPaymentLink: {
        ...(period.razorpayPaymentLink || {}),
        id: paymentLinkId,
        shortUrl: paymentLink.short_url || period.razorpayPaymentLink?.shortUrl || "",
        referenceId:
          paymentLinkReferenceId ||
          paymentLink.reference_id ||
          period.razorpayPaymentLink?.referenceId ||
          "",
        amount: Number(paymentLink?.amount || 0),
        status: paymentLinkStatus,
        paymentId: resolvedPaymentId,
        paidAt: now,
      },
    });

    transaction.set(paymentRef, {
      memberId,
      memberName,
      periodId,
      period: period.periodLabel || "",
      periodLabel: period.periodLabel || "",
      billingCycle: period.billingCycle || "",
      paymentMode: "upi",
      amount: payableAmount,
      status: "success",
      source: "razorpay_payment_link",
      gateway: "razorpay",
      razorpayPaymentLinkId: paymentLinkId,
      razorpayPaymentLinkReferenceId:
        paymentLinkReferenceId || paymentLink.reference_id || "",
      razorpayPaymentId: resolvedPaymentId,
      capturedBy: "Razorpay Payment Link",
      createdAt: now,
    });
  });

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
        totalBalance: summary.totalBalance + Math.max(amount - paid - discount, 0),
        totalDiscount: summary.totalDiscount + discount,
      };
    },
    { totalPaid: 0, totalBalance: 0, totalDiscount: 0 },
  );

  await memberRef.set(
    {
      billing: {
        ...billingSummary,
        lastPaymentDate: admin.firestore.FieldValue.serverTimestamp(),
      },
    },
    { merge: true },
  );
};
