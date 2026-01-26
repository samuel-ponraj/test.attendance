"use client";

import { createContext, useContext, useEffect, useState } from "react";
// 1. Swap Clerk for your custom Firebase Auth hook
import { useAuth } from "../context/AuthContext"; 
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

const TeamsContext = createContext(null);

export function TeamsProvider({ children }) {
  // 2. Access the Firebase user from your context
  const { user } = useAuth();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 3. Firebase uses 'uid' instead of Clerk's 'id'
    if (!user?.uid) {
      setTeams([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "teams"),
      // Ensure your Firestore documents use "userId" to store the Firebase UID
      where("admin.userId", "==", user.uid)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const teamsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setTeams(teamsData);
      setLoading(false);
    }, (error) => {
      console.error("Firestore Error:", error);
      setLoading(false);
    });

    return () => unsub();
  }, [user?.uid]);

  const addTeam = async (name, description) => {
    if (!user) return;

    const res = await fetch("/api/teams/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description,
        admin: {
          // 4. Firebase user email access
          email: user.email,
          userId: user.uid,
        },
      }),
    });
    return res;
  };

  const deleteTeam = async (teamId) => {
    const res = await fetch("/api/teams/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId }),
    });
    return res;
  };

  return (
    <TeamsContext.Provider
      value={{
        teams,
        loading,
        addTeam,
        deleteTeam,
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
