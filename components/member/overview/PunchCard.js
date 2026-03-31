"use client";
import { useEffect, useState } from "react";
import { Fingerprint } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

  const PunchCard = ({
      punchIn,
      punchOut,
      isClockedIn,
      loading,
      punchInTime,
      punchOutTime,
      totalHours,
      fullName,
      getGreeting,
    }) => {


    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
      const interval = setInterval(() => {
        setCurrentTime(new Date());
      }, 1000);
      return () => clearInterval(interval);
    }, []);
  
  /* =========================
        FORMATTERS
  ========================== */
  const formatTime = (date) => {
    if (!date) return "--:--";
    return date
      .toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
      .toUpperCase();
  };

  const formatDuration = (hours) => {
    if (!hours) return "0h 0m";
    const totalMinutes = Math.floor(hours * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h}h ${m}m`;
  };

 

  return (
    <Card className="flex-1 rounded-3xl p-6 shadow-sm flex flex-col justify-center">
      <CardContent className="flex flex-col items-center text-center space-y-6 p-0">
        <div className="w-full text-left">
         <h2 className="text-3xl font-semibold bg-gradient-to-r from-rose-400 to-red-500 bg-clip-text text-transparent">
            {getGreeting()}
          </h2>
          <p className="text-lg md:text-xl">
            {fullName || "User"}
          </p>
        </div>
        <div className="space-y-1">
          <h1 className="text-4xl md:text-5xl font-semibold tracking-wide">
            {currentTime
              .toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              })
              .toUpperCase()}
          </h1>

          <p className="text-muted-foreground text-sm">
            {currentTime.toLocaleDateString("en-US", {
              weekday: "long",
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
        </div>

        {/* BUTTON */}
        <div className="relative flex items-center justify-center">
          <div className="absolute w-[200px] h-[200px] rounded-full bg-indigo-600/20 blur-2xl"></div>

          <button
            onClick={isClockedIn ? punchOut : punchIn}
            disabled={loading}
            className={cn(
              "relative w-[150px] h-[150px] rounded-full bg-[#111827] flex flex-col items-center justify-center border transition-all duration-300 active:scale-95 group",
              isClockedIn
                ? "border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.4)] hover:shadow-[0_0_35px_rgba(239,68,68,0.6)]"
                : "border-indigo-500/30 hover:border-indigo-500 hover:shadow-[0_0_25px_rgba(99,102,241,0.3)]"
            )}
          >
            <Fingerprint
              size={48}
              className={cn(
                "transition-transform duration-300 group-hover:scale-110",
                isClockedIn ? "text-red-500" : "text-white"
              )}
            />

            <span className="text-sm font-semibold mt-3 text-white">
              {loading
                ? "..."
                : isClockedIn
                ? "PUNCH OUT"
                : "PUNCH IN"}
            </span>
          </button>
        </div>

        {/* STATS */}
        <div className="w-full flex justify-around text-center">
          
          {/* Punch In */}
          <div>
            <div className="text-green-500 text-lg">●</div>
            <p className="text-xs text-muted-foreground mb-1">Punch In</p>
            <p className="text-sm font-medium">
              {formatTime(punchInTime)}
            </p>
          </div>

          {/* Punch Out */}
          <div>
            <div className="text-yellow-500 text-lg">●</div>
            <p className="text-xs text-muted-foreground mb-1">Punch Out</p>
            <p className="text-sm font-medium">
              {formatTime(punchOutTime)}
            </p>
          </div>

          {/* Total Hours */}
          <div>
            <div className="text-cyan-500 text-lg">●</div>
            <p className="text-xs text-muted-foreground mb-1">Total Hrs</p>
            <p className="text-sm font-medium">
              {formatDuration(totalHours)}
            </p>
          </div>

        </div>
      </CardContent>
    </Card>
  );
};

export default PunchCard;