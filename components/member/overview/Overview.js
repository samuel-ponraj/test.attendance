"use client";
import PunchCard from "./PunchCard";
import StatsLogsCard from "./StatsLogsCard";
import AttendancePieChart from "./AttendancePieChart";
import WeeklyBarChart from "./WeeklyBarChart";
import { useAttendance } from "../../../app/context/attendanceContext";
import { useAuth } from "../../../app/context/AuthContext";
import { useMemo } from "react";

const Overview = () => {
  const { punchIn, punchOut, todayPunch, monthlyLogs, getStats, loading } = useAttendance();
  const { userData } = useAuth();

  const fullName = `${userData?.firstName || ""} ${userData?.lastName || ""}`.trim();

  const currentTime = new Date();

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return "Good Morning!";
    if (hour < 17) return "Good Afternoon!";
    return "Good Evening!";
  };

  const isClockedIn = todayPunch?.punchIn && !todayPunch?.punchOut;
  const punchInTime = todayPunch?.punchIn ? todayPunch.punchIn.toDate ? todayPunch.punchIn.toDate() : new Date(todayPunch.punchIn) : null;
  const punchOutTime = todayPunch?.punchOut ? todayPunch.punchOut.toDate ? todayPunch.punchOut.toDate() : new Date(todayPunch.punchOut) : null;

  const rawDiff = punchInTime ? ((punchOutTime || new Date()) - punchInTime) : 0;
  const totalHours = Math.max(0, rawDiff / 3600000);

  const stats = useMemo(() => getStats(), [monthlyLogs]);

  return (
    <div className="space-y-6 px-4 pb-4 lg:px-6">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col lg:flex-row gap-6 lg:items-stretch">
          <PunchCard
            punchIn={punchIn}
            punchOut={punchOut}
            isClockedIn={isClockedIn}
            loading={loading}
            punchInTime={punchInTime}
            punchOutTime={punchOutTime}
            totalHours={totalHours}
            fullName={fullName}
            getGreeting={getGreeting}
          />
          <StatsLogsCard stats={stats} monthlyLogs={monthlyLogs} />
        </div>
        <div className="flex flex-col lg:flex-row gap-6 lg:items-stretch">
          <AttendancePieChart stats={stats} />
          <WeeklyBarChart monthlyLogs={monthlyLogs} />
        </div>
      </div>
    </div>
  );
};

export default Overview;