"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ArrowLeft, Users, CalendarIcon, CheckCircle, XCircle, Clock, UserPlus } from "lucide-react";

import { doc, getDoc, updateDoc, arrayUnion, increment, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import AddMemberModal from "../addMemberModal";
import MemberRow from "../members/MemberRow";

export default function TeamDetailsPage() {
  const router = useRouter();
  const { slug } = useParams(); // teamId
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  // Fetch team from Firestore
  useEffect(() => {
    if (!slug) return;

    const fetchTeam = async () => {
      setLoading(true);
      try {
        const snap = await getDoc(doc(db, "teams", slug));
        if (snap.exists()) {
          setTeam({ id: snap.id, ...snap.data() });
        } else {
          console.error("Team not found");
        }
      } catch (err) {
        console.error("Failed to fetch team:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTeam();
  }, [slug]);

  if (loading) {
    return <div className="p-6">Loading team...</div>;
  }

  const presentCount = team.present ?? 0;
  const absentCount = team.absent ?? 0;
  const totalCount = team.total ?? 0;
  const unmarkedCount = totalCount - presentCount - absentCount;

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={() => router.push("/dashboard/teams")}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
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
          {/* Header Card */}
          <div className="bg-card rounded-xl shadow-card p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 gradient-hero rounded-xl flex items-center justify-center">
                  <Users className="w-7 h-7 text-primary-foreground" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">{team.name}</h2>
                  <p className="text-muted-foreground">{team.description}</p>
                </div>
              </div>

              {/* Date Picker */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-[240px] justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(selectedDate, "PPP")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(d) => d && setSelectedDate(d)}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Counts */}
            <div className="flex flex-wrap gap-4 mt-6 pt-6 border-t">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-success" />
                </div>
                <span>{presentCount} Present</span>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center">
                  <XCircle className="w-4 h-4 text-destructive" />
                </div>
                <span>{absentCount} Absent</span>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                  <Users className="w-4 h-4 text-muted-foreground" />
                </div>
                <span>{unmarkedCount} Unmarked</span>
              </div>
            </div>
          </div>

          {/* Members */}
          <h2 className="text-lg font-semibold">
            Team Members ({team.members?.length ?? 0}) – {format(selectedDate, "MMM d, yyyy")}
          </h2>

          {(!team.members || team.members.length === 0) ? (
            <div className="bg-card rounded-xl p-12 text-center shadow-card">
              <div className="w-16 h-16 gradient-hero rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-primary-foreground" />
              </div>

              <h3 className="text-lg font-medium mb-2">No members yet</h3>
              <p className="text-muted-foreground mb-6">
                Add team members to start tracking attendance
              </p>

              <Button onClick={() => setModalOpen(true)}><UserPlus /> Add Member</Button>

              <AddMemberModal
                open={modalOpen}
                onOpenChange={setModalOpen}
                teamId={team.id}
                
                onMemberAdded={async () => {
                  // Refresh team after adding a member
                  const snap = await getDoc(doc(db, "teams", team.id));
                  if (snap.exists()) setTeam({ id: snap.id, ...snap.data() });
                }}
              />
            </div>
          ) : (
            <div className="space-y-4">
              {team.members.map((member) => (
                <MemberRow
                  key={member.id}
                  member={member}
                  teamId={team.id}
                  onMemberRemoved={(removedId) => {
                    setTeam((prev) => ({
                      ...prev,
                      members: prev.members.filter((m) => m.id !== removedId),
                      total: prev.total - 1,
                    }));
                  }}
                />
              ))}
             <Button onClick={() => setModalOpen(true)}><UserPlus /> Add Member</Button>
              <AddMemberModal
                open={modalOpen}
                onOpenChange={setModalOpen}
                teamId={team.id}
                onMemberAdded={async () => {
                  const snap = await getDoc(doc(db, "teams", team.id));
                  if (snap.exists()) setTeam({ id: snap.id, ...snap.data() });
                }}
              />
            </div>
          )}
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
              {/* Implement attendance history table here */}
              No history yet
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
