"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent } from "@/components/ui/card";

import { ArrowLeft, Users, CalendarIcon, CheckCircle, XCircle, UserPlus } from "lucide-react";

import { db } from "@/lib/firebase";
import { collection, doc, getDoc, getDocs, setDoc, Timestamp, updateDoc, increment, serverTimestamp  } from "firebase/firestore";

import AddMemberModal from "../addMemberModal";
import MemberRow from "../members/MemberRow";
import { getDateKey } from "../../../lib/DateKey";
import Link from "next/link";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { updateAttendanceSummary } from "@/lib/updateAttendanceSummary";
import { removeTeamMember } from "../../../lib/removeTeamMember"
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




export default function TeamDetailsPage() {
  const router = useRouter();
  const { slug } = useParams();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [team, setTeam] = useState(null);
  const [members, setMembers] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [memberToRemove, setMemberToRemove] = useState(null);
  const [importOpen, setImportOpen] = useState(false);


  const fetchTeamData = async () => {
        if (!slug) return;
        setLoading(true);
        try {
          // Fetch Team
          const teamDoc = await getDoc(doc(db, "teams", slug)); 
          if (!teamDoc.exists()) {
            setLoading(false);
            return;
          }
          setTeam({ id: teamDoc.id, ...teamDoc.data() });

          // Fetch Members
          const membersSnap = await getDocs(collection(db, "teams", slug, "members"));
          const membersList = membersSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
          setMembers(membersList);

          // Fetch Attendance
          const dateKey = getDateKey(selectedDate);
          const attendanceDoc = await getDoc(doc(db, "teams", slug, "attendance", dateKey));

          if (attendanceDoc.exists()) {
            setAttendance(attendanceDoc.data().members || {});
          } else {
            setAttendance({});
          }
        } catch (err) {
          console.error("Failed to fetch team data:", err);
        } finally {
          setLoading(false);
        }
      };

      useEffect(() => {
        fetchTeamData();
      }, [slug, selectedDate]);

      /* ---------------- 3. CALL ON IMPORT SUCCESS ---------------- */
      const handleImportSuccess = () => {
        fetchTeamData();
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

  members.forEach((m) => {
    const entry = attendance[m.id];
    if (!entry) return;
    if (entry.status === "present") presentCount++;
    else if (entry.status === "absent") absentCount++;
  });

  const totalCount = members.length;
  const unmarkedCount = totalCount - presentCount - absentCount;

  /* ---------------- UPDATE ATTENDANCE ---------------- */

 const updateAttendance = async ({ teamId, dateKey, member, status }) => {
  const entry = {
    id: member.id,
    name: member.name,
    email: member.email,
    status,
    markedAt: serverTimestamp(),
  };

  const updatedAttendance = {
    ...attendance,
    [member.id]: entry,
  };

  // 🔥 Optimistic UI
  setAttendance(updatedAttendance);

  // ✅ Create / update date doc
  await setDoc(
    doc(db, "teams", teamId, "attendance", dateKey),
    {
      members: {
        [member.id]: entry,
      },
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  // ✅ Update team summary
  await updateAttendanceSummary({
  teamId: slug,
  attendanceMap: updatedAttendance,
  dateKey: getDateKey(selectedDate),
});
};


  /* ---------------- MEMBER REMOVAL ---------------- */

  const handleMemberRemoved = (memberId) => {
      setMemberToRemove(memberId);
    };


  const confirmRemoveMember = async () => {
  if (!memberToRemove) return;

  try {
    await removeTeamMember({
      teamId: slug,
      memberId: memberToRemove,
    });

    setMembers(prev => prev.filter(m => m.id !== memberToRemove));
    setAttendance(prev => {
      const copy = { ...prev };
      delete copy[memberToRemove];
      return copy;
    });

    toast.success("Member removed successfully");
  } catch (err) {
    console.error(err);
    toast.error("Failed to remove member");
  } finally {
    setMemberToRemove(null);
  }
};


  /* ---------------- SEARCH FILTER ---------------- */
  const filteredMembers = members.filter((member) => {
  const query = search.toLowerCase();

  // 🔍 Search match
  const matchesSearch =
    member.name?.toLowerCase().includes(query) ||
    member.email?.toLowerCase().includes(query) ||
    member.contact?.toLowerCase().includes(query);

  if (!matchesSearch) return false;

  // 🎯 Status match
  const memberStatus = attendance?.[member.id]?.status ?? "unmarked";

  if (statusFilter === "all") return true;
  if (statusFilter === "unmarked") return !attendance?.[member.id];
  return memberStatus === statusFilter;
});

  const dateKey = getDateKey(selectedDate);

  return (
    <div className="space-y-6">
      {/* Back & Add */}
      <div className="flex justify-between items-center mb-4 sm:mb-4">
        <button
          onClick={() => router.push("/dashboard")}
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
              <Link href={`/dashboard/teams/${team.id}/members`} className="w-full">
                <Button className="w-full">View Members</Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      <ImportExcelSheet
          open={importOpen}
          onOpenChange={setImportOpen}
          team={team}
          onSuccess={handleImportSuccess}
        />


      {/* Members Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h2 className="text-lg font-semibold">
          Team Members ({filteredMembers.length}) – {format(selectedDate, "MMM d, yyyy")}
        </h2>



        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
  {/* Filter + Search wrapper */}
          <div className="flex w-full gap-2 md:w-auto md:gap-3 md:items-center">
            
            {/* Select */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-35 md:w-48">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="present">Present</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                  <SelectItem value="unmarked">Unmarked</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>

            {/* Search */}
            <div className="flex-1 md:w-[250px]">
              <input
                type="text"
                placeholder="Search by name, email or contact"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

          </div>
      </div>

      </div>

      {/* Members List */}
      {members.length === 0 ? (
        <EmptyState onAdd={() => setModalOpen(true)} />
      ) : filteredMembers.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">No members found</CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredMembers.map((member) => (
            <MemberRow
              key={member.id}
              member={member}
              teamId={team.id}
              selectedDate={selectedDate}
              attendance={attendance}
              onUpdateAttendance={updateAttendance}
              onRemove={handleMemberRemoved}
            />
          ))}
        </div>
      )}

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


