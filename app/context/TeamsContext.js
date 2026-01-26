"use client";

import { createContext, useContext, useEffect, useState } from "react";
// 1. Swap Clerk for your custom Firebase Auth hook
import { useAuth } from "../context/AuthContext"; 
import { addDoc, collection, deleteDoc, doc, onSnapshot, query, serverTimestamp, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getDateKey } from "@/lib/DateKey";

const TeamsContext = createContext(null);

export function TeamsProvider({ children }) {
  // 2. Access the Firebase user from your context
  const { user } = useAuth();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
  if (!user) {
    console.error("No user found");
    return;
  }

  try {
    const todayKey = getDateKey(new Date());
    
    // Direct Firestore call from the client
    const docRef = await addDoc(collection(db, "teams"), {
      name,
      description: description || "",
      admin: {
        email: user.email,
        userId: user.uid, // This UID will now correctly match your Security Rules
      },
      createdAt: serverTimestamp(),
      totalMembers: 0,
      attendanceSummary: {
        present: 0,
        absent: 0,
        lastUpdatedDate: todayKey,
      },
    });

    return { success: true, id: docRef.id };
  } catch (err) {
    console.error("Firestore Error:", err);
    throw err; // This will now show the specific "Missing Permissions" if rules fail
  }
};

  const deleteTeam = async (teamId) => {
  if (!user) {
    console.error("No authenticated user found");
    return;
  }

  try {
    // This executes on the client, so Firestore sees the user's UID
    // and matches it against your 'admin.userId' security rule.
    const teamRef = doc(db, "teams", teamId);
    await deleteDoc(teamRef);
    
    return { success: true };
  } catch (err) {
    console.error("Delete Error:", err);
    // This will likely show "Missing or insufficient permissions" 
    // if the person logged in isn't the actual admin.
    throw err;
  }
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
