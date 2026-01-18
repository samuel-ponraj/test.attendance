'use client'

import useAttendanceCount from '@/lib/AttendanceCount'
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
import { useState } from "react"
import { Users, CheckCircle, XCircle, TrendingUp } from "lucide-react"

const COLORS = ["hsl(var(--success))", "hsl(var(--destructive))"]

const Analytics = () => {
  // ✅ SAFE DESTRUCTURING (NO HOOK CHANGES)
  const hookData = useAttendanceCount()

  const teams = Array.isArray(hookData?.teams) ? hookData.teams : []
  const attendanceRecords = Array.isArray(hookData?.attendanceRecords)
    ? hookData.attendanceRecords
    : []

  const [selectedTeam, setSelectedTeam] = useState("all")

  const today = new Date().toISOString().split("T")[0]

  // ✅ SAFE FILTER
  const filteredRecords =
    selectedTeam === "all"
      ? attendanceRecords
      : attendanceRecords.filter((r) => {
          const team = teams.find((t) => t.id === selectedTeam)
          return team?.members?.some((m) => m.id === r.memberId)
        })

  const todayRecords = filteredRecords.filter((r) => r.date === today)

  const presentToday = todayRecords.filter((r) => r.status === "present").length
  const absentToday = todayRecords.filter((r) => r.status === "absent").length

  // ✅ TEAM-WISE DATA (GUARDED)
  const teamWiseData = teams.map((team) => {
    const members = team?.members || []
    const memberIds = members.map((m) => m.id)

    const records = attendanceRecords.filter(
      (r) => memberIds.includes(r.memberId) && r.date === today
    )

    const present = records.filter((r) => r.status === "present").length
    const absent = records.filter((r) => r.status === "absent").length

    return {
      name: team.name,
      present,
      absent,
      total: members.length,
      attendanceRate:
        members.length > 0
          ? Math.round((present / members.length) * 100)
          : 0,
    }
  })

  const pieData = [
    { name: "Present", value: presentToday },
    { name: "Absent", value: absentToday },
  ].filter((d) => d.value > 0)

  const totalMembers =
    selectedTeam === "all"
      ? teams.reduce((acc, t) => acc + (t.members?.length || 0), 0)
      : teams.find((t) => t.id === selectedTeam)?.members?.length || 0

  const attendanceRate =
    totalMembers > 0 ? Math.round((presentToday / totalMembers) * 100) : 0

  // ✅ LOADING STATE (OPTIONAL BUT RECOMMENDED)
  if (!teams.length && !attendanceRecords.length) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-muted-foreground">
        Loading analytics...
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Team-wise Attendance</CardTitle>
          <CardDescription>Today's attendance by team</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={teamWiseData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="present" fill="hsl(var(--success))" />
              <Bar dataKey="absent" fill="hsl(var(--destructive))" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Pie Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Attendance Distribution</CardTitle>
          <CardDescription>Today</CardDescription>
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
                label
              >
                {pieData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Progress Bars */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Attendance Rate by Team</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {teamWiseData.map((team) => (
            <div key={team.name} className="flex items-center gap-4">
              <div className="w-32 truncate">{team.name}</div>
              <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary"
                  style={{ width: `${team.attendanceRate}%` }}
                />
              </div>
              <div className="w-14 text-right">{team.attendanceRate}%</div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

export default Analytics
