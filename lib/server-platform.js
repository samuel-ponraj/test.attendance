import Razorpay from "razorpay";
import { adminDb } from "@/lib/firebase-admin";

const defaultPlatformSettings = {
  razorpay: {
    enabled: false,
    keyId: "",
    keySecret: "",
    currency: "INR",
    subscriptionPlanIds: {
      monthly: "",
      yearly: "",
    },
  },
  support: {
    email: "contact@kingzdigitalsolutions.in",
  },
};

export const platformSettingsRef = () =>
  adminDb.collection("platform").doc("settings");

export const normalizePlatformSettings = (settings = {}) => ({
  razorpay: {
    ...defaultPlatformSettings.razorpay,
    ...(settings.razorpay || {}),
    subscriptionPlanIds: {
      ...defaultPlatformSettings.razorpay.subscriptionPlanIds,
      ...(settings.razorpay?.subscriptionPlanIds || {}),
    },
  },
  support: {
    ...defaultPlatformSettings.support,
    ...(settings.support || {}),
  },
});

export const maskPlatformSettings = (settings = {}) => {
  const normalized = normalizePlatformSettings(settings);

  return {
    ...normalized,
    razorpay: {
      ...normalized.razorpay,
      keySecret: "",
      hasKeySecret: Boolean(normalized.razorpay.keySecret),
    },
  };
};

export const getPlatformSettings = async () => {
  const snap = await platformSettingsRef().get();
  return normalizePlatformSettings(snap.exists ? snap.data() : {});
};

export const getPlatformRazorpayConfig = async () => {
  const settings = await getPlatformSettings();
  return settings.razorpay;
};

export const getPlatformRazorpayInstance = (config = {}) => {
  if (!config.keyId || !config.keySecret) {
    throw new Error("Platform Razorpay credentials are not configured");
  }

  return new Razorpay({
    key_id: config.keyId,
    key_secret: config.keySecret,
  });
};
