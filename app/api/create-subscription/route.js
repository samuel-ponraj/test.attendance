import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import {
  getRazorpayConfigByAdminUserId,
  getRazorpayInstanceFromConfig,
  getRazorpayKeyIdFromConfig,
} from "@/lib/server-integrations";

export const runtime = "nodejs";

const getRazorpayErrorMessage = (err) =>
  err?.error?.description ||
  err?.error?.reason ||
  err?.description ||
  err?.message ||
  "Failed to create subscription";

const BILLING_CYCLES = new Set(["monthly", "yearly"]);

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
    const body = await req.json();
    const razorpayConfig = await getRazorpayConfigByAdminUserId(decodedToken.uid);
    const appPlan = body.plan || "pro";
    const billingCycle = BILLING_CYCLES.has(body.billingCycle)
      ? body.billingCycle
      : "monthly";
    const planId =
      razorpayConfig.subscriptionPlanIds?.[billingCycle] ||
      (billingCycle === "monthly" ? razorpayConfig.subscriptionPlanId : "");

    if (appPlan !== "pro") {
      return NextResponse.json(
        { error: "Only the Pro subscription plan can be purchased" },
        { status: 400 }
      );
    }

    if (!razorpayConfig.enabled) {
      return NextResponse.json(
        { error: "Razorpay integration is not enabled" },
        { status: 500 }
      );
    }

    if (!planId) {
      return NextResponse.json(
        { error: `Razorpay Pro ${billingCycle} plan id is not configured` },
        { status: 500 }
      );
    }

    if (!planId.startsWith("plan_")) {
      return NextResponse.json(
        { error: `Razorpay Pro ${billingCycle} plan id must start with plan_` },
        { status: 500 }
      );
    }

    const razorpay = getRazorpayInstanceFromConfig(razorpayConfig);

    const subscription = await razorpay.subscriptions.create({
      plan_id: planId,
      customer_notify: 1,
      total_count: billingCycle === "yearly" ? 1 : 12,
      notes: {
        userId: decodedToken.uid,
        plan: "pro",
        billingCycle,
      },
    });

    return NextResponse.json({
      id: subscription.id,
      status: subscription.status,
      keyId: getRazorpayKeyIdFromConfig(razorpayConfig),
    });
  } catch (err) {
    console.error("Create subscription error:", err);

    return NextResponse.json(
      { error: getRazorpayErrorMessage(err) },
      { status: err?.statusCode || 500 }
    );
  }
}
