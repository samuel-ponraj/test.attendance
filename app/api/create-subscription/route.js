<<<<<<< HEAD
import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { adminAuth } from "@/lib/firebase-admin";

export const runtime = "nodejs";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

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
    const planId = process.env.SUBSCRIPTION_PLAN_ID || body.planId;

    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return NextResponse.json(
        { error: "Razorpay credentials are not configured" },
        { status: 500 }
      );
    }

    if (!planId) {
      return NextResponse.json(
        { error: "Razorpay Pro plan id is not configured" },
        { status: 500 }
      );
    }

    const subscription = await razorpay.subscriptions.create({
      plan_id: planId,
      customer_notify: 1,
      total_count: 12,
      notes: {
        userId: decodedToken.uid,
        plan: "pro",
      },
    });

    return NextResponse.json({
      id: subscription.id,
      status: subscription.status,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error("Create subscription error:", err);

    return NextResponse.json(
      { error: err.message || "Failed to create subscription" },
      { status: 500 }
    );
  }
}
=======
import Razorpay from "razorpay";

const razorpay = new Razorpay({
	key_id: process.env.RAZORPAY_KEY_ID,
	key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export async function POST(req) {
	try {
		const body = await req.json();

		const subscription = await razorpay.subscriptions.create({
			plan_id: body.planId,
			customer_notify: 1,
			total_count: 12, 
		});

		return Response.json(subscription);
	} catch (err) {
		return Response.json(
			{ error: err.message },
			{ status: 500 }
		);
	}
}
>>>>>>> 66ba2d6408cd66eceb92585b743e5aabd2b3f3c6
