"use client";

import { createContext, useContext, useEffect, useState } from "react";
<<<<<<< HEAD
// 1. Swap Clerk for your custom Firebase Auth hook
import { useAuth } from "../context/AuthContext"; 
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

const TeamsContext = createContext(null);

export function TeamsProvider({ children }) {
  // 2. Access the Firebase user from your context
  const { user } = useAuth();
=======
import { useUser } from "@clerk/nextjs";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";


const TeamsContext = createContext(null);

/* ✅ NAMED EXPORT */
export function TeamsProvider({ children }) {
  const { user } = useUser();
>>>>>>> c39aa9d3570ced9499a5f3473f6b937ca0c693a8
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
<<<<<<< HEAD
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

=======
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
>>>>>>> c39aa9d3570ced9499a5f3473f6b937ca0c693a8
    const res = await fetch("/api/teams/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description,
        admin: {
<<<<<<< HEAD
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
=======
          email: user.emailAddresses[0].emailAddress,
          userId: user.id,
        },
      }),
    });
  };

  const deleteTeam = async (teamId) => {
    await fetch("/api/teams/delete", {
>>>>>>> c39aa9d3570ced9499a5f3473f6b937ca0c693a8
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId }),
    });
<<<<<<< HEAD
    return res;
=======

>>>>>>> c39aa9d3570ced9499a5f3473f6b937ca0c693a8
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

<<<<<<< HEAD
=======
/* ✅ ALSO NAMED EXPORT */
>>>>>>> c39aa9d3570ced9499a5f3473f6b937ca0c693a8
export function useTeams() {
  const context = useContext(TeamsContext);
  if (!context) {
    throw new Error("useTeams must be used within TeamsProvider");
  }
  return context;
<<<<<<< HEAD
}
=======
}
>>>>>>> c39aa9d3570ced9499a5f3473f6b937ca0c693a8
