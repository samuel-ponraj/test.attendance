"use client";

import { useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MoreVertical,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { auth, app } from "@/lib/firebase";
import { httpsCallable, getFunctions } from "firebase/functions";

const getBillingLabel = (team) => {
  const billingType = team?.billingConfig?.billingType;

  if (billingType === "salary") return "Salary";
  if (billingType === "fixed") return "Fixed Billing";
  if (billingType === "attendanceBased") return "Attendance Based";

  return "Not Configured";
};

const formatDate = (value) => {
  if (!value) return "-";

  const date = value?.seconds
    ? new Date(value.seconds * 1000)
    : new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const TeamCardLayout = ({ teams }) => {
  const functions = getFunctions(app);
  const router = useRouter();

  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [otpDialogOpen, setOtpDialogOpen] = useState(false);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [billingFilter, setBillingFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const closeAllDialogs = () => {
    setSelectedTeamId(null);
    setOtpDialogOpen(false);
    setOtp("");
  };

  const sortedTeams = useMemo(() => {
    return [...(teams || [])].sort((a, b) => {
      const aTime = a.createdAt?.seconds
        ? a.createdAt.seconds * 1000
        : new Date(a.createdAt || 0).getTime();
      const bTime = b.createdAt?.seconds
        ? b.createdAt.seconds * 1000
        : new Date(b.createdAt || 0).getTime();

      return bTime - aTime;
    });
  }, [teams]);

  const billingOptions = [
    ["all", "All Billing Types"],
    ["salary", "Salary"],
    ["fixed", "Fixed Billing"],
    ["attendanceBased", "Attendance Based"],
    ["not_configured", "Not Configured"],
  ];

  const filteredTeams = sortedTeams.filter((team) => {
    const query = search.trim().toLowerCase();
    const matchesSearch = query
      ? `${team.name || ""} ${team.description || ""}`
          .toLowerCase()
          .includes(query)
      : true;

    const matchesBilling =
      billingFilter === "all"
        ? true
        : billingFilter === "fixed"
          ? team?.billingConfig?.billingType === "fixed"
          : billingFilter === "attendanceBased"
            ? team?.billingConfig?.billingType === "attendanceBased"
            : billingFilter === "salary"
              ? team?.billingConfig?.billingType === "salary"
              : billingFilter === "not_configured"
                ? !team?.billingConfig?.billingType
                : false;

    return matchesSearch && matchesBilling;
  });

  const totalRows = filteredTeams.length;
  const totalPages = Math.ceil(totalRows / rowsPerPage);
  const safeCurrentPage =
    totalPages > 0 ? Math.min(currentPage, totalPages) : 1;
  const startIndex = (safeCurrentPage - 1) * rowsPerPage;
  const paginatedTeams = filteredTeams.slice(
    startIndex,
    startIndex + rowsPerPage
  );

  const handleSendOtp = async () => {
    if (!auth.currentUser || !selectedTeamId) return;

    setLoading(true);
    try {
      const res = await fetch("/api/team/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId: selectedTeamId,
          userEmail: auth.currentUser.email,
          userId: auth.currentUser.uid,
        }),
      });

      const result = await res.json();

      if (result.success) {
        toast.success("OTP sent!");
        setOtpDialogOpen(true);
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      console.error("Send OTP error:", error);
      toast.error("Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTeam = async () => {
    if (!auth.currentUser || !selectedTeamId || !otp) return;

    setLoading(true);
    try {
      const verifyDelete = httpsCallable(functions, "verifyOtpAndDeleteTeam");

      const result = await verifyDelete({
        teamId: selectedTeamId,
        otp,
      });

      if (result.data.success) {
        toast.success("Team deleted successfully");
        closeAllDialogs();
        router.refresh();
      }
    } catch (error) {
      console.error("Delete error:", error);
      toast.error(error?.message || "Delete failed");
    } finally {
      setLoading(false);
    }
  };

  if (!teams || teams.length === 0) return null;

  return (
    <>
      <div className="space-y-4 px-4 lg:px-6">
        <div className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_240px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search teams..."
              className="pl-9"
            />
          </div>

          <Select
            value={billingFilter}
            onValueChange={(value) => {
              setBillingFilter(value);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All Billing Types" />
            </SelectTrigger>

            <SelectContent>
              {billingOptions.map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="px-4">Team</TableHead>
                <TableHead>Billing Type</TableHead>
                <TableHead>Members</TableHead>
                <TableHead>Today&apos;s Attendance</TableHead>
                <TableHead>Payroll Status</TableHead>
                <TableHead>Created On</TableHead>
                <TableHead className="text-right pr-4">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filteredTeams.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No teams found.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedTeams.map((team) => {
                  const present = Number(team.attendanceSummary?.present || 0);
                  const absent = Number(team.attendanceSummary?.absent || 0);
                  const halfday = Number(team.attendanceSummary?.halfday || 0);
                  const payrollDue = Boolean(team.billing?.totalBalance > 0);

                  return (
                    <TableRow
                      key={team.id}
                      onClick={() => router.push(`/admin/teams/${team.id}`)}
                      className="cursor-pointer hover:bg-muted/50"
                    >
                      <TableCell className="px-4 ">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <Users className="h-4 w-4" />
                          </div>

                          <div className="min-w-0">
                            <p className="font-medium truncate">{team.name}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {team.description || "Manage team members"}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <span className="inline-flex rounded-md border px-2 py-1 text-xs font-medium border-muted bg-muted/40 text-muted-foreground min-w-[140px] justify-center">
                          {getBillingLabel(team)}
                        </span>
                      </TableCell>

                      <TableCell>{Number(team.totalMembers || 0)}</TableCell>

                      <TableCell>
                        <div className="space-y-2 min-w-[170px]">
                          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <span className="h-2 w-2 rounded-full bg-emerald-500" />
                              {present} Present
                            </span>

                            <span className="flex items-center gap-1">
                              <span className="h-2 w-2 rounded-full bg-red-500" />
                              {absent} Absent
                            </span>

                            <span className="flex items-center gap-1">
                              <span className="h-2 w-2 rounded-full bg-orange-500" />
                              {halfday} Halfday
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <span
                          className={`inline-flex rounded-md border px-2 py-1 text-xs font-medium ${
                            payrollDue
                              ? "border-amber-500/30 bg-amber-500/10 text-amber-600"
                              : "border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
                          }`}
                        >
                          {payrollDue ? "Payroll Due" : "Up to date"}
                        </span>
                      </TableCell>

                      <TableCell className="text-muted-foreground">
                        {formatDate(team.createdAt)}
                      </TableCell>

                      <TableCell className="pr-4">
                        <div className="flex justify-end gap-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={(event) => event.stopPropagation()}
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setSelectedTeamId(team.id);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                                Delete Team
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between gap-4 px-2 py-4">
          <div className="hidden text-sm text-muted-foreground lg:block">
            Showing {totalRows === 0 ? 0 : startIndex + 1} to{" "}
            {Math.min(startIndex + rowsPerPage, totalRows)} of {totalRows} teams
          </div>

          <div className="flex w-full items-center justify-between gap-6 lg:w-auto lg:justify-end lg:gap-8">
            <div className="hidden items-center gap-2 lg:flex">
              <p className="text-sm font-medium">Rows per page</p>

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
                  {[10, 20, 30, 40, 50].map((pageSize) => (
                    <SelectItem key={pageSize} value={`${pageSize}`}>
                      {pageSize}
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
                <ChevronsLeft className="h-4 w-4" />
              </Button>

              <Button
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() =>
                  setCurrentPage((page) => Math.max(page - 1, 1))
                }
                disabled={safeCurrentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <Button
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() =>
                  setCurrentPage((page) => Math.min(page + 1, totalPages || 1))
                }
                disabled={safeCurrentPage === totalPages || totalPages === 0}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>

              <Button
                variant="outline"
                className="hidden h-8 w-8 p-0 lg:flex"
                onClick={() => setCurrentPage(totalPages)}
                disabled={safeCurrentPage === totalPages || totalPages === 0}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <AlertDialog
        open={!!selectedTeamId && !otpDialogOpen}
        onOpenChange={(open) => {
          if (!open) closeAllDialogs();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this team?</AlertDialogTitle>
            <AlertDialogDescription>
              An OTP will be sent to your email to confirm deletion.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <Button
              variant="outline"
              onClick={closeAllDialogs}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendOtp}
              disabled={loading}
              variant="destructive"
            >
              {loading ? "Sending OTP..." : "Send OTP"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={otpDialogOpen}
        onOpenChange={(open) => {
          if (!open) closeAllDialogs();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Enter OTP</AlertDialogTitle>
            <AlertDialogDescription>
              Enter the 6-digit OTP sent to your email.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <Input
            placeholder="Enter OTP"
            value={otp}
            onChange={(event) => setOtp(event.target.value)}
            maxLength={6}
          />

          <AlertDialogFooter>
            <Button
              variant="outline"
              onClick={closeAllDialogs}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteTeam}
              disabled={loading || otp.length !== 6}
              variant="destructive"
            >
              {loading ? "Deleting..." : "Confirm Delete"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default TeamCardLayout;
