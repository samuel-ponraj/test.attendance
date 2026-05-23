import { adminDb } from "@/lib/firebase-admin";
import { getPlan, PLAN_IDS } from "@/lib/subscriptionPlans";
import { isTeamLockedByPlan } from "@/lib/team-access";

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
  const adminUserId = team.admin?.userId || "";

  if (!adminUserId) {
    const error = new Error("Team owner is not configured");
    error.statusCode = 403;
    throw error;
  }

  const userSnap = await adminDb.collection("users").doc(adminUserId).get();
  const subscription = userSnap.exists
    ? userSnap.data()?.subscription || PLAN_IDS.BASIC
    : PLAN_IDS.BASIC;
  const plan = getPlan(subscription);
  const teamsSnap = await adminDb
    .collection("teams")
    .where("admin.userId", "==", adminUserId)
    .get();
  const teams = teamsSnap.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  }));

  if (isTeamLockedByPlan(teams, teamId, plan.limits.teams)) {
    const error = new Error(
      `This team is locked by the ${plan.name} plan. Upgrade to view or manage it.`
    );
    error.statusCode = 403;
    throw error;
  }

  return { team, plan };
};
