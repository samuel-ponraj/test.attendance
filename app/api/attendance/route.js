import { adminDb } from "@/lib/firebase-admin";
import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

/* ==========================================
   HELPER: RECALCULATE TEAM SUMMARY
   ========================================== */
async function updateTeamSummary(teamId, dateKey) {
  const teamRef = adminDb.collection("teams").doc(teamId);
  const punchesRef = adminDb
    .collection("teams")
    .doc(teamId)
    .collection("attendance")
    .doc(dateKey)
    .collection("punches");

  const punchesSnap = await punchesRef.get();

  let present = 0;
  let halfday = 0;
  let absent = 0;

  punchesSnap.forEach((doc) => {
    const data = doc.data();
    if (data.status === "present") present++;
    else if (data.status === "halfday") halfday++;
    else if (data.status === "absent") absent++;
  });

  await teamRef.set(
    {
      attendanceSummary: {
        present,
        halfday,
        absent,
        updatedAt: FieldValue.serverTimestamp(),
      },
    },
    { merge: true }
  );
}

export async function POST(req) {
  try {
    const { member, dateKey } = await req.json();

    if (!member?.teamId || !member?.id) {
      return NextResponse.json({ error: "Missing member info" }, { status: 400 });
    }

    const punchRef = adminDb
      .collection("teams")
      .doc(member.teamId)
      .collection("attendance")
      .doc(dateKey)
      .collection("punches")
      .doc(member.id);

    const snap = await punchRef.get();
    if (snap.exists) {
      return NextResponse.json({ error: "Attendance already marked" }, { status: 400 });
    }

    const data = {
      id: member.id,
      firstName: member.firstName || "",
      lastName: member.lastName || "",
      email: member.email || "",
      punchIn: FieldValue.serverTimestamp(),
      punchOut: null,
      totalHoursWorked: 0,
      status: "present", // Initial status
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      entryType: "manual",
      deviceInfo: { platform: "web", version: null },
      location: { lat: null, lng: null },
    };

    await punchRef.set(data);
    await updateTeamSummary(member.teamId, dateKey);
    return NextResponse.json({ message: "Punched In", data });
  } catch (error) {
    console.error("Punch In Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req) {
  try {
    const { member, dateKey } = await req.json();

    const punchRef = adminDb
      .collection("teams")
      .doc(member.teamId)
      .collection("attendance")
      .doc(dateKey)
      .collection("punches")
      .doc(member.id);

    const snap = await punchRef.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "No punch-in found" }, { status: 404 });
    }

    const data = snap.data();
    const now = new Date();
    const punchInTime = data.punchIn.toDate();
    const hours = (now - punchInTime) / 3600000;

    const teamRef = adminDb.collection("teams").doc(member.teamId);
    const teamSnap = await teamRef.get();
    const totalShiftHours = teamSnap.data()?.totalShiftHours || 8;

    let status = "absent";
    if (hours >= totalShiftHours) status = "present";
    else if (hours > totalShiftHours / 2) status = "halfday";

    await punchRef.update({
      punchOut: FieldValue.serverTimestamp(),
      totalHoursWorked: Number(hours.toFixed(2)),
      status,
      updatedAt: FieldValue.serverTimestamp(),
    });

    await updateTeamSummary(member.teamId, dateKey);

    return NextResponse.json({ message: "Punched Out" });
  } catch (error) {
    return NextResponse.json({ error: "Punch Out Failed" }, { status: 500 });
  }
}