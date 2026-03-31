import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export async function POST(req) {
  const { token } = await req.json();

  try {
    const decoded = await adminAuth.verifyIdToken(token);

    const uid = decoded.uid;
    const email = decoded.email.toLowerCase();

    let role = null;

    const adminDoc = await adminDb.collection("users").doc(uid).get();
    if (adminDoc.exists) role = "admin";

    if (!role) {
      const memberDoc = await adminDb.collection("allMembers").doc(email).get();
      if (memberDoc.exists) role = "member";
    }

    if (!role) {
      const pendingDoc = await adminDb.collection("pendingMembers").doc(uid).get();
      if (pendingDoc.exists) role = "pending";
    }

    if (!role) {
      return NextResponse.json({ error: "No role found" }, { status: 403 });
    }

    // ✅ FIX HERE
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