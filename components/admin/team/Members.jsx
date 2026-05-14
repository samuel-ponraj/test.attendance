"use client";

import { useMemo, useState } from "react";
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

  const filteredMembers = useMemo(() => {
    return members.filter((member) => {
      const query = search.toLowerCase();
      const fullName =
        `${member.firstName || ""} ${member.lastName || ""}`.toLowerCase();

      const matchesSearch =
        fullName.includes(query) ||
        member.email?.toLowerCase().includes(query) ||
        member.role?.toLowerCase().includes(query);

      if (!matchesSearch) return false;

      const memberStatus = attendance?.[member.id]?.status ?? "unmarked";

      if (statusFilter !== "all") {
        if (statusFilter === "unmarked" && attendance?.[member.id]) {
          return false;
        }

        if (statusFilter !== "unmarked" && memberStatus !== statusFilter) {
          return false;
        }
      }

      return true;
    });
  }, [members, search, statusFilter, attendance]);

  const totalRows = filteredMembers.length;
  const totalPages = Math.ceil(totalRows / rowsPerPage);
  const safeCurrentPage =
    totalPages > 0 ? Math.min(currentPage, totalPages) : 1;
  const startIndex = (safeCurrentPage - 1) * rowsPerPage;

  const paginatedMembers = filteredMembers.slice(
    startIndex,
    startIndex + rowsPerPage
  );

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h2 className="text-lg font-semibold">
          Team Members ({filteredMembers.length}) -{" "}
          {format(selectedDate, "MMM d, yyyy")}
        </h2>

        <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center md:gap-3">
          <Select
            value={statusFilter}
            onValueChange={(value) => {
              setStatusFilter(value);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="Attendance" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">All Attendance</SelectItem>
                <SelectItem value="present">Present</SelectItem>
                <SelectItem value="absent">Absent</SelectItem>
                <SelectItem value="unmarked">Unmarked</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>

          <div className="flex-1 md:w-[250px]">
            <input
              type="text"
              placeholder="Search by name, email or role"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </div>

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

          <div className="flex items-center justify-between gap-4 px-2 py-6">
            <div className="hidden text-sm text-muted-foreground lg:block">
              Showing {totalRows === 0 ? 0 : startIndex + 1} to{" "}
              {Math.min(startIndex + rowsPerPage, totalRows)} of {totalRows}{" "}
              Members
            </div>

            <div className="flex w-full items-center justify-between gap-6 lg:w-auto lg:justify-end lg:gap-8">
              <div className="hidden items-center gap-2 lg:flex">
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

              <div className="flex items-center justify-center text-sm font-medium">
                Page {totalPages === 0 ? 0 : safeCurrentPage} of{" "}
                {totalPages || 1}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  className="hidden h-8 w-8 p-0 lg:flex"
                  onClick={() => setCurrentPage(1)}
                  disabled={safeCurrentPage === 1}
                >
                  {"<<"}
                </Button>

                <Button
                  variant="outline"
                  className="h-8 w-8 p-0"
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={safeCurrentPage === 1}
                >
                  {"<"}
                </Button>

                <Button
                  variant="outline"
                  className="h-8 w-8 p-0"
                  onClick={() =>
                    setCurrentPage((p) => Math.min(p + 1, totalPages || 1))
                  }
                  disabled={safeCurrentPage === totalPages || totalPages === 0}
                >
                  {">"}
                </Button>

                <Button
                  variant="outline"
                  className="hidden h-8 w-8 p-0 lg:flex"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={safeCurrentPage === totalPages || totalPages === 0}
                >
                  {">>"}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

function EmptyState({ onAdd }) {
  return (
    <Card>
      <CardContent className="space-y-4 p-6 text-center">
        <Users className="mx-auto h-12 w-12 text-muted-foreground" />
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
