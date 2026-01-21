import { NextResponse } from "next/server";
import { doc, getDoc, updateDoc, arrayRemove } from "firebase/firestore";
import { db } from "@/lib/firebase";

/* ---------------- GET: Fetch members ---------------- */
export async function GET(req, { params }) {
  const { teamId } = await params;

  if (!teamId) return NextResponse.json({ error: "teamId required" }, { status: 400 });

  const teamRef = doc(db, "teams", teamId);
  const teamSnap = await getDoc(teamRef);

  if (!teamSnap.exists()) return NextResponse.json({ error: "Team not found" }, { status: 404 });

  const teamData = teamSnap.data();

  return NextResponse.json({
    teamId,
    members: teamData.members || [],
  });
}

/* ---------------- DELETE: Remove a member ---------------- */
export async function DELETE(req, context) {
  try {
    // params is a Promise in App Router
    const { params } = context;
    const { teamId } = await params; // ✅ unwrap the promise

    const { memberId } = await req.json(); // must await JSON body

    if (!teamId || !memberId) {
      return NextResponse.json(
        { error: "teamId and memberId required" },
        { status: 400 }
      );
    }

    const teamRef = doc(db, "teams", teamId);
    const teamSnap = await getDoc(teamRef);

    if (!teamSnap.exists()) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    const teamData = teamSnap.data();
    const memberToRemove = teamData.members.find((m) => m.id === memberId);

    if (!memberToRemove) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Remove member from array
    await updateDoc(teamRef, {
      members: arrayRemove(memberToRemove),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to delete member" },
      { status: 500 }
    );
  }
}