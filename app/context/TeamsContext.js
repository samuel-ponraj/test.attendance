"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";


const TeamsContext = createContext(null);

/* ✅ NAMED EXPORT */
export function TeamsProvider({ children }) {
  const { user } = useUser();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
  if (!user?.id) return;

  const q = query(
    collection(db, "teams"),
    where("admin.userId", "==", user.id)
  );

  const unsub = onSnapshot(q, (snapshot) => {
    const teams = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    setTeams(teams);
    setLoading(false);
  });

  return () => unsub();
}, [user?.id]);



  const addTeam = async (name, description) => {
    const res = await fetch("/api/teams/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description,
        admin: {
          email: user.emailAddresses[0].emailAddress,
          userId: user.id,
        },
      }),
    });
  };

  const deleteTeam = async (teamId) => {
    await fetch("/api/teams/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId }),
    });

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

/* ✅ ALSO NAMED EXPORT */
export function useTeams() {
  const context = useContext(TeamsContext);
  if (!context) {
    throw new Error("useTeams must be used within TeamsProvider");
  }
  return context;
}
