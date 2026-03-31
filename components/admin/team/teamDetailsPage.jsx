"use client";
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Users, CalendarIcon, CheckCircle, XCircle, UserPlus, Clock, CalendarDays, UserRoundCheck } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, serverTimestamp, onSnapshot  } from "firebase/firestore";
import AddMemberModal from "../addMemberModal";
import { getDateKey } from "../../../lib/DateKey";
import Link from "next/link";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Spinner } from "@/components/ui/spinner"
import { FileSpreadsheet } from 'lucide-react';
import ImportExcelSheet from "../functions/ExcelSheetImport";
import { useAuth } from '../../../app/context/AuthContext'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Members from "./Members";
import MembersList from "../members/MembersList";



export default function TeamDetailsPage() {
  const router = useRouter();
  const { slug } = useParams();
  const { user } = useAuth()

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [team, setTeam] = useState(null);
  const [members, setMembers] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState(null);
  const [importOpen, setImportOpen] = useState(false);


  const fetchTeamData = useCallback(async () => {
    if (!slug) return;

    setLoading(true);
    let unsubscribePunches = null;

    try {
      // ✅ Fetch team doc
      const teamDoc = await getDoc(doc(db, "teams", slug));
      if (!teamDoc.exists()) {
        setTeam(null);
        setMembers([]);
        setAttendance({});
        setLoading(false);
        return;
      }

      setTeam({ id: teamDoc.id, ...teamDoc.data() });

      // ✅ Fetch team members
      const membersSnap = await getDocs(collection(db, "teams", slug, "members"));
      const membersList = membersSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setMembers(membersList);

      // ✅ Listen to attendance punches realtime
      const dateKey = getDateKey(selectedDate);
      const punchesRef = collection(db, "teams", slug, "attendance", dateKey, "punches");

      unsubscribePunches = onSnapshot(punchesRef, (snapshot) => {
        const attendanceMap = {};
        snapshot.forEach((doc) => {
          attendanceMap[doc.id] = doc.data();
        });
        setAttendance(attendanceMap);
      });

    } catch (err) {
      console.error("Failed to fetch team data:", err);
    } finally {
      setLoading(false);
    }

    return unsubscribePunches;
  }, [slug, selectedDate]);

  // -----------------------------
  // 2️⃣ useEffect to call fetchTeamData
  // -----------------------------
  useEffect(() => {
    let unsubscribe = null;

    fetchTeamData().then((unsub) => {
      unsubscribe = unsub;
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [fetchTeamData]);

  // -----------------------------
  // 3️⃣ Handler to refresh after import
  // -----------------------------
  const handleImportSuccess = async () => {
    await fetchTeamData();
  };
  

 if (loading || !team) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Spinner className="size-8" />
    </div>
  );
}


  /* ---------------- DERIVED COUNTS ---------------- */
  let presentCount = 0;
let absentCount = 0;
let halfdayCount = 0;

members.forEach((m) => {
  const entry = attendance[m.id];
  if (!entry) return;

  switch (entry.status) {
    case "present":
      presentCount++;
      break;
    case "absent":
      absentCount++;
      break;
    case "halfday":
      halfdayCount++;
      break;
  }
});

const totalCount = members.length;
const unmarkedCount = totalCount - (presentCount + absentCount + halfdayCount);

  /* ---------------- UPDATE ATTENDANCE ---------------- */

 const updateAttendance = async ({ teamId, dateKey, member, status }) => {
  try {
    const punchRef = doc(
      db,
      "teams",
      teamId,
      "attendance",
      dateKey,
      "punches",
      member.id
    );

    const teamRef = doc(db, "teams", teamId);

    const snap = await getDoc(punchRef);
    const now = serverTimestamp();

    if (snap.exists()) {
      await updateDoc(punchRef, {
        status,
        updatedAt: now,
        entryType: "admin"
      });
    } else {
      await setDoc(punchRef, {
        id: member.id,
        firstName: member.firstName,
        lastName: member.lastName,
        status,
        entryType: "admin",

        punchIn: null,
        punchOut: null,
        totalHoursWorked: 0,

        deviceInfo: {
          platform: "manual",
          version: null,
        },

        location: {
          lat: null,
          lng: null,
        },

        createdAt: now,
        updatedAt: now,
      });
    }

    // 🔥 Recalculate Summary For That Date
    const punchesSnap = await getDocs(
      collection(db, "teams", teamId, "attendance", dateKey, "punches")
    );

    let present = 0;
    let halfday = 0;
    let absent = 0;

    punchesSnap.forEach((doc) => {
      const data = doc.data();

      if (data.status === "present") present++;
      if (data.status === "halfday") halfday++;
      if (data.status === "absent") absent++;
    });

    // 🔥 Update Team Root attendanceSummary
    await setDoc(
        teamRef,
        {
          attendanceSummary: {
            present,
            halfday,
            absent,
            updatedAt: now,
          },
        },
        { merge: true }
      );

  } catch (error) {
    console.error("Attendance update failed:", error);
  }
};


  const handleMemberRemoved = (memberId) => {
      setMemberToRemove(memberId);
    };


  const confirmRemoveMember = async () => {
  if (!memberToRemove || !user?.uid) return;

  const functions = getFunctions();
  const removeMemberCall = httpsCallable(functions, 'removeMember');

  try {
    // We pass the email because we need it to target the 'allMembers' collection
    const memberData = members.find(m => m.id === memberToRemove);
    
    await removeMemberCall({
      teamId: slug,
      memberId: memberToRemove,
      email: memberData?.email
    });

    // Update Local UI State
    setMembers(prev => prev.filter(m => m.id !== memberToRemove));
    setAttendance(prev => {
      const copy = { ...prev };
      delete copy[memberToRemove];
      return copy;
    });

    toast.success("Member and account removed successfully");
  } catch (err) {
    console.error("Removal Error:", err);
    toast.error("Failed to remove member completely");
  } finally {
    setMemberToRemove(null);
  }
};


  return (
    <div className="space-y-6">
      {/* Back & Add */}
      <div className="flex justify-between items-center mb-4 sm:mb-4">
        <button
          onClick={() => router.push("/admin")}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <Button onClick={() => setModalOpen(true)}>
          <UserPlus /> Add Member
        </Button>
      </div>

      {/* Team Info */}
      <Card>
        <CardContent className="sm:py-2 py-0 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 flex items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">{team.name}</h2>
                <p className="text-muted-foreground">{team.description}</p>
              </div>
            </div>

            {/* Date Picker */}
            <div className="flex justify-center">
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
                    disabled={(date) => date > new Date()}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Counts */}
          <div className="flex border-t pt-6 justify-between flex-col md:flex-row gap-6 md:gap-0">
            <div className="flex flex-wrap gap-4 justify-center md:justify-start">
              <Count icon={CheckCircle} label={`${presentCount} Present`} color="success" />
              <Count icon={XCircle} label={`${absentCount} Absent`} color="destructive" />
              <Count icon={Clock} label={`${halfdayCount} Halfday`} color="warning" />
              <Count icon={Users} label={`${unmarkedCount} Unmarked`} color="muted" />
            </div>
            <div className="flex justify-center gap-4">
              <div className="w-full">
              <Button
                className="w-full"
                onClick={() => setImportOpen(true)}
              >
                <FileSpreadsheet className="h-4 w-4" />
                Import
              </Button>
              </div>
              <Link href={`/admin/teams/${team.id}/invite`} className="w-full">
              <Button>
                <UserPlus className="h-4 w-4" />
                Invite
              </Button>
              </Link>
              <Link href={`/admin/teams/${team.id}/schedule`} className="w-full">
                <Button className="w-full"><CalendarDays />Schedule</Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Tabs defaultValue="members" className="space-y-6">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="members">
                <UserRoundCheck className="w-4 h-4 hidden sm:inline" />
                Mark Attendance
              </TabsTrigger>
              <TabsTrigger value="schedule">
                <Users className="w-4 h-4 hidden sm:inline" />
                Members
              </TabsTrigger>
            </TabsList>

            {/* MEMBERS TAB */}
            <TabsContent value="members">
              <Members
                members={members}
                selectedDate={selectedDate}
                attendance={attendance}
                team={team}
                updateAttendance={updateAttendance}
                handleMemberRemoved={handleMemberRemoved}
                setModalOpen={setModalOpen}
              />
            </TabsContent>

            {/* SCHEDULE TAB */}
            <TabsContent value="schedule">
              <MembersList />
              {/* <Schedule teamId={team.id}/> */}
            </TabsContent>
        </Tabs>

      <ImportExcelSheet
          open={importOpen}
          onOpenChange={setImportOpen}
          team={team}
          onSuccess={handleImportSuccess}
        />



      {/* Add Member Modal */}
      <AddMemberModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        team={team}
        onMemberAdded={async () => {
          const membersSnap = await getDocs(collection(db, "teams", team.id, "members"));
          const membersList = membersSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
          setMembers(membersList);
        }}
      />
      <AlertDialog
          open={!!memberToRemove}
          onOpenChange={() => setMemberToRemove(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove member?</AlertDialogTitle>
              <AlertDialogDescription>
                This member will be permanently removed from the team.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmRemoveMember}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

    </div>

    
    
  );
}

/* ---------------- SMALL COMPONENTS ---------------- */
function Count({ icon: Icon, label, color }) {
  const colors = {
    success: "bg-success/10 text-success",
    destructive: "bg-destructive/10 text-destructive",
    warning: "bg-warning/10 text-warning",
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
        <p className="text-muted-foreground">Add team members to start tracking attendance</p>
        <Button onClick={onAdd}>
          <UserPlus /> Add Member
        </Button>
      </CardContent>
    </Card>
  );
}


