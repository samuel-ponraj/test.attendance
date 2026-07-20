import { adminDb } from "@/lib/firebase-admin";

export const assertTeamUnlockedByPlan = async (teamId) => {
  if (!teamId) {
    const error = new Error("Team id is required");
    error.statusCode = 400;
    throw error;
  }

  const teamSnap = await adminDb.collection("teams").doc(teamId).get();

  if (!teamSnap.exists) {
    const error = new Error("Team not found");
    error.statusCode = 404;
    throw error;
  }

  const team = { id: teamSnap.id, ...teamSnap.data() };
  return { team };
};
