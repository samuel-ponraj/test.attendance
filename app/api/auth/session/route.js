import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { isBosAdminEmail } from "@/lib/bos-admin";

export async function POST(req) {
  const { token } = await req.json();

  try {
    const decoded = await adminAuth.verifyIdToken(token);

    const uid = decoded.uid;
    const email = String(decoded.email || "").trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ error: "No email found in auth token" }, { status: 403 });
    }

    let role = isBosAdminEmail(email) ? "bos" : null;

    // Firestore rules cannot read server environment variables. Mirror verified
    // BOS identities into a server-managed collection used only for authorization.
    if (role === "bos") {
      await adminDb.collection("bosAdmins").doc(uid).set({
        email,
        role: "bos",
        updatedAt: new Date(),
      }, { merge: true });
    }

    if (!role) {
      const adminDoc = await adminDb.collection("users").doc(uid).get();
      if (adminDoc.exists) role = "admin";
    }

    if (!role) {
      const memberDoc = await adminDb.collection("allMembers").doc(email).get();
      if (memberDoc.exists) role = "member";
    }

    if (!role) {
      return NextResponse.json({ error: "No role found" }, { status: 403 });
    }

    const cookieStore = await cookies();

    cookieStore.set("session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    cookieStore.set("role", role, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    return NextResponse.json({ success: true, role });

  } catch (err) {
    console.error("FIREBASE ADMIN ERROR:", err);
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
}

export async function DELETE() {
  const cookieStore = await cookies();

  cookieStore.delete("session");
  cookieStore.delete("role");

  return NextResponse.json({ success: true });
}
