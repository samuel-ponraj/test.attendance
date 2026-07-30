export const runtime = "nodejs";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { assertTeamUnlockedByPlan } from "@/lib/server-team-access";
import { getTokenFromRequest } from "@/lib/bos-admin";

async function getAuthenticatedMember(req) {
  const token = getTokenFromRequest(req);
  if (!token) {
    const error = new Error("Authentication required");
    error.statusCode = 401;
    throw error;
  }

  let decoded;
  try {
    decoded = await adminAuth.verifyIdToken(token);
  } catch {
    const error = new Error("Invalid authentication token");
    error.statusCode = 401;
    throw error;
  }

  const email = String(decoded.email || "").trim().toLowerCase();
  const mappingSnap = await adminDb.collection("allMembers").doc(email).get();
  if (!mappingSnap.exists || mappingSnap.data().memberId !== decoded.uid) {
    const error = new Error("Member access denied");
    error.statusCode = 403;
    throw error;
  }

  const mapping = mappingSnap.data();
  const memberSnap = await adminDb
    .collection("teams").doc(mapping.teamId)
    .collection("members").doc(decoded.uid).get();
  if (!memberSnap.exists) {
    const error = new Error("Member record not found");
    error.statusCode = 403;
    throw error;
  }

  const teamSnap = await adminDb.collection("teams").doc(mapping.teamId).get();
  const memberData = memberSnap.data();
  const teamMode = teamSnap.data()?.defaultAttendanceMode === "managed" ? "managed" : "self";
  const memberMode = memberData.attendanceMode;
  const effectiveMode = memberMode === "self" || memberMode === "managed" ? memberMode : teamMode;
  if (effectiveMode !== "self") {
    const error = new Error("Your attendance is managed by an administrator or manager");
    error.statusCode = 403;
    throw error;
  }

  return { ...memberData, id: decoded.uid, teamId: mapping.teamId, teamData: teamSnap.data() || {} };
}

async function getAuthenticatedManager(req, teamId) {
  const token = getTokenFromRequest(req);
  if (!token) {
    const error = new Error("Authentication required");
    error.statusCode = 401;
    throw error;
  }

  let decoded;
  try {
    decoded = await adminAuth.verifyIdToken(token);
  } catch {
    const error = new Error("Invalid authentication token");
    error.statusCode = 401;
    throw error;
  }

  const managerSnap = await adminDb
    .collection("teams").doc(teamId)
    .collection("members").doc(decoded.uid).get();

  if (!managerSnap.exists || managerSnap.data()?.role !== "manager") {
    const error = new Error("Manager access denied");
    error.statusCode = 403;
    throw error;
  }

  return { id: decoded.uid, ...managerSnap.data() };
}

function validateAttendanceLocation(teamData, location) {
  const config = teamData?.attendanceLocation;
  if (!config || config.enabled !== true) return null;

  const targetLat = Number(config.latitude);
  const targetLng = Number(config.longitude);
  const radiusMeters = Number(config.radiusMeters);
  const latitude = Number(location?.latitude ?? location?.lat);
  const longitude = Number(location?.longitude ?? location?.lng);
  const accuracy = Number(location?.accuracy);

  if (![targetLat, targetLng, radiusMeters].every(Number.isFinite) || radiusMeters <= 0) return null;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    const error = new Error("A valid device location is required to mark attendance");
    error.statusCode = 400;
    throw error;
  }

  const toRadians = (degrees) => degrees * Math.PI / 180;
  const latDelta = toRadians(latitude - targetLat);
  const lngDelta = toRadians(longitude - targetLng);
  const a = Math.sin(latDelta / 2) ** 2 +
    Math.cos(toRadians(targetLat)) * Math.cos(toRadians(latitude)) * Math.sin(lngDelta / 2) ** 2;
  const distanceMeters = 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  if (distanceMeters > radiusMeters) {
    const error = new Error(`You are approximately ${Math.round(distanceMeters)} m from the attendance location. You must be within ${Math.round(radiusMeters)} m.`);
    error.statusCode = 403;
    throw error;
  }

  return {
    latitude,
    longitude,
    accuracy: Number.isFinite(accuracy) ? accuracy : null,
    distanceMeters: Number(distanceMeters.toFixed(1)),
  };
}

function assertValidDateKey(dateKey) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateKey || ""))) {
    const error = new Error("Invalid attendance date");
    error.statusCode = 400;
    throw error;
  }

  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  if (dateKey !== today) {
    const error = new Error("Members can mark attendance only for today");
    error.statusCode = 403;
    throw error;
  }
}

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
    if (data.status === "present" || data.status === "paid_leave") present++;
    else if (data.status === "halfday") halfday++;
    else if (data.status === "absent" || data.status === "unpaid_leave") absent++;
  });

  await teamRef.set(
    {
      attendanceSummary: {
        present,
        halfday,
        absent,
        dateKey,
        updatedAt: FieldValue.serverTimestamp(),
      },
    },
    { merge: true }
  );
}

export async function POST(req) {
  try {
    const { dateKey, location } = await req.json();
    assertValidDateKey(dateKey);
    const member = await getAuthenticatedMember(req);
    const verifiedLocation = validateAttendanceLocation(member.teamData, location);

    await assertTeamUnlockedByPlan(member.teamId);

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
      deviceInfo: { source: "web", version: null },
      location: verifiedLocation,
    };

    await punchRef.set(data);
    await updateTeamSummary(member.teamId, dateKey);
    return NextResponse.json({ message: "Punched In", data });
  } catch (error) {
    console.error("Punch In Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: error.statusCode || 500 }
    );
  }
}

export async function PATCH(req) {
  try {
    const { dateKey, location } = await req.json();
    assertValidDateKey(dateKey);
    const member = await getAuthenticatedMember(req);
    const verifiedLocation = validateAttendanceLocation(member.teamData, location);

    await assertTeamUnlockedByPlan(member.teamId);

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
      punchOutLocation: verifiedLocation,
      updatedAt: FieldValue.serverTimestamp(),
    });

    await updateTeamSummary(member.teamId, dateKey);

    return NextResponse.json({ message: "Punched Out" });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Punch Out Failed" },
      { status: error.statusCode || 500 }
    );
  }
}

// Manager-marked attendance must update the cached team summary used by the
// admin home and teams pages. Direct client writes only refresh punch listeners.
export async function PUT(req) {
  try {
    const { teamId, dateKey, member, status } = await req.json();
    if (!teamId || !/^\d{4}-\d{2}-\d{2}$/.test(String(dateKey || ""))) {
      const error = new Error("Invalid team or attendance date");
      error.statusCode = 400;
      throw error;
    }
    if (!member?.id || !["present", "absent", "halfday"].includes(status)) {
      const error = new Error("Invalid member or attendance status");
      error.statusCode = 400;
      throw error;
    }

    const manager = await getAuthenticatedManager(req, teamId);
    await assertTeamUnlockedByPlan(teamId);

    const memberSnap = await adminDb
      .collection("teams").doc(teamId)
      .collection("members").doc(member.id).get();
    if (!memberSnap.exists) {
      const error = new Error("Member not found");
      error.statusCode = 404;
      throw error;
    }

    const punchRef = adminDb
      .collection("teams").doc(teamId)
      .collection("attendance").doc(dateKey)
      .collection("punches").doc(member.id);
    const existing = await punchRef.get();
    const now = FieldValue.serverTimestamp();

    await punchRef.set({
      id: member.id,
      firstName: memberSnap.data()?.firstName || "",
      lastName: memberSnap.data()?.lastName || "",
      status,
      entryType: "manager",
      markedBy: manager.id,
      markedAt: now,
      punchIn: existing.exists ? existing.data()?.punchIn ?? null : null,
      punchOut: existing.exists ? existing.data()?.punchOut ?? null : null,
      totalHoursWorked: existing.exists ? existing.data()?.totalHoursWorked ?? 0 : 0,
      ...(!existing.exists ? { createdAt: now } : {}),
      updatedAt: now,
    }, { merge: true });

    await updateTeamSummary(teamId, dateKey);
    return NextResponse.json({ message: "Attendance updated" });
  } catch (error) {
    console.error("Manager attendance update error:", error);
    return NextResponse.json(
      { error: error.message || "Attendance update failed" },
      { status: error.statusCode || 500 }
    );
  }
}
