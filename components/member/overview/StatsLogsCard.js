"use client";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

const StatsLogsCard = ({ stats, monthlyLogs }) => {


  const formatTime = (date) => {
    if (!date) return "--:--";
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDuration = (hrs) => {
    if (!hrs) return "0h";
    return `${hrs}h`;
  };

  /* =========================
        RECENT LOGS (latest first)
  ========================== */
  const recentLogs = [...(monthlyLogs || [])]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 3);

  const renderTimeBlock = (log, type) => {
    if (log.entryType === "admin") {
      return (
        <div className="text-center">
          <p className="text-xs font-bold text-blue-500">Marked</p>
          <p className="text-[10px] text-gray-500 uppercase">By Admin</p>
        </div>
      );
    }

    return (
      <div className="text-center">
        <p className="text-xs font-bold">
          {type === "in"
            ? formatTime(log.punchIn)
            : formatTime(log.punchOut)}
        </p>
        <p className="text-[10px] text-gray-500 uppercase">
          {type === "in" ? "In" : "Out"}
        </p>
      </div>
    );
  };

  return (
    <Card className="flex-1 rounded-2xl h-auto p-0">
      <CardContent className="p-4 sm:p-5 space-y-6">

        {/* ================= STATS ================= */}
        <div className="grid grid-cols-2 text-center">
          <div className="space-y-1">
            <p className="text-xl font-bold">
              {stats?.avgHrs || 0} H
            </p>
            <p className="text-[10px] text-muted-foreground uppercase font-medium">
              Avg. Work Duration
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-xl font-bold">
              {stats?.avgCheckIn || "--:--"}
            </p>
            <p className="text-[10px] text-muted-foreground uppercase font-medium">
              Avg. Check-in
            </p>
          </div>
        </div>

        {/* ================= STATUS COUNT ================= */}
        <div className="grid grid-cols-3 text-center pt-2 mb-1">
          <div className="space-y-1">
            <p className="text-2xl font-bold text-emerald-500">
              {stats?.present || 0}
            </p>
            <p className="text-[10px] text-muted-foreground uppercase font-medium">
              Present
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-2xl font-bold text-amber-500">
              {stats?.halfDay || 0}
            </p>
            <p className="text-[10px] text-muted-foreground uppercase font-medium">
              Half Day
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-2xl font-bold text-red-500">
              {stats?.absent || 0}
            </p>
            <p className="text-[10px] text-muted-foreground uppercase font-medium">
              Absent
            </p>
          </div>
        </div>

        {/* ================= RECENT LOGS ================= */}
        <div className="pt-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Recent Logs</h3>
            <Link href="/member/attendance">
              <button className="text-xs font-medium text-indigo-500 hover:underline">
                View More
              </button>
            </Link>
          </div>

          {recentLogs.length === 0 ? (
            <div className="text-center text-sm text-gray-500 py-4">
              No records yet
            </div>
          ) : (
            recentLogs.map((log, i) => (
              <Card key={i} className="rounded-2xl border p-3 shadow-none mb-2">
                <CardContent className="flex items-center justify-between px-1 gap-2 p-0">

                  {/* DATE */}
                  <div
                    className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center text-white shrink-0 ${
                      log.status === "present"
                        ? "bg-emerald-500"
                        : log.status === "absent"
                        ? "bg-red-600"
                        : "bg-amber-500"
                    }`}
                  >
                    <span className="text-lg font-bold leading-none">
                      {log.dayNum}
                    </span>
                    <span className="text-[10px] font-bold mt-1">
                      {log.day}
                    </span>
                  </div>

                  {/* TIME */}
                  <div className="flex-1 flex justify-around px-2">
                    {renderTimeBlock(log, "in")}
                    {renderTimeBlock(log, "out")}
                  </div>

                  {/* HOURS */}
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold">
                      {formatDuration(log.hours)}
                    </p>
                    <p
                      className={`text-[10px] font-black mt-1 ${
                        log.status === "present"
                          ? "text-emerald-500"
                          : log.status === "absent"
                          ? "text-red-600"
                          : "text-amber-500"
                      }`}
                    >
                      {log.status?.toUpperCase()}
                    </p>
                  </div>

                </CardContent>
              </Card>
            ))
          )}
        </div>

      </CardContent>
    </Card>
  );
};

export default StatsLogsCard;