"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Check, Search, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Kept separate from the administrator member tab: managers have a smaller,
// attendance-only surface and can be given manager-specific rules safely.
export default function MembersTab({ members = [], selectedDate, attendance = {}, teamId, onUpdateAttendance, currentUserId }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");

  const visibleMembers = useMemo(() => members.filter((member) => {
    const name = `${member.firstName || ""} ${member.lastName || ""}`.trim();
    const matchesSearch = [name, member.email, member.role]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(search.toLowerCase()));
    const attendanceStatus = attendance[member.id]?.status || "unmarked";
    return matchesSearch && (status === "all" || attendanceStatus === status);
  }), [attendance, members, search, status]);

  const dateKey = selectedDate?.toLocaleDateString("en-CA");

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Team Members ({visibleMembers.length})</h2>
          <p className="text-sm text-muted-foreground">{selectedDate ? format(selectedDate, "MMM d, yyyy") : ""}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <input className="w-full rounded-md border py-2 pl-9 pr-3 text-sm sm:w-64" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search members" />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="sm:w-44"><SelectValue placeholder="Attendance" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All attendance</SelectItem>
              <SelectItem value="present">Present</SelectItem>
              <SelectItem value="absent">Absent</SelectItem>
              <SelectItem value="halfday">Half day</SelectItem>
              <SelectItem value="unmarked">Unmarked</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {visibleMembers.length ? visibleMembers.map((member) => {
        const currentStatus = attendance[member.id]?.status || "unmarked";
        const name = `${member.firstName || ""} ${member.lastName || ""}`.trim() || member.email;
        const canMark = member.id !== currentUserId;
        return (
          <Card key={member.id}>
            <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
              <Link href={`/member/members/${member.id}`} className="min-w-0">
                <p className="font-medium">{name}</p>
                <p className="truncate text-sm text-muted-foreground">{member.email || "No email"} · {member.role || "member"}</p>
              </Link>
              <div className="flex items-center gap-2">
                <span className="mr-1 text-sm capitalize text-muted-foreground">{currentStatus}</span>
                <Button size="sm" variant={currentStatus === "present" ? "default" : "outline"} disabled={!canMark} onClick={() => onUpdateAttendance({ teamId, dateKey, member, status: "present" })}><Check className="size-4" />Present</Button>
                <Button size="sm" variant={currentStatus === "absent" ? "destructive" : "outline"} disabled={!canMark} onClick={() => onUpdateAttendance({ teamId, dateKey, member, status: "absent" })}><X className="size-4" />Absent</Button>
              </div>
            </CardContent>
          </Card>
        );
      }) : (
        <Card><CardContent className="flex flex-col items-center gap-2 py-12 text-muted-foreground"><Users className="size-8" />No members found</CardContent></Card>
      )}
    </section>
  );
}
