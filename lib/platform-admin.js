import { adminAuth } from "@/lib/firebase-admin";

const DEFAULT_PLATFORM_ADMIN_EMAILS = [
  "jacsam143@gmail.com",
  "jacqulinsamuel143@gmail.com",
];

export const getPlatformAdminEmails = () =>
  Array.from(
    new Set([
      ...DEFAULT_PLATFORM_ADMIN_EMAILS,
      ...String(process.env.PLATFORM_ADMIN_EMAILS || "")
        .split(",")
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean),
    ])
  );

export const isPlatformAdminEmail = (email = "") =>
  getPlatformAdminEmails().includes(String(email).trim().toLowerCase());

export const getTokenFromRequest = (req) => {
  const authHeader = req.headers.get("authorization") || "";

  if (authHeader.startsWith("Bearer ")) {
    return authHeader.slice("Bearer ".length);
  }

  return req.cookies.get("session")?.value || "";
};

export const requirePlatformAdmin = async (req) => {
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

  if (!isPlatformAdminEmail(decoded.email)) {
    return { error: "Platform access denied", status: 403 };
  }

  return {
    uid: decoded.uid,
    email: decoded.email || "",
  };
};
