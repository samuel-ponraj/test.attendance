"use client";
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

const WeeklyBarChart = ({ monthlyLogs }) => {


  const chartData = useMemo(() => {
    if (!monthlyLogs) return [];

    const today = new Date();

    const day = today.getDay();
    const diff = day === 0 ? -6 : 1 - day; 
    const monday = new Date(today);
    monday.setDate(today.getDate() + diff);

    const weekData = [];

    for (let i = 0; i < 6; i++) {
      const current = new Date(monday);
      current.setDate(monday.getDate() + i);

      const dateKey = current.toLocaleDateString("en-CA");

      const log = monthlyLogs.find((l) => l.date === dateKey);

      weekData.push({
        day: current.toLocaleDateString("en-US", { weekday: "short" }),
        hrs: log?.hours || 0,
      });
    }

    return weekData;
  }, [monthlyLogs]);

  const hasData = chartData.length > 0;

  return (
    <Card className="flex-1 rounded-3xl p-6 shadow-sm h-auto flex flex-col">
      <CardHeader className="p-0 mb-4 text-center">
        <CardTitle className="text-base">Weekly Work Hours</CardTitle>
      </CardHeader>

      <CardContent className="p-0 flex-1 flex items-center justify-center">
        <div className="w-full h-[250px]">

          {/* EMPTY STATE */}
          {!hasData && (
            <div className="h-full flex items-center justify-center text-sm text-gray-500">
              No data available
            </div>
          )}

          {/* CHART */}
          {hasData && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#6b7280", fontSize: 12 }}
                  dy={10}
                />
                <YAxis hide domain={[0, 12]} />

                <Tooltip
                  cursor={false}
                  contentStyle={{
                    backgroundColor: "#111827",
                    border: "none",
                    borderRadius: "8px",
                    color: "#fff",
                  }}
                />

                <Bar
                  dataKey="hrs"
                  fill="#6366F1"
                  radius={[6, 6, 0, 0]}
                  barSize={30}
                />
              </BarChart>
            </ResponsiveContainer>
          )}

        </div>
      </CardContent>
    </Card>
  );
};

export default WeeklyBarChart;