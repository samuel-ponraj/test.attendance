import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import {
  getRazorpayConfigByAdminUserId,
  getRazorpayInstanceFromConfig,
} from "@/lib/server-integrations";

export const runtime = "nodejs";

const getRazorpayErrorMessage = (err) =>
  err?.error?.description ||
  err?.error?.reason ||
  err?.description ||
  err?.message ||
  "Failed to cancel subscription";

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
    const userRef = adminDb.collection("users").doc(decodedToken.uid);
    const userSnap = await userRef.get();
    const userData = userSnap.exists ? userSnap.data() || {} : {};
    const subscriptionId = userData.razorpaySubscriptionId;

    if (!subscriptionId) {
      return NextResponse.json(
        { error: "No active Razorpay subscription was found" },
        { status: 400 }
      );
    }

    const razorpayConfig = await getRazorpayConfigByAdminUserId(decodedToken.uid);
    const razorpay = getRazorpayInstanceFromConfig(razorpayConfig);
    const cancelledSubscription = await razorpay.subscriptions.cancel(
      subscriptionId,
      false
    );

    await userRef.set(
      {
        subscription: "basic",
        subscriptionStatus: "cancelled",
        razorpaySubscriptionStatus: cancelledSubscription.status || "cancelled",
        subscriptionCancelledAt: FieldValue.serverTimestamp(),
        subscriptionUpdatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return NextResponse.json({
      success: true,
      status: cancelledSubscription.status || "cancelled",
    });
  } catch (err) {
    console.error("Cancel subscription error:", err);

    return NextResponse.json(
      { error: getRazorpayErrorMessage(err) },
      { status: err?.statusCode || 500 }
    );
  }
}
