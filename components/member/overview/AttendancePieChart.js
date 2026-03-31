import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { useAttendance } from "../../../app/context/attendanceContext";
import { useMemo } from "react";

 const COLORS = {
  present: "#10b981",
  absent: "#BA2C2C",
  halfday: "#f59e0b",
};

const AttendancePieChart = () => {

  const { getStats, monthlyLogs } = useAttendance();

  const stats = monthlyLogs?.length ? getStats() : null;

  const pieData = useMemo(() => {
    if (!stats) return [];
    
    return [
      { name: "Present", value: stats.present, color: COLORS.present },
      { name: "Absent", value: stats.absent, color: COLORS.absent },
      { name: "Halfday", value: stats.halfDay, color: COLORS.halfday },
    ].filter((d) => d.value > 0);
  }, [stats]);

  const renderPercentageLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 1.6;
    const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
    const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
    return (
      <text x={x} y={y} fill="#888" textAnchor={x > cx ? "start" : "end"} dominantBaseline="central" fontSize={12} fontWeight={500}>
        {Math.round(percent * 100)}%
      </text>
    );
  };


  return (
    <Card className="flex-1 h-auto flex flex-col">
      <CardHeader><CardTitle className="text-base">Attendance Percentage</CardTitle></CardHeader>
      <CardContent className="flex-1 flex flex-col items-center justify-center">
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData.length ? pieData : [{ name: "No Data", value: 1 }]}
                dataKey="value"
                cx="50%"
                cy="50%"
                innerRadius="40%"
                outerRadius="70%"
                paddingAngle={5}
                label={pieData.length ? renderPercentageLabel : false}
                labelLine={false}
              >
                {pieData.length ? (
                  pieData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))
                ) : (
                  <Cell fill="#f3f4f6" />
                )}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" height={36} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default AttendancePieChart;