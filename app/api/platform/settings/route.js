import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import {
  getPlatformSettings,
  maskPlatformSettings,
  platformSettingsRef,
} from "@/lib/server-platform";

export const runtime = "nodejs";

export async function GET(req) {
  const platformUser = await requirePlatformAdmin(req);

  if (platformUser.error) {
    return NextResponse.json(
      { error: platformUser.error },
      { status: platformUser.status }
    );
  }

  const settings = await getPlatformSettings();

  return NextResponse.json({
    success: true,
    settings: maskPlatformSettings(settings),
  });
}

export async function PATCH(req) {
  const platformUser = await requirePlatformAdmin(req);

  if (platformUser.error) {
    return NextResponse.json(
      { error: platformUser.error },
      { status: platformUser.status }
    );
  }

  const { razorpay = {}, support = {} } = await req.json();
  const existing = await getPlatformSettings();
  const keySecret = String(razorpay.keySecret || "").trim();
  const nextSettings = {
    razorpay: {
      enabled: Boolean(razorpay.enabled),
      keyId: String(razorpay.keyId || "").trim(),
      keySecret: keySecret || existing.razorpay.keySecret || "",
      currency: String(razorpay.currency || "").trim().toUpperCase() || "INR",
      subscriptionPlanIds: {
        monthly: String(razorpay.subscriptionPlanIds?.monthly || "").trim(),
        yearly: String(razorpay.subscriptionPlanIds?.yearly || "").trim(),
      },
    },
    support: {
      email:
        String(support.email || "").trim() ||
        "contact@kingzdigitalsolutions.in",
    },
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: platformUser.uid,
  };

  await platformSettingsRef().set(nextSettings, { merge: true });

  return NextResponse.json({
    success: true,
    settings: maskPlatformSettings(nextSettings),
  });
}
