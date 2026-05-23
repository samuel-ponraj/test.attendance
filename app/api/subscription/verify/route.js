import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import {
  getRazorpayConfigByAdminUserId,
  verifyRazorpaySubscriptionSignatureWithConfig,
} from "@/lib/server-integrations";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : "";

    if (!token) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const decodedToken = await adminAuth.verifyIdToken(token);
    const {
      razorpay_payment_id,
      razorpay_subscription_id,
      razorpay_signature,
      billingCycle = "monthly",
    } = await req.json();

    if (!razorpay_payment_id || !razorpay_subscription_id || !razorpay_signature) {
      return NextResponse.json(
        { error: "Razorpay subscription verification fields are required" },
        { status: 400 }
      );
    }

    const razorpayConfig = await getRazorpayConfigByAdminUserId(decodedToken.uid);

    if (
      !verifyRazorpaySubscriptionSignatureWithConfig({
        paymentId: razorpay_payment_id,
        subscriptionId: razorpay_subscription_id,
        signature: razorpay_signature,
        config: razorpayConfig,
      })
    ) {
      return NextResponse.json(
        { error: "Invalid Razorpay subscription signature" },
        { status: 400 }
      );
    }

    await adminDb.collection("users").doc(decodedToken.uid).set(
      {
        subscription: "pro",
        subscriptionStatus: "active",
        subscriptionBillingCycle: billingCycle,
        razorpaySubscriptionId: razorpay_subscription_id,
        razorpayPaymentId: razorpay_payment_id,
        subscriptionUpdatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Verify subscription error:", err);

    return NextResponse.json(
      { error: err.message || "Failed to verify subscription" },
      { status: 500 }
    );
  }
}
