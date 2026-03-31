"use client";
import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { db } from "@/lib/firebase";
import {
  doc,
  onSnapshot,
} from "firebase/firestore";
import { toast } from "sonner";
import { useMembers } from "../../app/context/MembersContext";

const AttendanceContext = createContext();

export const AttendanceProvider = ({ children }) => {
  const { members } = useMembers();
  const member = members?.[0];

  const [loading, setLoading] = useState(false);
  const [todayPunch, setTodayPunch] = useState(null);
  const [monthlyLogs, setMonthlyLogs] = useState([]);

  /* =========================
        HELPERS
  ========================== */
  const getTodayDate = () => {
    const today = new Date();
    return today.toLocaleDateString("en-CA"); 
  };

  const getPunchRef = () => {
    if (!member?.teamId || !member?.id) return null;

    return doc(
      db,
      "teams",
      member.teamId,
      "attendance",
      getTodayDate(),
      "punches",
      member.id
    );
  };

  /* =========================
        PUNCH IN (API)
  ========================== */
  const punchIn = async () => {
    try {
      setLoading(true);
      if (!member?.teamId || !member?.id) return;

      const response = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          member, 
          dateKey: getTodayDate() 
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error || "Punch In Failed");
        return;
      }

      toast.success("Punched In");
    } catch (err) {
      console.error(err);
      toast.error("Punch In Failed");
    } finally {
      setLoading(false);
    }
  };

  /* =========================
        PUNCH OUT (API)
  ========================== */
  const punchOut = async () => {
    try {
      setLoading(true);
      if (!member?.teamId || !member?.id) return;

      const response = await fetch("/api/attendance", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          member, 
          dateKey: getTodayDate() 
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error || "Punch Out Failed");
        return;
      }

      toast.success("Punched Out");
    } catch (err) {
      console.error(err);
      toast.error("Punch Out Failed");
    } finally {
      setLoading(false);
    }
  };

  /* =========================
        REAL-TIME TODAY PUNCH
  ========================== */
  const subscribeTodayPunch = useCallback(() => {
    const ref = getPunchRef();
    if (!ref) return null;

    return onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (!data.punchIn) {
            setTodayPunch({ 
              id: snap.id, 
              ...data, 
              totalHoursWorked: 0 
            });
            return;
          }
          setTodayPunch({ id: snap.id, ...data });
        } else {
          setTodayPunch(null);
        }
      },
      (err) => console.error("❌ Today Punch Snapshot Error:", err)
    );
  }, [member]);

  /* =========================
        REAL-TIME MONTHLY LOGS
  ========================== */
  const subscribeMonthlyAttendance = useCallback(() => {
    if (!member?.teamId || !member?.id) return null;

    const year = new Date().getFullYear();
    const month = new Date().getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const unsubscribes = Array.from({ length: daysInMonth }, (_, i) => {
      const current = new Date(year, month, i + 1);
      const dateKey = current.toLocaleDateString("en-CA");

      const ref = doc(
        db,
        "teams",
        member.teamId,
        "attendance",
        dateKey,
        "punches",
        member.id
      );

      return onSnapshot(ref, (snap) => {
        setMonthlyLogs((prev) => {
          const logsCopy = [...prev];
          const log = snap.exists()
            ? {
                date: dateKey,
                dayNum: i + 1,
                day: current.toLocaleDateString("en-US", { weekday: "short" }),
                punchIn: snap.data().punchIn?.toDate() || null,
                punchOut: snap.data().punchOut?.toDate() || null,
                hours: snap.data().totalHoursWorked || 0,
                status: snap.data().status || "absent",
                entryType: snap.data().entryType || "manual",
              }
            : null;

          const idx = logsCopy.findIndex((l) => l.date === dateKey);
          if (log) {
            if (idx > -1) logsCopy[idx] = log;
            else logsCopy.push(log);
          } else {
            if (idx > -1) logsCopy.splice(idx, 1);
          }

          return logsCopy.sort((a, b) => a.dayNum - b.dayNum);
        });
      });
    });

    return () => unsubscribes.forEach((unsub) => unsub());
  }, [member]);

  /* =========================
        STATS CALCULATION
  ========================== */
  const getStats = useCallback(() => {
    if (!monthlyLogs.length)
      return { present: 0, halfDay: 0, absent: 0, avgHrs: "0", avgCheckIn: "--:--" };

    let present = 0,
      halfDay = 0,
      absent = 0,
      totalHours = 0,
      totalCheckIn = 0,
      checkInCount = 0;

    monthlyLogs.forEach((log) => {
      if (log.status === "present") present++;
      else if (log.status === "halfday") halfDay++;
      else absent++;

      totalHours += log.hours;

      if (log.punchIn) {
        totalCheckIn += log.punchIn.getHours() * 60 + log.punchIn.getMinutes();
        checkInCount++;
      }
    });

    const avgHrs = totalHours / monthlyLogs.length;

    let avgCheckIn = "--:--";
    if (checkInCount > 0) {
      const avgMin = totalCheckIn / checkInCount;
      const hrs = Math.floor(avgMin / 60);
      const mins = Math.floor(avgMin % 60);
      avgCheckIn = new Date(0, 0, 0, hrs, mins).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
    }

    return { present, halfDay, absent, avgHrs: avgHrs.toFixed(1), avgCheckIn };
  }, [monthlyLogs]);

  /* =========================
        EFFECT TO START SUBSCRIPTIONS
  ========================== */
  useEffect(() => {
    if (!member) return;

    const unsubToday = subscribeTodayPunch();
    const unsubMonthly = subscribeMonthlyAttendance();

    return () => {
      unsubToday && unsubToday();
      unsubMonthly && unsubMonthly();
    };
  }, [member, subscribeTodayPunch, subscribeMonthlyAttendance]);

  return (
    <AttendanceContext.Provider
      value={{
        punchIn,
        punchOut,
        todayPunch,
        monthlyLogs,
        getStats,
        loading,
      }}
    >
      {children}
    </AttendanceContext.Provider>
  );
};

export const useAttendance = () => useContext(AttendanceContext);