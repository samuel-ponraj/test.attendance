"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, UserPlus } from "lucide-react";
import MemberRow from "../members/MemberRow";

export default function Members({
  members,
  selectedDate,
  attendance,
  team,
  updateAttendance,
  handleMemberRemoved,
  setModalOpen,
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  /* ---------- FILTER LOGIC ---------- */
  const filteredMembers = useMemo(() => {
    return members.filter((member) => {
      const query = search.toLowerCase();

      const fullName = `${member.firstName || ""} ${member.lastName || ""}`.toLowerCase();

      const matchesSearch =
        fullName.includes(query) ||
        member.email?.toLowerCase().includes(query) ||
        member.role?.toLowerCase().includes(query);

      if (!matchesSearch) return false;

      const memberStatus = attendance?.[member.id]?.status ?? "unmarked";

      if (statusFilter === "all") return true;
      if (statusFilter === "unmarked")
        return !attendance?.[member.id];

      return memberStatus === statusFilter;
    });
  }, [members, search, statusFilter, attendance]);

  const totalRows = filteredMembers.length;
  const totalPages = Math.ceil(totalRows / rowsPerPage);

  const startIndex = (currentPage - 1) * rowsPerPage;

  const paginatedMembers = filteredMembers.slice(
    startIndex,
    startIndex + rowsPerPage
  );

  return (
    <>
      {/* Members Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
        <h2 className="text-lg font-semibold">
          Team Members ({filteredMembers.length}) –{" "}
          {format(selectedDate, "MMM d, yyyy")}
        </h2>

        <div className="flex w-full gap-2 md:w-auto md:gap-3 md:items-center">
          {/* Filter */}
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
              placeholder="Search by name, email or role"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {/* Members List */}
      {members.length === 0 ? (
        <EmptyState onAdd={() => setModalOpen(true)} />
      ) : filteredMembers.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            No members found
          </CardContent>
        </Card>
      ) : (
        <>
        <div className="space-y-4">
          {paginatedMembers.map((member) => (
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
          <div className="flex items-center justify-between gap-4 py-6 px-2">

  <div className="hidden lg:block text-sm text-muted-foreground">
    Showing {totalRows === 0 ? 0 : startIndex + 1} to {Math.min(startIndex + rowsPerPage, totalRows)} of {totalRows} Members
  </div>

  <div className="flex w-full lg:w-auto items-center justify-between lg:justify-end gap-6 lg:gap-8">

    {/* Rows per page */}
    <div className="hidden lg:flex items-center gap-2">
      <p className="text-sm font-medium">Rows</p>

      <Select
        value={`${rowsPerPage}`}
        onValueChange={(value) => {
          setRowsPerPage(Number(value));
          setCurrentPage(1);
        }}
      >
        <SelectTrigger className="h-8 w-[70px]">
          <SelectValue />
        </SelectTrigger>

        <SelectContent align="end">
          {[10, 20, 50].map((size) => (
            <SelectItem key={size} value={`${size}`}>
              {size}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>

    {/* Page info */}
    <div className="flex items-center justify-center text-sm font-medium">
      Page {totalPages === 0 ? 0 : currentPage} of {totalPages || 1}
    </div>

    {/* Controls */}
    <div className="flex items-center gap-2">

      <Button
        variant="outline"
        className="hidden lg:flex h-8 w-8 p-0"
        onClick={() => setCurrentPage(1)}
        disabled={currentPage === 1}
      >
        «
      </Button>

      <Button
        variant="outline"
        className="h-8 w-8 p-0"
        onClick={() => setCurrentPage((p) => p - 1)}
        disabled={currentPage === 1}
      >
        ‹
      </Button>

      <Button
        variant="outline"
        className="h-8 w-8 p-0"
        onClick={() => setCurrentPage((p) => p + 1)}
        disabled={currentPage === totalPages}
      >
        ›
      </Button>

      <Button
        variant="outline"
        className="hidden lg:flex h-8 w-8 p-0"
        onClick={() => setCurrentPage(totalPages)}
        disabled={currentPage === totalPages}
      >
        »
      </Button>

    </div>

  </div>
</div>
          
        </>
      )}

      
    </>
  );
}

/* ---------- Empty State ---------- */
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