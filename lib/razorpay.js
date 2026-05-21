import crypto from "crypto";
import Razorpay from "razorpay";

let razorpayInstance;
let cachedKeyId;

export const getRazorpayKeyId = (config = {}) => config.keyId || "";

export const getRazorpayInstance = (config = {}) => {
  const keyId = config.keyId;
  const keySecret = config.keySecret;

  if (!keyId || !keySecret) {
    throw new Error("Razorpay credentials are not configured");
  }

  if (!razorpayInstance || cachedKeyId !== keyId) {
    razorpayInstance = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
    cachedKeyId = keyId;
  }

  return razorpayInstance;
};

export const verifyRazorpaySignature = ({
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

export const verifyRazorpayPaymentLinkSignature = ({
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
