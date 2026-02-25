"use client";

import { createContext, useContext, useEffect, useState } from "react";
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
import { getFunctions, httpsCallable } from "firebase/functions";

const TeamsContext = createContext(null);

const TEAM_LIMIT = 2;

export function TeamsProvider({ children }) {

   const functions = getFunctions();
  const { user } = useAuth();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState('basic'); 
  const sendOtp = httpsCallable(functions, "sendDeleteTeamOtp");
  const verifyOtp = httpsCallable(functions, "verifyOtpAndDeleteTeam");

  // Logic: Only block if subscription is NOT pro AND limit reached
  const hasReachedTeamLimit = subscription !== 'pro' && teams.length >= TEAM_LIMIT;

  useEffect(() => {
    if (!user?.uid) {
      setTeams([]);
      setSubscription('basic');
      setLoading(false);
      return;
    }

    // 1. Listen to the User Document for subscription changes
    const userDocRef = doc(db, "users", user.uid);
    const unsubUser = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        // Fallback to 'basic' if field is missing
        setSubscription(data.subscription || 'basic');
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
      setTeams(teamsData);
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

  const addTeam = async (name, description, ownerName, customFields = []) => {
    if (!user) {
      console.error("No user found");
      return;
    }

    // Client-side guard based on state
    if (hasReachedTeamLimit) {
      throw new Error(`Team limit of ${TEAM_LIMIT} reached for basic plan.`);
    }

    try {
      const todayKey = getDateKey(new Date());
      const formattedFields = customFields.map(field => ({
        id: field.id,
        name: field.name,
        type: field.type,
        required: field.required,
        ...(field.options && { options: field.options }) 
      }));

      const newTeamId = await runTransaction(db, async (transaction) => {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await transaction.get(userRef);

        if (!userSnap.exists()) {
          throw new Error("User profile not found!");
        }

        const userData = userSnap.data();
        const currentCount = userData.teamCount || 0;
        const currentSub = userData.subscription || 'basic';

        // Server-side Enforcement within Transaction
        if (currentSub !== 'pro' && currentCount >= TEAM_LIMIT) {
          throw new Error("Limit reached. Upgrade to Pro for unlimited teams.");
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
            lastUpdatedDate: todayKey,
          },
          customFields: formattedFields 
        });

        transaction.update(userRef, {
          teamCount: increment(1)
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
        loading,
        subscription, 
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