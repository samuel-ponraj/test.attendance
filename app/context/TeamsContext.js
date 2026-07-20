"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import { collection, doc, getDoc, increment, onSnapshot, query, runTransaction, serverTimestamp, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getDateKey } from "@/lib/DateKey";

const TeamsContext = createContext(null);

export function TeamsProvider({ children }) {
  const { user, userData } = useAuth();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) {
      queueMicrotask(() => { setTeams([]); setLoading(false); });
      return;
    }
    let unsubscribe = null;
    let cancelled = false;

    const loadTeams = async () => {
      if (userData?.role === "member") {
        const email = String(user.email || "").trim().toLowerCase();
        const mappingSnapshot = await getDoc(doc(db, "allMembers", email));

        if (cancelled) return;
        if (!mappingSnapshot.exists()) {
          setTeams([]);
          setLoading(false);
          return;
        }

        const { teamId, memberId } = mappingSnapshot.data();
        if (!teamId || memberId !== user.uid) {
          setTeams([]);
          setLoading(false);
          return;
        }

        unsubscribe = onSnapshot(doc(db, "teams", teamId), (teamSnapshot) => {
          setTeams(teamSnapshot.exists() ? [{ id: teamSnapshot.id, ...teamSnapshot.data() }] : []);
          setLoading(false);
        }, (error) => {
          console.error("Member team could not be loaded:", error);
          setTeams([]);
          setLoading(false);
        });
        return;
      }

      const teamsQuery = query(collection(db, "teams"), where("admin.userId", "==", user.uid));
      unsubscribe = onSnapshot(teamsQuery, (snapshot) => {
        setTeams(snapshot.docs.map((teamDoc) => ({ id: teamDoc.id, ...teamDoc.data() })));
        setLoading(false);
      }, (error) => {
        console.error("Firestore Teams Error:", error);
        setTeams([]);
        setLoading(false);
      });
    };

    loadTeams().catch((error) => {
      console.error("Teams could not be loaded:", error);
      setTeams([]);
      setLoading(false);
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [user?.email, user?.uid, userData?.role]);

  const addTeam = async ({ name, description, ownerName }) => {
    if (!user) return;
    const todayKey = getDateKey(new Date());
    const newTeamId = await runTransaction(db, async (transaction) => {
      const userRef = doc(db, "users", user.uid);
      const userSnap = await transaction.get(userRef);
      if (!userSnap.exists()) throw new Error("User profile not found!");
      const teamRef = doc(collection(db, "teams"));
      transaction.set(teamRef, {
        name, description: description || "", ownerName,
        admin: { email: user.email, userId: user.uid },
        createdAt: serverTimestamp(), totalMembers: 0,
        attendanceSummary: { present: 0, absent: 0, halfday: 0, dateKey: todayKey },
      });
      transaction.update(userRef, { teamCount: increment(1) });
      return teamRef.id;
    });
    return { success: true, id: newTeamId };
  };

  return <TeamsContext.Provider value={{
    teams, allTeams: teams, loading, addTeam,
  }}>{children}</TeamsContext.Provider>;
}

export function useTeams() {
  const context = useContext(TeamsContext);
  if (!context) throw new Error("useTeams must be used within TeamsProvider");
  return context;
}
