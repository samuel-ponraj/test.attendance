"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { format } from "date-fns";
import { CalendarIcon, CheckCircle, Clock, Users, XCircle } from "lucide-react";
import { db } from "@/lib/firebase";
import { useMembers } from "@/app/context/MembersContext";
import { useTeams } from "@/app/context/TeamsContext";
import Members from "@/components/admin/team/Members";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";

const getDateKey = (date) => date.toLocaleDateString("en-CA");

function Count({ icon: Icon, label, className }) {
  return (
    <div className={`flex items-center gap-2 text-sm font-medium ${className}`}>
      <Icon className="h-4 w-4" />
      {label}
    </div>
  );
}

export default function ManagerTeamMembersPage() {
  const router = useRouter();
  const { members: ownMembers, loading: memberLoading } = useMembers();
  const { teams, loading: teamLoading } = useTeams();
  const manager = ownMembers?.[0];
  const team = teams?.[0];
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [teamMembers, setTeamMembers] = useState([]);
  const [attendance, setAttendance] = useState({});

  useEffect(() => {
    if (!memberLoading && manager && manager.role !== "manager")
      router.replace("/member");
  }, [manager, memberLoading, router]);

  useEffect(() => {
    if (manager?.role !== "manager" || !manager?.teamId) return;
    const dateKey = getDateKey(selectedDate);
    const stopMembers = onSnapshot(
      collection(db, "teams", manager.teamId, "members"),
      (snapshot) => {
        setTeamMembers(
          snapshot.docs.map((item) => ({ ...item.data(), id: item.id })),
        );
      },
    );
    const stopAttendance = onSnapshot(
      collection(db, "teams", manager.teamId, "attendance", dateKey, "punches"),
      (snapshot) => {
        setAttendance(
          Object.fromEntries(
            snapshot.docs.map((item) => [item.id, item.data()]),
          ),
        );
      },
    );
    return () => {
      stopMembers();
      stopAttendance();
    };
  }, [manager?.role, manager?.teamId, selectedDate]);

  const counts = useMemo(() => {
    const result = { present: 0, absent: 0, halfday: 0 };
    teamMembers.forEach((member) => {
      const status = attendance[member.id]?.status;
      if (status in result) result[status] += 1;
    });
    return {
      ...result,
      unmarked:
        teamMembers.length - result.present - result.absent - result.halfday,
    };
  }, [attendance, teamMembers]);

  const updateAttendance = async ({ teamId, dateKey, member, status }) => {
    try {
      await setDoc(
        doc(db, "teams", teamId, "attendance", dateKey, "punches", member.id),
        {
          id: member.id,
          firstName: member.firstName || "",
          lastName: member.lastName || "",
          status,
          entryType: "manager",
          markedBy: manager.id,
          markedAt: serverTimestamp(),
          punchIn: null,
          punchOut: null,
          totalHoursWorked: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      toast.success("Attendance updated");
    } catch (error) {
      console.error("Manager attendance update failed:", error);
      toast.error("Could not update attendance");
    }
  };

  if (memberLoading || teamLoading || !manager || !team) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner className="size-8" />
      </div>
    );
  }
  if (manager.role !== "manager") return null;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <Card>
        <CardContent className="space-y-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">{team.name}</h2>
                <p className="text-sm text-muted-foreground">
                  Mark and review team attendance
                </p>
              </div>
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start sm:w-[240px]"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(selectedDate, "PPP")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  disabled={(date) => date > new Date()}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex flex-wrap gap-5 border-t pt-5">
            <Count
              icon={CheckCircle}
              label={`${counts.present} Present`}
              className="text-emerald-500"
            />
            <Count
              icon={XCircle}
              label={`${counts.absent} Absent`}
              className="text-destructive"
            />
            <Count
              icon={Clock}
              label={`${counts.halfday} Half day`}
              className="text-amber-500"
            />
            <Count
              icon={Users}
              label={`${counts.unmarked} Unmarked`}
              className="text-muted-foreground"
            />
          </div>
        </CardContent>
      </Card>
      <Members
        members={teamMembers}
        selectedDate={selectedDate}
        attendance={attendance}
        team={team}
        updateAttendance={updateAttendance}
        handleMemberRemoved={() => {}}
        setModalOpen={() => {}}
        currentUserId={manager.id}
      />
    </div>
  );
}
