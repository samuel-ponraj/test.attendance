import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

const defaultWhatsappConfig = {
  enabled: false,
  businessAccountId: "",
  phoneNumberId: "",
  accessToken: "",
  templateName: "",
  templateLanguage: "en_US",
};

const defaultRazorpayConfig = {
  enabled: false,
  accountName: "",
  keyId: "",
  keySecret: "",
  webhookAppUrl: "",
  webhookSecret: "",
  currency: "INR",
};

const getTokenFromRequest = (req) => {
  const authHeader = req.headers.get("authorization") || "";

  if (authHeader.startsWith("Bearer ")) {
    return authHeader.slice("Bearer ".length);
  }

  return req.cookies.get("session")?.value || "";
};

const requireAdminUser = async (req) => {
  const token = getTokenFromRequest(req);

  if (!token) {
    return { error: "Missing auth token", status: 401 };
  }

  let decoded;

  try {
    decoded = await adminAuth.verifyIdToken(token);
  } catch {
    return { error: "Invalid auth token", status: 401 };
  }

  const userRef = adminDb.collection("users").doc(decoded.uid);
  const userSnap = await userRef.get();

  if (!userSnap.exists) {
    return { error: "Admin user not found", status: 403 };
  }

  return {
    uid: decoded.uid,
    email: decoded.email || "",
    integrationsRef: userRef.collection("private").doc("integrations"),
  };
};

const maskConfig = (config = {}) => ({
  whatsappConfig: {
    ...defaultWhatsappConfig,
    ...(config.whatsappConfig || {}),
    accessToken: "",
    hasAccessToken: Boolean(config.whatsappConfig?.accessToken),
  },
  razorpayConfig: {
    ...defaultRazorpayConfig,
    ...(config.razorpayConfig || {}),
    keySecret: "",
    webhookSecret: "",
    hasKeySecret: Boolean(config.razorpayConfig?.keySecret),
    hasWebhookSecret: Boolean(config.razorpayConfig?.webhookSecret),
  },
});

export async function GET(req) {
  try {
    const adminUser = await requireAdminUser(req);

    if (adminUser.error) {
      return NextResponse.json(
        { error: adminUser.error },
        { status: adminUser.status },
      );
    }

    const snap = await adminUser.integrationsRef.get();
    const data = snap.exists ? snap.data() : {};

    return NextResponse.json({
      success: true,
      ...maskConfig(data),
    });
  } catch (error) {
    console.error("Load integrations error:", error);
    return NextResponse.json(
      { error: "Failed to load integration settings" },
      { status: 500 },
    );
  }
}

export async function PATCH(req) {
  try {
    const adminUser = await requireAdminUser(req);

    if (adminUser.error) {
      return NextResponse.json(
        { error: adminUser.error },
        { status: adminUser.status },
      );
    }

    const { type, config = {} } = await req.json();

    if (!["whatsapp", "razorpay"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid integration type" },
        { status: 400 },
      );
    }

    const snap = await adminUser.integrationsRef.get();
    const existing = snap.exists ? snap.data() : {};

    if (type === "whatsapp") {
      const existingWhatsapp = existing.whatsappConfig || {};
      const accessToken = String(config.accessToken || "").trim();

      await adminUser.integrationsRef.set(
        {
          whatsappConfig: {
            enabled: Boolean(config.enabled),
            businessAccountId: String(config.businessAccountId || "").trim(),
            phoneNumberId: String(config.phoneNumberId || "").trim(),
            accessToken: accessToken || existingWhatsapp.accessToken || "",
            templateName: String(config.templateName || "").trim(),
            templateLanguage:
              String(config.templateLanguage || "").trim() || "en_US",
            updatedAt: FieldValue.serverTimestamp(),
            updatedBy: adminUser.uid,
          },
        },
        { merge: true },
      );
    }

    if (type === "razorpay") {
      const existingRazorpay = existing.razorpayConfig || {};
      const keySecret = String(config.keySecret || "").trim();
      const webhookSecret = String(config.webhookSecret || "").trim();

      await adminUser.integrationsRef.set(
        {
          razorpayConfig: {
            enabled: Boolean(config.enabled),
            accountName: String(config.accountName || "").trim(),
            keyId: String(config.keyId || "").trim(),
            keySecret: keySecret || existingRazorpay.keySecret || "",
            webhookAppUrl: String(config.webhookAppUrl || "").trim(),
            webhookSecret:
              webhookSecret || existingRazorpay.webhookSecret || "",
            currency: String(config.currency || "").trim() || "INR",
            updatedAt: FieldValue.serverTimestamp(),
            updatedBy: adminUser.uid,
          },
        },
        { merge: true },
      );
    }

    const updatedSnap = await adminUser.integrationsRef.get();

    return NextResponse.json({
      success: true,
      ...maskConfig(updatedSnap.data() || {}),
    });
  } catch (error) {
    console.error("Save integrations error:", error);
    return NextResponse.json(
      { error: "Failed to save integration settings" },
      { status: 500 },
    );
  }
}
