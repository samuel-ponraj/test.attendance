import crypto from "crypto";
import Razorpay from "razorpay";
import { adminDb } from "@/lib/firebase-admin";

const getTeamAdminUserId = async (teamId) => {
  if (!teamId) return "";

  const teamSnap = await adminDb.collection("teams").doc(teamId).get();
  return teamSnap.exists ? teamSnap.data()?.admin?.userId || "" : "";
};

export const getIntegrationSettingsByTeamId = async (teamId) => {
  const adminUserId = await getTeamAdminUserId(teamId);

  if (!adminUserId) return {};

  return getIntegrationSettingsByAdminUserId(adminUserId);
};

export const getIntegrationSettingsByAdminUserId = async (adminUserId) => {
  if (!adminUserId) return {};

  const snap = await adminDb
    .collection("users")
    .doc(adminUserId)
    .collection("private")
    .doc("integrations")
    .get();

  return snap.exists ? snap.data() || {} : {};
};

export const getRazorpayConfigByTeamId = async (teamId) => {
  const settings = await getIntegrationSettingsByTeamId(teamId);
  return settings.razorpayConfig || {};
};

export const getRazorpayConfigByAdminUserId = async (adminUserId) => {
  const settings = await getIntegrationSettingsByAdminUserId(adminUserId);
  return settings.razorpayConfig || {};
};

export const getWhatsappConfigByTeamId = async (teamId) => {
  const settings = await getIntegrationSettingsByTeamId(teamId);
  return settings.whatsappConfig || {};
};

export const getRazorpayInstanceFromConfig = (config = {}) => {
  const keyId = config.keyId;
  const keySecret = config.keySecret;

  if (!keyId || !keySecret) {
    throw new Error("Razorpay credentials are not configured");
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
};

export const getRazorpayKeyIdFromConfig = (config = {}) =>
  config.keyId || "";

export const verifyRazorpaySignatureWithConfig = ({
  orderId,
  paymentId,
  signature,
  config = {},
}) => {
  const keySecret = config.keySecret;

  if (!keySecret) {
    throw new Error("Razorpay secret is not configured");
  }

  const expectedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  return expectedSignature === signature;
};

export const verifyRazorpayWebhookSignatureWithConfig = (
  body,
  signature,
  config = {},
) => {
  const secret = config.webhookSecret;

  if (!secret) {
    throw new Error("Razorpay webhook secret is not configured");
  }

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");

  return expectedSignature === signature;
};

export const verifyRazorpayPaymentLinkSignatureWithConfig = ({
  paymentLinkId,
  paymentLinkReferenceId,
  paymentLinkStatus,
  paymentId,
  signature,
  config = {},
}) => {
  const keySecret = config.keySecret;

  if (!keySecret) {
    throw new Error("Razorpay secret is not configured");
  }

  const payload = `${paymentLinkId}|${paymentLinkReferenceId}|${paymentLinkStatus}|${paymentId}`;
  const expectedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(payload)
    .digest("hex");

  return expectedSignature === signature;
};

export const verifyRazorpaySubscriptionSignatureWithConfig = ({
  paymentId,
  subscriptionId,
  signature,
  config = {},
}) => {
  const keySecret = config.keySecret;

  if (!keySecret) {
    throw new Error("Razorpay secret is not configured");
  }

  const expectedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(`${paymentId}|${subscriptionId}`)
    .digest("hex");

  return expectedSignature === signature;
};
