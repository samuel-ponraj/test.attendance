"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

// ✅ DD-MM-YYYY format
const getDateKey = (date = new Date()) => {
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const y = date.getFullYear();
  return `${d}-${m}-${y}`;
};

export default function useAttendanceCount(date = new Date()) {
  const [counts, setCounts] = useState({
    teams: 0,
    members: 0,
    present: 0,
    absent: 0,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const dateKey = getDateKey(date);
    const teamsRef = collection(db, "teams");

    const unsubscribe = onSnapshot(teamsRef, (snapshot) => {
      let teamCount = 0;
      let memberCount = 0;
      let presentCount = 0;
      let absentCount = 0;

      snapshot.forEach((doc) => {
        teamCount++;

        const data = doc.data();
        const members = data.members || [];
        const attendance = data.attendance?.[dateKey] || {};

        memberCount += members.length;

        members.forEach((member) => {
          const record = attendance[member.id];

          if (!record) return;

          if (record.status === "present") presentCount++;
          if (record.status === "absent") absentCount++;
        });
      });

      setCounts({
        teams: teamCount,
        members: memberCount,
        present: presentCount,
        absent: absentCount,
      });

      setLoading(false);
    });

    return () => unsubscribe();
  }, [date]);

  return { ...counts, loading };
}
