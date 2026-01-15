"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";

export const useTeams = () => {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useUser();


  const fetchTeams = async () => {
  if (!user?.id) return;

  setLoading(true);
  try {
    const res = await fetch("/api/teams/list", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id }),
    });

    const data = await res.json();
    setTeams(data.teams || []);
  } catch (err) {
    console.error(err);
  } finally {
    setLoading(false);
  }
};


  useEffect(() => {
  if (!user?.id) return;

   fetchTeams();
}, [user?.id]);

 

  const addTeam = async (name, description) => {
    if (!user?.primaryEmailAddress?.emailAddress) return;

    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          userId: user.id,
          email: user.primaryEmailAddress.emailAddress,
        }),
      });
      const data = await res.json();
      if (data.id) {
        setTeams((prev) => [
          { id: data.id, name, description, present: 0, absent: 0, total: 0 },
          ...prev,
        ]);
      }
      
    } catch (err) {
      console.error("Failed to add team:", err);
    }
  };


  const deleteTeam = async (teamId) => {
    try {
      await fetch(`/api/teams/${teamId}`, { method: "DELETE" });
      setTeams((prev) => prev.filter((team) => team.id !== teamId));
    } catch (err) {
      console.error("Failed to delete team:", err);
    }
  };

  return { teams, addTeam, deleteTeam, loading };
};
