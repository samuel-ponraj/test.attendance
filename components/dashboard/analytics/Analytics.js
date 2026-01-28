'use client'

import { useEffect, useState } from "react"
import { collection, query, where, getDocs } from "firebase/firestore"
import { onAuthStateChanged } from "firebase/auth"
import { db, auth } from "@/lib/firebase"

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

const COLORS = ["hsl(var(--success))", "#BA2C2C"]

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

  // 📊 Fetch analytics once user is available
  // 📊 Fetch analytics once user is available
useEffect(() => {
  if (!user?.uid) return;

  const fetchAnalytics = async () => {
    try {
      const todayKey = getTodayKey(); // Ensure this matches getDateKey format
      const q = query(
        collection(db, "teams"),
        where("admin.userId", "==", user.uid)
      );

      const teamsSnap = await getDocs(q);
      let totalPresent = 0;
      let totalAbsent = 0;
      const teamData = [];

      teamsSnap.forEach((docSnap) => {
        const team = docSnap.data();
        const summary = team.attendanceSummary || {};

        // 1. Check if the date matches today
        const isToday = summary.lastUpdatedDate === todayKey;
        
        // TEMPORARY: Remove 'isToday ?' to see if data appears regardless of date
        const present = summary.present || 0; 
        const absent = summary.absent || 0;

        totalPresent += present;
        totalAbsent += absent;

        teamData.push({
          name: team.name,
          present,
          absent,
          attendanceRate: (present + absent) > 0 
            ? Math.round((present / (present + absent)) * 100) 
            : 0,
        });
      });

      setTeamWiseData(teamData);
      setPieData([
        { name: "Present", value: totalPresent },
        { name: "Absent", value: totalAbsent },
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

    const color =
      name === "Present" ? "hsl(var(--success))" : "#BA2C2C"

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
    <div className="grid grid-cols-1 px-4 lg:px-6 lg:grid-cols-2 gap-6">
      {/* Team-wise Attendance */}
      <Card>
        <CardHeader>
          <CardTitle>Team-wise Attendance</CardTitle>
          <CardDescription>Today's attendance by team</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={teamWiseData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="present" fill="hsl(var(--success))" radius={[4,4,0,0]} />
              <Bar dataKey="absent" fill="#BA2C2C" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Attendance Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Attendance Distribution</CardTitle>
          <CardDescription>Today's overall attendance</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                label={renderPercentageLabel}
              >
                {pieData.map((_, index) => (
                  <Cell key={index} fill={COLORS[index]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Attendance Rate */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Attendance Rate by Team</CardTitle>
          <CardDescription>Percentage of members present today</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {teamWiseData.map(team => (
            <div key={team.name} className="flex items-center gap-4">
              <div className="w-32 truncate font-medium">{team.name}</div>
              <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${team.attendanceRate}%` }}
                />
              </div>
              <div className="w-16 text-right text-sm font-medium">
                {team.attendanceRate}%
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

export default Analytics

/* ---------------- Utils ---------------- */

const getTodayKey = () => {
  const d = new Date()
  return `${String(d.getDate()).padStart(2, "0")}-${String(
    d.getMonth() + 1
  ).padStart(2, "0")}-${d.getFullYear()}`
}
