"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthContext"; 
import { 
  collection, 
  doc, 
  onSnapshot, 
  query, 
  serverTimestamp, 
  where, 
  runTransaction, 
  increment 
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getDateKey } from "@/lib/DateKey";
import { createPlanLimitError, getPlan, PLAN_IDS } from "@/lib/subscriptionPlans";
import { splitTeamsByPlanLimit } from "@/lib/team-access";

const TeamsContext = createContext(null);

export function TeamsProvider({ children }) {

  const { user } = useAuth();
  const [allTeams, setAllTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState('basic'); 
  
  const plan = getPlan(subscription);
  const planLimits = plan.limits;
  const TEAM_LIMIT = planLimits.teams;
  const { unlockedTeams: teams, lockedTeams } = useMemo(
    () => splitTeamsByPlanLimit(allTeams, TEAM_LIMIT),
    [allTeams, TEAM_LIMIT]
  );
  const hasReachedTeamLimit = allTeams.length >= TEAM_LIMIT;

  useEffect(() => {
    if (!user?.uid) {
      queueMicrotask(() => {
        setAllTeams([]);
        setSubscription('basic');
        setLoading(false);
      });
      return;
    }

    // 1. Listen to the User Document for subscription changes
    const userDocRef = doc(db, "users", user.uid);
    const unsubUser = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        // Fallback to 'basic' if field is missing
      setSubscription(data.subscription || PLAN_IDS.BASIC);
      }
    });

    // 2. Listen to the Teams Collection
    const q = query(
      collection(db, "teams"),
      where("admin.userId", "==", user.uid)
    );

    const unsubTeams = onSnapshot(q, (snapshot) => {
      const teamsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setAllTeams(teamsData);
      setLoading(false);
    }, (error) => {
      console.error("Firestore Teams Error:", error);
      setLoading(false);
    });

    return () => {
      unsubUser();
      unsubTeams();
    };
  }, [user?.uid]);

  const addTeam = async ({
  name,
  description,
  ownerName,
}) => {
  if (!user) return;

  if (hasReachedTeamLimit) {
    throw createPlanLimitError(
      `Your ${plan.name} plan allows up to ${TEAM_LIMIT} teams. Upgrade to Pro to add more.`
    );
  }

  try {
    const todayKey = getDateKey(new Date());

    const newTeamId = await runTransaction(db, async (transaction) => {
      const userRef = doc(db, "users", user.uid);
      const userSnap = await transaction.get(userRef);

      if (!userSnap.exists()) {
        throw new Error("User profile not found!");
      }

      const userData = userSnap.data();
      const currentCount = userData.teamCount || 0;
      const currentSub = userData.subscription || PLAN_IDS.BASIC;
      const currentPlan = getPlan(currentSub);
      const currentTeamLimit = currentPlan.limits.teams;

      if (currentCount >= currentTeamLimit) {
        throw createPlanLimitError(
          `Your ${currentPlan.name} plan allows up to ${currentTeamLimit} teams.`
        );
      }

      const teamDocRef = doc(collection(db, "teams"));

      transaction.set(teamDocRef, {
        name,
        description: description || "",
        ownerName,
        admin: {
          email: user.email,
          userId: user.uid,
        },
        createdAt: serverTimestamp(),
        totalMembers: 0,
        attendanceSummary: {
          present: 0,
          absent: 0,
          halfday: 0,
          dateKey: todayKey,
        },
      });

      transaction.update(userRef, {
        teamCount: increment(1),
      });

      return teamDocRef.id;
    });

    return { success: true, id: newTeamId };
  } catch (err) {
    console.error("Add Team Error:", err);
    throw err;
  }
};



  return (
    <TeamsContext.Provider
      value={{
        teams,
        allTeams,
        lockedTeams,
        loading,
        subscription, 
        plan,
        planLimits,
        addTeam,
        TEAM_LIMIT,
        hasReachedTeamLimit,
      }}
    >
      {children}
    </TeamsContext.Provider>
  );
}

export function useTeams() {
  const context = useContext(TeamsContext);
  if (!context) {
    throw new Error("useTeams must be used within TeamsProvider");
  }
  return context;
}
