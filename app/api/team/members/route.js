export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { getTokenFromRequest } from "@/lib/bos-admin";

export async function POST(req) {
  let uid = null;
  try {
    const token = getTokenFromRequest(req);
    if (!token) throw Object.assign(new Error("Authentication required"), { statusCode: 401 });
    const caller = await adminAuth.verifyIdToken(token);
    const data = await req.json();
    const teamId = String(data.teamId || "");
    const email = String(data.email || "").trim().toLowerCase();
    const firstName = String(data.firstName || "").trim();
    const lastName = String(data.lastName || "").trim();
    if (!teamId || !firstName || !lastName || !/^\S+@\S+\.\S+$/.test(email)) {
      throw Object.assign(new Error("Enter a valid name and email"), { statusCode: 400 });
    }

    const teamRef = adminDb.collection("teams").doc(teamId);
    const [teamSnap, memberSnap] = await Promise.all([
      teamRef.get(),
      teamRef.collection("members").doc(caller.uid).get(),
    ]);
    const isOwner = teamSnap.exists && teamSnap.data()?.admin?.userId === caller.uid;
    const isManager = memberSnap.exists && memberSnap.data()?.role === "manager";
    if (!isOwner && !isManager) throw Object.assign(new Error("Team access denied"), { statusCode: 403 });

    const user = await adminAuth.createUser({ email, password: "123456", displayName: `${firstName} ${lastName}` });
    uid = user.uid;
    const attendanceMode = ["self", "managed"].includes(data.attendanceMode) ? data.attendanceMode : undefined;
    const member = {
      id: uid, firstName, lastName, email, role: "member",
      contact: String(data.contact || "").trim(), customData: data.customData || {},
      createdAt: FieldValue.serverTimestamp(),
      billing: { totalPaid: 0, totalPending: 0, billingStartDate: FieldValue.serverTimestamp(), lastPaymentDate: null, isOverdue: false, periods: [] },
      ...(attendanceMode ? { attendanceMode } : {}),
    };
    const batch = adminDb.batch();
    batch.set(adminDb.collection("teams").doc(teamId).collection("members").doc(uid), member);
    batch.set(adminDb.collection("allMembers").doc(email), { teamId, email, memberId: uid, role: "member" });
    batch.update(teamRef, { totalMembers: FieldValue.increment(1) });
    await batch.commit();
    return NextResponse.json({ uid }, { status: 201 });
  } catch (error) {
    if (uid) await adminAuth.deleteUser(uid).catch(() => {});
    console.error("Manager member creation failed:", error);
    return NextResponse.json({ error: error.message || "Failed to add member" }, { status: error.statusCode || 500 });
  }
}
