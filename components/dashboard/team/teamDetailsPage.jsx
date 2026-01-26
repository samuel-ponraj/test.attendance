"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
<<<<<<< HEAD
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent } from "@/components/ui/card";

import { ArrowLeft, Users, CalendarIcon, CheckCircle, XCircle, UserPlus } from "lucide-react";

import { db } from "@/lib/firebase";
import { collection, doc, getDoc, getDocs, setDoc, Timestamp, updateDoc, increment, serverTimestamp  } from "firebase/firestore";
=======
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  Upload,
} from "lucide-react";

import { doc, getDoc, updateDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
>>>>>>> c39aa9d3570ced9499a5f3473f6b937ca0c693a8

import AddMemberModal from "../addMemberModal";
import MemberRow from "../members/MemberRow";
import { getDateKey } from "../../../lib/DateKey";
import Link from "next/link";
<<<<<<< HEAD
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

=======
>>>>>>> c39aa9d3570ced9499a5f3473f6b937ca0c693a8

export default function TeamDetailsPage() {
  const router = useRouter();
  const { slug } = useParams();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [team, setTeam] = useState(null);
<<<<<<< HEAD
  const [members, setMembers] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");


  /* ---------------- FETCH TEAM & MEMBERS ---------------- */
  useEffect(() => {
    if (!slug) return;

    const fetchTeamData = async () => {
      setLoading(true);
      try {
        // Team doc
        const teamDoc = await getDoc(doc(db, "teams", slug)); // ✅ correct

        if (!teamDoc.exists()) {
          setLoading(false);
          return;
        }
        setTeam({ id: teamDoc.id, ...teamDoc.data() });

        // Fetch members subcollection
        const membersSnap = await getDocs(collection(db, "teams", slug, "members"));
        const membersList = membersSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setMembers(membersList);

        // Fetch today's attendance subcollection
        const dateKey = getDateKey(selectedDate);
        const attendanceDoc = await getDoc(
            doc(db, "teams", slug, "attendance", dateKey)
          );

          if (attendanceDoc.exists()) {
            const attendanceMap = {};
            const membersMap = attendanceDoc.data().members || {};
              setAttendance(membersMap);
          } else {
            setAttendance({});
          }
      } catch (err) {
        console.error("Failed to fetch team data:", err);
=======
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState("");

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
>>>>>>> c39aa9d3570ced9499a5f3473f6b937ca0c693a8
      } finally {
        setLoading(false);
      }
    };

<<<<<<< HEAD

    fetchTeamData();
  }, [slug, selectedDate]);
=======
    fetchTeam();
  }, [slug]);
>>>>>>> c39aa9d3570ced9499a5f3473f6b937ca0c693a8

  if (loading || !team) {
    return <div className="p-6">Loading team...</div>;
  }

<<<<<<< HEAD
  /* ---------------- DERIVED COUNTS ---------------- */
=======
  /* ---------------- DERIVED COUNTS (KEY FIX) ---------------- */
  const dateKey = getDateKey(selectedDate);
  const members = team.members || [];
  const attendanceToday = team.attendance?.[dateKey] || {};

>>>>>>> c39aa9d3570ced9499a5f3473f6b937ca0c693a8
  let presentCount = 0;
  let absentCount = 0;

  members.forEach((m) => {
<<<<<<< HEAD
    const entry = attendance[m.id];
    if (!entry) return;
=======
    const entry = attendanceToday[m.id];
    if (!entry) return;

>>>>>>> c39aa9d3570ced9499a5f3473f6b937ca0c693a8
    if (entry.status === "present") presentCount++;
    else if (entry.status === "absent") absentCount++;
  });

  const totalCount = members.length;
  const unmarkedCount = totalCount - presentCount - absentCount;

  /* ---------------- UPDATE ATTENDANCE ---------------- */
<<<<<<< HEAD

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
  const handleMemberRemoved = async (memberId) => {
  if (!confirm("Remove this member from the team?")) return;

  try {
    await removeTeamMember({
      teamId: slug,
      memberId,
    });

    // UI sync
    setMembers(prev => prev.filter(m => m.id !== memberId));
    setAttendance(prev => {
      const copy = { ...prev };
      delete copy[memberId];
      return copy;
    });

  } catch (err) {
    console.error(err);
    alert("Failed to remove member");
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
      <div className="flex justify-between items-center">
        <button
          onClick={() => router.push("/dashboard/teams")}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Teams
        </button>

        <Button onClick={() => setModalOpen(true)}>
          <UserPlus /> Add Member
        </Button>
      </div>

      {/* Team Info */}
      <Card>
        <CardContent className="py-2 space-y-6">
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
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Counts */}
          <div className="flex flex-wrap gap-4 pt-6 border-t justify-center md:justify-start">
            <Count icon={CheckCircle} label={`${presentCount} Present`} color="success" />
            <Count icon={XCircle} label={`${absentCount} Absent`} color="destructive" />
            <Count icon={Users} label={`${unmarkedCount} Unmarked`} color="muted" />
          </div>
        </CardContent>
      </Card>

      {/* Members Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h2 className="text-lg font-semibold">
          Team Members ({filteredMembers.length}) – {format(selectedDate, "MMM d, yyyy")}
        </h2>



        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
  
  {/* Button — full width on mobile */}
  <Link href={`/dashboard/teams/${team.id}/members`} className="w-full md:w-auto">
    <Button className="w-full">View Members List</Button>
  </Link>

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
        teamId={team.id}
        onMemberAdded={async () => {
          const membersSnap = await getDocs(collection(db, "teams", team.id, "members"));
          const membersList = membersSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
          setMembers(membersList);
        }}
      />
=======
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

	/* ---------------- Search Bar ---------------- */
  	const filteredMembers = members.filter((member) => {
	const query = search.toLowerCase();

	return (
		member.name?.toLowerCase().includes(query) ||
		member.email?.toLowerCase().includes(query) ||
		member.contact?.toLowerCase().includes(query)
	);
	});


  
  return (
    <div className="space-y-6 ">
      {/* Back */}
      <div className="flex justify-between">
          <button
            onClick={() => router.push("/dashboard/teams")}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Teams
          </button>

          	<Button onClick={() => setModalOpen(true)}>
                <UserPlus /> Add Member
              </Button>
        </div>
      
          <Card>
            <CardContent className="py-2 space-y-6 ">
              <div className="flex flex-col sm:flex-row justify-between gap-4 ">
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
                <div className="flex justify-center">
					<Popover >
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
              </div>

              {/* Counts */}
              <div className="flex flex-wrap gap-4 pt-6 border-t justify-center md:justify-start">

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

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
			<h2 className="text-lg font-semibold">
				Team Members ({filteredMembers.length}) –{" "}
				{format(selectedDate, "MMM d, yyyy")}
			</h2>

			<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
				<Link href={`/dashboard/teams/${team.id}/members`}>
					<Button className="w-full">View Members List</Button>
				</Link>
				<div className="w-full md:w-72 ">
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
          
          

          {members.length === 0 ? (
            <EmptyState onAdd={() => setModalOpen(true)} />
          ) : (
            <div className="space-y-4">
              {filteredMembers.length === 0 ? (
				<Card>
					<CardContent className="p-6 text-center text-muted-foreground">
					No members found
					</CardContent>
				</Card>
				) : (
				<div className="space-y-4">
					{filteredMembers.map((member) => (
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
				</div>
)}              
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

       
>>>>>>> c39aa9d3570ced9499a5f3473f6b937ca0c693a8
    </div>
  );
}

/* ---------------- SMALL COMPONENTS ---------------- */
<<<<<<< HEAD
=======

>>>>>>> c39aa9d3570ced9499a5f3473f6b937ca0c693a8
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
<<<<<<< HEAD
        <p className="text-muted-foreground">Add team members to start tracking attendance</p>
        <Button onClick={onAdd}>
          <UserPlus /> Add Member
        </Button>
=======
        <p className="text-muted-foreground">
          Add team members to start tracking attendance
        </p>
        <div className="flex align-center justify-center gap-4"> 
        <Button onClick={onAdd}>
          <UserPlus /> Add Member
        </Button>
        {/* <Button onClick={onAdd}>
          <Upload /> Upload Members
        </Button> */}
        </div>
>>>>>>> c39aa9d3570ced9499a5f3473f6b937ca0c693a8
      </CardContent>
    </Card>
  );
}
