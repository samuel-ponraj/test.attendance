import { adminAuth } from "@/lib/firebase-admin";

const DEFAULT_BOS_ADMIN_EMAILS = [
  "jacsam143@gmail.com",
  "jacqulinsamuel143@gmail.com",
];

export const getBosAdminEmails = () =>
  Array.from(
    new Set([
      ...DEFAULT_BOS_ADMIN_EMAILS,
      ...String(process.env.BOS_ADMIN_EMAILS || "")
        .split(",")
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean),
    ])
  );

export const isBosAdminEmail = (email = "") =>
  getBosAdminEmails().includes(String(email).trim().toLowerCase());

export const getTokenFromRequest = (req) => {
  const authHeader = req.headers.get("authorization") || "";

  if (authHeader.startsWith("Bearer ")) {
    return authHeader.slice("Bearer ".length);
  }

  return req.cookies.get("session")?.value || "";
};

export const requireBosAdmin = async (req) => {
  const token = getTokenFromRequest(req);

  if (!token) {
    return { error: "Authentication required", status: 401 };
  }

  let decoded;

  try {
    decoded = await adminAuth.verifyIdToken(token);
  } catch {
    return { error: "Invalid authentication token", status: 401 };
  }

  if (!isBosAdminEmail(decoded.email)) {
    return { error: "BOS access denied", status: 403 };
  }

  return {
    uid: decoded.uid,
    email: decoded.email || "",
  };
};
