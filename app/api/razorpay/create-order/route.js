import { NextResponse } from "next/server";
import * as admin from "firebase-admin";

import { adminDb } from "@/lib/firebase-admin";
import {
  getRazorpayConfigByTeamId,
  getRazorpayInstanceFromConfig,
  getRazorpayKeyIdFromConfig,
} from "@/lib/server-integrations";
import { assertTeamUnlockedByPlan } from "@/lib/server-team-access";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const { amount, receipt, notes } = await req.json();
    const numericAmount = Number(amount || 0);
    const teamId = notes?.teamId || "";

    if (!numericAmount || numericAmount <= 0) {
      return NextResponse.json(
        { error: "Valid amount is required" },
        { status: 400 },
      );
    }

    await assertTeamUnlockedByPlan(teamId);

    const razorpayConfig = await getRazorpayConfigByTeamId(teamId);
    const razorpay = getRazorpayInstanceFromConfig(razorpayConfig);
    const order = await razorpay.orders.create({
      amount: Math.round(numericAmount * 100),
      currency: razorpayConfig.currency || "INR",
      receipt: String(receipt || `kda_${Date.now()}`).slice(0, 40),
      notes: notes || {},
    });

    if (teamId && notes?.memberId && notes?.periodId) {
      const now = admin.firestore.FieldValue.serverTimestamp();
      const memberRef = adminDb
        .collection("teams")
        .doc(teamId)
        .collection("members")
        .doc(notes.memberId);
      const periodRef = memberRef
        .collection("billingPeriods")
        .doc(notes.periodId);
      const [memberSnap, periodSnap] = await Promise.all([
        memberRef.get(),
        periodRef.get(),
      ]);
      const member = memberSnap.exists ? memberSnap.data() || {} : {};
      const period = periodSnap.exists ? periodSnap.data() || {} : {};
      const discount = Number(period.discountAmount || 0);
      const paid = Number(period.paid || 0);
      const periodAmount = Number(period.amount || numericAmount || 0);

      await adminDb
        .collection("teams")
        .doc(teamId)
        .collection("payments")
        .doc(`razorpay_order_${order.id}`)
        .set(
          {
            memberId: notes.memberId,
            memberName:
              `${member.firstName || ""} ${member.lastName || ""}`.trim() ||
              period.memberName ||
              "",
            periodId: notes.periodId,
            period: period.periodLabel || notes.periodLabel || "",
            periodLabel: period.periodLabel || notes.periodLabel || "",
            billingCycle: period.billingCycle || "",
            paymentMode: "upi",
            periodAmount,
            previousPaid: paid,
            previousDiscount: discount,
            paidAmount: 0,
            amount: numericAmount,
            discountAmount: 0,
            totalDiscountAmount: discount,
            balanceAfterPayment: Math.max(periodAmount - paid - discount, 0),
            status: "created",
            source: "razorpay_order",
            gateway: "razorpay",
            razorpayOrderId: order.id,
            capturedBy: "Razorpay Checkout",
            createdAt: now,
            updatedAt: now,
          },
          { merge: true },
        );

      await adminDb.collection("razorpayOrders").doc(order.id).set(
        {
          teamId,
          memberId: notes.memberId,
          periodId: notes.periodId,
          periodLabel: period.periodLabel || notes.periodLabel || "",
          paymentDocPath: `teams/${teamId}/payments/razorpay_order_${order.id}`,
          amount: numericAmount,
          status: "created",
          createdAt: now,
          updatedAt: now,
        },
        { merge: true },
      );
    }

    return NextResponse.json({
      success: true,
      keyId: getRazorpayKeyIdFromConfig(razorpayConfig),
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (error) {
    console.error("Razorpay create order error:", error);

    return NextResponse.json(
      { error: error.message || "Failed to create Razorpay order" },
      { status: error.statusCode || 500 },
    );
  }
}
