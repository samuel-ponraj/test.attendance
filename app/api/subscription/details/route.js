import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import {
  getPlatformRazorpayConfig,
  getPlatformRazorpayInstance,
} from "@/lib/server-platform";

export const runtime = "nodejs";

const secondsToMillis = (value) => {
  const seconds = Number(value || 0);
  return seconds > 0 ? seconds * 1000 : 0;
};

export async function GET(req) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : "";

    if (!token) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const decodedToken = await adminAuth.verifyIdToken(token);
    const userRef = adminDb.collection("users").doc(decodedToken.uid);
    const userSnap = await userRef.get();
    const userData = userSnap.exists ? userSnap.data() || {} : {};
    const subscriptionId = userData.razorpaySubscriptionId;

    if (!subscriptionId || userData.subscription !== "pro") {
      return NextResponse.json({
        success: true,
        subscription: null,
      });
    }

    const razorpayConfig = await getPlatformRazorpayConfig();
    const razorpay = getPlatformRazorpayInstance(razorpayConfig);
    const subscription = await razorpay.subscriptions.fetch(subscriptionId);

    return NextResponse.json({
      success: true,
      subscription: {
        id: subscription.id,
        status: subscription.status || "",
        nextPaymentAt: secondsToMillis(subscription.charge_at),
        currentStartAt: secondsToMillis(subscription.current_start),
        currentEndAt: secondsToMillis(subscription.current_end),
        endedAt: secondsToMillis(subscription.ended_at),
        remainingCount: subscription.remaining_count ?? null,
        paidCount: subscription.paid_count ?? null,
      },
    });
  } catch (err) {
    console.error("Subscription details load error:", err);

    return NextResponse.json(
      { error: err.message || "Failed to load subscription details" },
      { status: err?.statusCode || 500 }
    );
  }
}
