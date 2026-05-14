import crypto from "crypto";
import Razorpay from "razorpay";

let razorpayInstance;

export const getRazorpayKeyId = () => process.env.RAZORPAY_KEY_ID || "";

export const getRazorpayInstance = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error("Razorpay credentials are not configured");
  }

  if (!razorpayInstance) {
    razorpayInstance = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
  }

  return razorpayInstance;
};

export const verifyRazorpaySignature = ({
  orderId,
  paymentId,
  signature,
}) => {
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keySecret) {
    throw new Error("Razorpay secret is not configured");
  }

  const expectedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  return expectedSignature === signature;
};
