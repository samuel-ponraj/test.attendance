"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";

import {
  ArrowLeft,
  Users,
  CalendarIcon,
  CheckCircle,
  XCircle,
  Clock,
  UserPlus,
} from "lucide-react";

import { doc, getDoc, updateDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

import AddMemberModal from "../addMemberModal";
import MemberRow from "../members/MemberRow";
import { getDateKey } from "../../../lib/DateKey";

export default function TeamDetailsPage() {
  const router = useRouter();
  const { slug } = useParams();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  /* ---------------- FETCH TEAM ---------------- */
  useEffect(() => {
    if (!slug) return;

    const fetchTeam = async () => {
      setLoading(true);
      try {
        const snap = await getDoc(doc(db, "teams", slug));
        if (snap.exists()) {
          setTeam({ id: snap.id, ...snap.data() });
        }
      } catch (err) {
        console.error("Failed to fetch team:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTeam();
  }, [slug]);

  if (loading || !team) {
    return <div className="p-6">Loading team...</div>;
  }

  /* ---------------- DERIVED COUNTS (KEY FIX) ---------------- */
  const dateKey = getDateKey(selectedDate);
  const members = team.members || [];
  const attendanceToday = team.attendance?.[dateKey] || {};

  let presentCount = 0;
  let absentCount = 0;

  members.forEach((m) => {
    const entry = attendanceToday[m.id];
    if (!entry) return;

    if (entry.status === "present") presentCount++;
    else if (entry.status === "absent") absentCount++;
  });

  const totalCount = members.length;
  const unmarkedCount = totalCount - presentCount - absentCount;

  /* ---------------- UPDATE ATTENDANCE ---------------- */
  const updateAttendance = async ({ teamId, dateKey, member, status }) => {
    try {
      const teamRef = doc(db, "teams", teamId);

      const payload = {
        status,
        member: {
          id: member.id,
          name: member.name,
          email: member.email,
        },
        markedAt: Timestamp.now(),
      };

      await updateDoc(teamRef, {
        [`attendance.${dateKey}.${member.id}`]: payload,
      });

      setTeam((prev) => {
        const updatedAttendance = { ...prev.attendance };
        if (!updatedAttendance[dateKey]) updatedAttendance[dateKey] = {};
        updatedAttendance[dateKey][member.id] = payload;

        return {
          ...prev,
          attendance: updatedAttendance,
        };
      });
    } catch (err) {
      console.error("Failed to update attendance:", err);
    }
  };

  /* ---------------- MEMBER REMOVAL ---------------- */
  const handleMemberRemoved = (memberId) => {
    setTeam((prev) => ({
      ...prev,
      members: prev.members.filter((m) => m.id !== memberId),
    }));
  };

  /* ---------------- UI ---------------- */
  return (
    <div className="space-y-6">
      {/* Back */}
      <button
        onClick={() => router.push("/dashboard/teams")}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Teams
      </button>

      <Tabs defaultValue="attendance" className="space-y-6">
        <TabsList>
          <TabsTrigger value="attendance">Mark Attendance</TabsTrigger>
          <TabsTrigger value="history">View History</TabsTrigger>
        </TabsList>

        {/* ---------------- ATTENDANCE TAB ---------------- */}
        <TabsContent value="attendance" className="space-y-6">
          {/* Header */}
          <Card>
            <CardContent className="p-6 space-y-6">
              <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 flex items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Users className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{team.name}</h2>
                    <p className="text-muted-foreground">
                      {team.description}
                    </p>
                  </div>
                </div>

                {/* Date Picker */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-[240px] justify-start">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(selectedDate, "PPP")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(d) => d && setSelectedDate(d)}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Counts */}
              <div className="flex flex-wrap gap-4 pt-6 border-t">
                <Count
                  icon={CheckCircle}
                  label={`${presentCount} Present`}
                  color="success"
                />
                <Count
                  icon={XCircle}
                  label={`${absentCount} Absent`}
                  color="destructive"
                />
                <Count
                  icon={Users}
                  label={`${unmarkedCount} Unmarked`}
                  color="muted"
                />
              </div>
            </CardContent>
          </Card>

          {/* Members */}
          <h2 className="text-lg font-semibold">
            Team Members ({totalCount}) – {format(selectedDate, "MMM d, yyyy")}
          </h2>

          {members.length === 0 ? (
            <EmptyState onAdd={() => setModalOpen(true)} />
          ) : (
            <div className="space-y-4">
              {members.map((member) => (
                <MemberRow
                  key={member.id}
                  member={member}
                  teamId={team.id}
                  selectedDate={selectedDate}
                  attendance={team.attendance}
                  onUpdateAttendance={updateAttendance}
                  onMemberRemoved={handleMemberRemoved}
                />
              ))}

              <Button onClick={() => setModalOpen(true)}>
                <UserPlus /> Add Member
              </Button>
            </div>
          )}

          <AddMemberModal
            open={modalOpen}
            onOpenChange={setModalOpen}
            teamId={team.id}
            onMemberAdded={async () => {
              const snap = await getDoc(doc(db, "teams", team.id));
              if (snap.exists()) setTeam({ id: snap.id, ...snap.data() });
            }}
          />
        </TabsContent>

        {/* ---------------- HISTORY TAB ---------------- */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Attendance History
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              No history yet
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ---------------- SMALL COMPONENTS ---------------- */

function Count({ icon: Icon, label, color }) {
  const colors = {
    success: "bg-success/10 text-success",
    destructive: "bg-destructive/10 text-destructive",
    muted: "bg-muted text-muted-foreground",
  };

  return (
    <div className="flex items-center gap-2 text-sm">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colors[color]}`}>
        <Icon className="w-4 h-4" />
      </div>
      <span>{label}</span>
    </div>
  );
}

function EmptyState({ onAdd }) {
  return (
    <Card>
      <CardContent className="p-6 text-center space-y-4">
        <Users className="w-12 h-12 mx-auto text-muted-foreground" />
        <h3 className="text-lg font-medium">No members yet</h3>
        <p className="text-muted-foreground">
          Add team members to start tracking attendance
        </p>
        <Button onClick={onAdd}>
          <UserPlus /> Add Member
        </Button>
      </CardContent>
    </Card>
  );
}
