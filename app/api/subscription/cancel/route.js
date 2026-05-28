import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import {
  getPlatformRazorpayConfig,
  getPlatformRazorpayInstance,
} from "@/lib/server-platform";

export const runtime = "nodejs";

const getRazorpayErrorMessage = (err) =>
  err?.error?.description ||
  err?.error?.reason ||
  err?.description ||
  err?.message ||
  "Failed to cancel subscription";

const isAlreadyInactiveSubscriptionError = (err) => {
  const message = getRazorpayErrorMessage(err).toLowerCase();

  return (
    message.includes("not cancellable") &&
    ["completed", "cancelled", "canceled", "expired"].some((status) =>
      message.includes(status)
    )
  );
};

const downgradeToBasic = async (userRef, razorpayStatus = "cancelled") => {
  await userRef.set(
    {
      subscription: "basic",
      subscriptionStatus: "cancelled",
      razorpaySubscriptionStatus: razorpayStatus,
      razorpaySubscriptionId: FieldValue.delete(),
      subscriptionBillingCycle: FieldValue.delete(),
      subscriptionCancelledAt: FieldValue.serverTimestamp(),
      subscriptionUpdatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
};

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
      if (userData.subscription === "pro") {
        await downgradeToBasic(userRef, "missing_subscription_id");

        return NextResponse.json({
          success: true,
          status: "cancelled",
          localOnly: true,
        });
      }

      return NextResponse.json(
        { error: "No active Razorpay subscription was found" },
        { status: 400 }
      );
    }

    const razorpayConfig = await getPlatformRazorpayConfig();
    const razorpay = getPlatformRazorpayInstance(razorpayConfig);
    let cancelledSubscription = null;

    try {
      cancelledSubscription = await razorpay.subscriptions.cancel(
        subscriptionId,
        false
      );
    } catch (razorpayError) {
      if (!isAlreadyInactiveSubscriptionError(razorpayError)) {
        throw razorpayError;
      }

      await downgradeToBasic(userRef, getRazorpayErrorMessage(razorpayError));

      return NextResponse.json({
        success: true,
        status: "cancelled",
        localOnly: true,
      });
    }

    await downgradeToBasic(
      userRef,
      cancelledSubscription.status || "cancelled"
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
