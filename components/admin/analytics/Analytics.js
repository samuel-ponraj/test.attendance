'use client'

import { useEffect, useState } from "react"
import { collection, query, where, getDocs } from "firebase/firestore"
import { onAuthStateChanged } from "firebase/auth"
import { db, auth } from "@/lib/firebase"
import { getDateKey } from "@/lib/DateKey"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts"

const COLORS = ["hsl(var(--success))", "#BA2C2C", "#f59e0b"]

const ATTENDANCE_COLORS = {
  Present: "hsl(var(--success))",
  Absent: "#BA2C2C",
  Halfday: "#f59e0b",
}

const formatTeamLabel = (value = "") => {
  const label = String(value)

  return label.length > 14 ? `${label.slice(0, 13)}...` : label
}

const Analytics = () => {
  const [user, setUser] = useState(null)
  const [teamWiseData, setTeamWiseData] = useState([])
  const [pieData, setPieData] = useState([])

  // 🔐 Listen to Firebase auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser)
    })

    return () => unsubscribe()
  }, [])


useEffect(() => {
  if (!user?.uid) return;

  const fetchAnalytics = async () => {
    try {
      const todayKey = getDateKey(new Date());
      const q = query(
        collection(db, "teams"),
        where("admin.userId", "==", user.uid)
      );

      const teamsSnap = await getDocs(q);
      let totalPresent = 0;
      let totalAbsent = 0;
      let totalHalfday = 0;
      const teamData = [];

      teamsSnap.forEach((docSnap) => {
        const team = docSnap.data();
        const summary = team.attendanceSummary || {};
        const isToday = summary.dateKey === todayKey;

        const present = isToday ? summary.present || 0 : 0; 
        const absent = isToday ? summary.absent || 0 : 0;
        const halfday = isToday ? summary.halfday || 0 : 0;

        totalPresent += present;
        totalAbsent += absent;
        totalHalfday += halfday;

        teamData.push({
          name: team.name,
          present,
          absent,
          halfday,
          attendanceRate: (present + absent + halfday) > 0 
            ? Math.round((present / (present + absent + halfday)) * 100) 
            : 0,
        });
      });

      setTeamWiseData(teamData);
      setPieData([
        { name: "Present", value: totalPresent },
        { name: "Absent", value: totalAbsent },
        { name: "Halfday", value: totalHalfday },
      ]);
    } catch (err) {
      console.error("Analytics Fetch Error:", err);
    }
  };

  fetchAnalytics();
}, [user?.uid]);

  const renderPercentageLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
    name,
  }) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 1.6
    const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180))
    const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180))

    if (!percent) return null

    const color = ATTENDANCE_COLORS[name] || "hsl(var(--foreground))"

    return (
      <text
        x={x}
        y={y}
        fill={color}
        textAnchor={x > cx ? "start" : "end"}
        dominantBaseline="central"
        fontSize={14}
        fontWeight={500}
      >
        {name} {Math.round(percent * 100)}%
      </text>
    )
  }

  return (
  <>
    {teamWiseData.length === 0 ? (
      <div className="flex items-center justify-center h-[500px] text-muted-foreground text-lg font-medium">
        No Data Found
      </div>
    ) : (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Team-wise Attendance */}
        <Card>
          <CardHeader>
            <CardTitle>Team-wise Attendance</CardTitle>
            <CardDescription>Today&apos;s attendance by team</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={teamWiseData}
                margin={{ top: 8, right: 8, left: 0, bottom: 56 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="name"
                  interval={0}
                  angle={-35}
                  textAnchor="end"
                  height={70}
                  tickFormatter={formatTeamLabel}
                />
                <YAxis />
                <Tooltip />
                <Bar dataKey="present" fill="hsl(var(--success))" radius={[4,4,0,0]} />
                <Bar dataKey="absent" fill="#BA2C2C" radius={[4,4,0,0]} />
                <Bar dataKey="halfday" fill="#f59e0b" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Attendance Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Attendance Distribution</CardTitle>
            <CardDescription>Today&apos;s overall attendance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] sm:h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    cx="50%"
                    cy="50%"
                    innerRadius="40%"
                    outerRadius="70%"
                    paddingAngle={5}
                    label={renderPercentageLabel}
                    labelLine={false}
                  >
                    {pieData.map((_, index) => (
                      <Cell key={index} fill={COLORS[index]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    )}
  </>
)
}

export default Analytics
