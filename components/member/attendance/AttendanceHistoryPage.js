"use client";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useMemo, useEffect, useCallback } from "react";
import { useAuth } from "../../../app/context/AuthContext";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

const AttendanceHistory = () => {
  const { userData } = useAuth();

  const [monthlyLogs, setMonthlyLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    avgHrs: 0,
    avgCheckIn: "--:--",
    present: 0,
    halfDay: 0,
    absent: 0,
  });
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();


  // ===================== HELPER FUNCTIONS =====================
  const getStatusColorClass = (status) => {
    const s = status?.toLowerCase();
    if (s === "present") return "text-emerald-500";
    if (s === "halfday") return "text-amber-500";
    if (s === "absent") return "text-red-500";
    return "text-gray-400";
  };

  const getStatusBgClass = (status) => {
    const s = status?.toLowerCase();
    if (s === "present") return "bg-emerald-500";
    if (s === "halfday") return "bg-amber-500";
    if (s === "absent") return "bg-red-500";
    return "bg-gray-400";
  };

  const STATUS_BG_LIGHT = {
    present: "bg-emerald-50 dark:bg-emerald-950/30",
    absent: "bg-red-50 dark:bg-red-950/30",
    halfday: "bg-amber-50 dark:bg-amber-950/30",
  };

  const formatTime = (date) => {
  if (!date) return "--:--";
  const jsDate = date.toDate ? date.toDate() : new Date(date);

  return jsDate.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).toUpperCase();
};

  const changeMonth = (direction) => {
    setCurrentDate(new Date(year, month + direction, 1));
  };

  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // ===================== FETCH MONTHLY ATTENDANCE =====================
  const fetchMonthlyAttendance = useCallback(async (date) => {
  if (!userData?.teamId || !userData?.memberId) return;

  setLoading(true); // start loader

  try {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const daysInMonth = new Date(year, month, 0).getDate();

    const logs = [];
    let totalHrs = 0;
    let checkInTimes = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const dayStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const punchesRef = collection(db, `teams/${userData.teamId}/attendance/${dayStr}/punches`);
      const snapshot = await getDocs(punchesRef);
      const docData = snapshot.docs.find(doc => doc.id === userData.memberId)?.data();

      if (docData) {
        logs.push({
          ...docData,
          dayNum: day,
          day: new Date(year, month - 1, day).toLocaleString("default", { weekday: "short" }),
        });
        totalHrs += docData.totalHoursWorked || 0;
        if (docData.punchIn) checkInTimes.push(docData.punchIn.toDate ? docData.punchIn.toDate() : new Date(docData.punchIn));
      } else {
        logs.push({
          status: null,
          dayNum: day,
          day: new Date(year, month - 1, day).toLocaleString("default", { weekday: "short" }),
        });
      }
    }

    // Stats
    const present = logs.filter(l => l.status === "present").length;
    const halfDay = logs.filter(l => l.status === "halfday").length;
    const absent = logs.filter(l => l.status === "absent").length;

    let avgCheckIn = "--:--";
    if (checkInTimes.length) {
      const totalMinutes = checkInTimes.reduce((acc, d) => acc + d.getHours() * 60 + d.getMinutes(), 0);
      const avgMinutes = totalMinutes / checkInTimes.length;
      const hrs = Math.floor(avgMinutes / 60);
      const mins = Math.floor(avgMinutes % 60);
      avgCheckIn = new Date(0, 0, 0, hrs, mins).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }).toUpperCase();
    }

    setMonthlyLogs(logs);
    setStats({
      avgHrs: (totalHrs / logs.length).toFixed(2),
      avgCheckIn,
      present,
      halfDay,
      absent,
    });

  } finally {
    setLoading(false); 
  }

}, [userData]);

  useEffect(() => {
    fetchMonthlyAttendance(currentDate);
  }, [currentDate, fetchMonthlyAttendance]);

  const attendanceMap = useMemo(() => {
    const map = {};
    monthlyLogs.forEach((log) => {
      const dateKey = log.date || `${year}-${String(month + 1).padStart(2, "0")}-${String(log.dayNum).padStart(2, "0")}`;
      map[dateKey] = log;
    });
    return map;
  }, [monthlyLogs, month, year]);

  return (
    <>
      {loading ? (
        <div className="flex items-center justify-center min-h-[80vh]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
    
    <div className="px-4 sm:px-6 space-y-6">
      {/* ===================== STATS SECTION ===================== */}
      <Card className="rounded-2xl">
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 lg:gap-0 lg:divide-x divide-border">

  {/* Avg Work */}
  <div className="flex flex-col items-center justify-center gap-2">
    <span className="text-xl lg:text-2xl font-bold">{stats.avgHrs} H</span>
    <span className="text-[10px] text-muted-foreground uppercase font-medium text-center">
      Avg. Work Duration
    </span>
  </div>

  {/* Avg Check-in */}
  <div className="flex flex-col items-center justify-center gap-2">
    <span className="text-xl lg:text-2xl font-bold">{stats.avgCheckIn}</span>
    <span className="text-[10px] text-muted-foreground uppercase font-medium text-center">
      Avg. Check-in
    </span>
  </div>

  {/* Mobile wrapper for Present / Halfday / Absent */}
  <div className="col-span-2 grid grid-cols-3 mt-3 lg:contents lg:divide-x">

    <div className="flex flex-col items-center justify-center gap-2">
      <span className="text-xl lg:text-3xl font-bold text-emerald-500">{stats.present}</span>
      <span className="text-[10px] text-muted-foreground uppercase font-medium">
        Present
      </span>
    </div>

    <div className="flex flex-col items-center justify-center gap-2">
      <span className="text-xl lg:text-3xl font-bold text-amber-500">{stats.halfDay}</span>
      <span className="text-[10px] text-muted-foreground uppercase font-medium">
        Half Day
      </span>
    </div>

    <div className="flex flex-col items-center justify-center gap-2">
      <span className="text-xl lg:text-3xl font-bold text-red-500">{stats.absent}</span>
      <span className="text-[10px] text-muted-foreground uppercase font-medium">
        Absent
      </span>
    </div>

  </div>

</div>
        </CardContent>
      </Card>

      {/* ===================== LARGE SCREEN CALENDAR ===================== */}
      <div className="hidden lg:block">
        <Card className="rounded-3xl overflow-hidden">
      <CardContent className="p-6">

        {/* HEADER */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <button onClick={() => changeMonth(-1)}>
            <ChevronLeft className="w-6 h-6" />
          </button>

          <h2 className="text-xl font-semibold">
            {currentDate.toLocaleString("default", { month: "long" })} {year}
          </h2>

          <button onClick={() => changeMonth(1)}>
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>

        {/* WEEK LABELS */}
        <div className="grid grid-cols-7 text-center mb-4">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="text-xs font-bold text-gray-500">
              {day}
            </div>
          ))}
        </div>

        {/* CALENDAR GRID */}
       <div className="grid grid-cols-7 gap-0 w-full">

          {/* Empty cells before first day */}
          {Array.from({ length: firstDayIndex }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}

          {/* Days */}
          {Array.from({ length: daysInMonth }).map((_, index) => {
            const day = index + 1;
            const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const data = attendanceMap[dateKey];

            return (
              <div
                key={day}
                className={cn(
                  "min-h-[80px] aspect-square w-full border rounded-sm p-3 flex flex-col justify-between text-xs transition-colors",
                  data && STATUS_BG_LIGHT[data.status]
                )}>
                <div className="font-semibold">{day}</div>

                {data ? (
                  <>
                    <div className={`font-bold  flex flex-col gap-2`}>
                      <span className={cn("capitalize", getStatusColorClass(data.status))}>
                          {data.status}
                        </span>
                      {data.entryType === 'admin' ? (
                        <span className="text-[11px]">Marked by Admin</span>
                      ): (
                        <span className="text-[11px]">{formatTime(data.punchIn)} - {formatTime(data.punchOut)}</span>
                      )}
                      
                    </div>
                  </>
                ) : (
                  <div className="text-[10px] text-gray-400">
                    No Data
                  </div>
                )}
              </div>
            );
          })}

        </div>
      </CardContent>
    </Card>
      </div>

      {/* ===================== SMALL SCREEN LOGS ===================== */}
      <div className="block lg:hidden space-y-4">
          
        <div className="flex items-center">  
          <button onClick={() => changeMonth(-1)}>
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h3 className="text-lg font-semibold px-1">{currentDate.toLocaleString("default", { month: "long" })} {year}</h3>
          <button onClick={() => changeMonth(1)}>
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>

       <div className="space-y-3">
  {monthlyLogs.length === 0  ? (
    <div className="text-center text-sm text-gray-500 py-6">
      No record found
    </div>
  ) : (
    monthlyLogs.map((log, i) => (
      <Card key={i} className="rounded-2xl py-3">
        <CardContent className="flex items-center justify-between px-3">

          <div className={`${getStatusBgClass(log.status)} w-14 h-14 rounded-xl flex flex-col items-center justify-center text-white shrink-0`}>
            <span className="text-xl font-bold leading-none">{log.dayNum}</span>
            <span className="text-[10px] font-bold mt-1">{log.day}</span>
          </div>

          <div className="flex-1 flex justify-around px-4">
            <div className="text-center">
              <p className="text-sm font-bold">{formatTime(log.punchIn)}</p>
              <p className="text-[10px] text-gray-500 mt-1 uppercase">In</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-bold">{formatTime(log.punchOut)}</p>
              <p className="text-[10px] text-gray-500 mt-1 uppercase">Out</p>
            </div>
          </div>

          <div className="text-right">
            <p className="text-sm font-bold">{log.hours}</p>
            <p className="text-[10px] text-gray-500 mt-1 uppercase">Total</p>
            <p
              className={cn(
                "text-[10px] font-black mt-1 capitalize",
                getStatusColorClass(log.status)
              )}
            >
              {log.status}
            </p>
          </div>

        </CardContent>
      </Card>
    ))
  )}
</div>
      </div>
    </div>
      )}
      </>
  );
};

export default AttendanceHistory;