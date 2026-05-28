import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { verifyRazorpaySubscriptionSignatureWithConfig } from "@/lib/server-integrations";
import { getPlatformRazorpayConfig } from "@/lib/server-platform";
import {
  BILLING_CYCLES,
  SUBSCRIPTION_PLANS,
  getBillingOption,
} from "@/lib/subscriptionPlans";

export const runtime = "nodejs";

const parsePlanAmount = (price = "") =>
  Number(String(price).replace(/[^\d.]/g, "")) || 0;

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

    const razorpayConfig = await getPlatformRazorpayConfig();

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

    const proPlan = SUBSCRIPTION_PLANS.find((plan) => plan.id === "pro");
    const safeBillingCycle = Object.values(BILLING_CYCLES).includes(billingCycle)
      ? billingCycle
      : BILLING_CYCLES.MONTHLY;
    const selectedBilling = getBillingOption(proPlan, safeBillingCycle);
    const subscriptionAmount = parsePlanAmount(selectedBilling?.price);
    const userRef = adminDb.collection("users").doc(decodedToken.uid);
    const transactionRef = userRef
      .collection("subscriptionTransactions")
      .doc(razorpay_payment_id);

    await userRef.set(
      {
        subscription: "pro",
        subscriptionStatus: "active",
        subscriptionBillingCycle: safeBillingCycle,
        razorpaySubscriptionId: razorpay_subscription_id,
        razorpayPaymentId: razorpay_payment_id,
        subscriptionStartedAt: FieldValue.serverTimestamp(),
        subscriptionUpdatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    await transactionRef.set(
      {
        plan: "pro",
        planName: proPlan?.name || "Pro",
        billingCycle: safeBillingCycle,
        amount: subscriptionAmount,
        currency: "INR",
        status: "success",
        paymentMode: "razorpay",
        razorpayPaymentId: razorpay_payment_id,
        razorpaySubscriptionId: razorpay_subscription_id,
        createdAt: FieldValue.serverTimestamp(),
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
