"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, doc, onSnapshot, serverTimestamp, writeBatch } from "firebase/firestore";
import { CalendarDays, CheckCircle2, ClipboardList, Clock3, Loader2, XCircle } from "lucide-react";
import { db } from "@/lib/firebase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

const dateKeys = (from, to) => {
  const result = [];
  const current = new Date(`${from}T00:00:00`);
  const last = new Date(`${to}T00:00:00`);
  while (current <= last && result.length < 31) {
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, "0");
    const day = String(current.getDate()).padStart(2, "0");
    result.push(`${year}-${month}-${day}`);
    current.setDate(current.getDate() + 1);
  }
  return result;
};

const initials = (name = "") => name.split(" ").filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "M";
const roleClass = (role) => role === "manager"
  ? "bg-warning/10 text-warning border-warning/20"
  : "bg-blue-500/10 text-blue-500 border-blue-500/20";

const statsConfig = [
  { key: "all", label: "Total requests", icon: ClipboardList, color: "text-blue-500", box: "bg-blue-500/10" },
  { key: "pending", label: "Pending", icon: Clock3, color: "text-amber-500", box: "bg-amber-500/10" },
  { key: "approved", label: "Approved", icon: CheckCircle2, color: "text-emerald-500", box: "bg-emerald-500/10" },
  { key: "rejected", label: "Rejected", icon: XCircle, color: "text-red-500", box: "bg-red-500/10" },
];

export default function LeaveRequestsTab({ teamId, reviewer, excludeMemberId = null }) {
  const [requests, setRequests] = useState([]);
  const [members, setMembers] = useState({});
  const [status, setStatus] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [pendingChange, setPendingChange] = useState(null);
  const [processing, setProcessing] = useState("");

  useEffect(() => onSnapshot(collection(db, "teams", teamId, "leaveRequests"), (snap) => {
    setRequests(snap.docs.map((item) => ({ id: item.id, ...item.data() })).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
  }), [teamId]);

  useEffect(() => onSnapshot(collection(db, "teams", teamId, "members"), (snap) => {
    setMembers(Object.fromEntries(snap.docs.map((item) => [item.id, { id: item.id, ...item.data() }])));
  }), [teamId]);

  const reviewableRequests = useMemo(
    () => excludeMemberId ? requests.filter((item) => item.memberId !== excludeMemberId) : requests,
    [excludeMemberId, requests],
  );
  const counts = useMemo(() => ({
    all: reviewableRequests.length,
    pending: reviewableRequests.filter((item) => item.status === "pending").length,
    approved: reviewableRequests.filter((item) => item.status === "approved").length,
    rejected: reviewableRequests.filter((item) => item.status === "rejected").length,
  }), [reviewableRequests]);

  const filtered = useMemo(() => reviewableRequests.filter((request) => {
    if (status !== "all" && request.status !== status) return false;
    if (fromDate && request.toDate < fromDate) return false;
    if (toDate && request.fromDate > toDate) return false;
    return true;
  }), [fromDate, reviewableRequests, status, toDate]);

  const totalRows = filtered.length;
  const totalPages = Math.ceil(totalRows / rowsPerPage);
  const safeCurrentPage = totalPages > 0 ? Math.min(currentPage, totalPages) : 1;
  const startIndex = (safeCurrentPage - 1) * rowsPerPage;
  const paginatedRequests = filtered.slice(startIndex, startIndex + rowsPerPage);

  const confirmReview = async () => {
    if (!pendingChange) return;
    const { request, decision, leaveType } = pendingChange;
    setProcessing(request.id);
    try {
      const batch = writeBatch(db);
      batch.update(doc(db, "teams", teamId, "leaveRequests", request.id), {
        status: decision, leaveType,
        reviewedBy: reviewer || { id: null, name: "Admin", role: "admin" },
        reviewedAt: serverTimestamp(), updatedAt: serverTimestamp(),
      });
      if (decision === "approved") {
        const member = members[request.memberId] || {};
        dateKeys(request.fromDate, request.toDate).forEach((dateKey) => {
          batch.set(doc(db, "teams", teamId, "attendance", dateKey, "punches", request.memberId), {
            id: request.memberId,
            firstName: member.firstName || request.memberName?.split(" ")?.[0] || "",
            lastName: member.lastName || request.memberName?.split(" ")?.slice(1).join(" ") || "",
            status: leaveType === "paid" ? "paid_leave" : "unpaid_leave",
            leaveRequestId: request.id, leaveDuration: Number(request.totalDays) === 0.5 ? 0.5 : 1,
            halfDayPeriod: request.halfDayPeriod || null,
            entryType: "leave", punchIn: null, punchOut: null, totalHoursWorked: 0,
            deviceInfo: { entrySource: "leave-approval", version: null },
            location: { lat: null, lng: null }, updatedAt: serverTimestamp(),
          }, { merge: true });
        });
      }
      await batch.commit();
      toast.success(decision === "approved" ? `Approved as ${leaveType} leave.` : "Leave request rejected.");
      setPendingChange(null);
    } catch (error) {
      toast.error(error?.message || "Could not review the request.");
    } finally { setProcessing(""); }
  };

  const clearFilters = () => { setFromDate(""); setToDate(""); setCurrentPage(1); };
  const selectedLabel = pendingChange?.decision === "rejected" ? "Reject" : pendingChange?.leaveType === "paid" ? "Approve as paid leave" : "Approve as unpaid leave";

  return <div className="space-y-5">
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {statsConfig.map(({ key, label, icon: Icon, color, box }) => <Card key={key} className="py-0"><CardContent className="flex min-h-24 items-center gap-4 p-5"><div className={`flex size-12 shrink-0 items-center justify-center rounded-xl ${box}`}><Icon className={`size-5 ${color}`} /></div><div className="space-y-1"><p className="text-2xl font-bold leading-none">{counts[key]}</p><p className={`text-sm font-medium ${key === "all" ? "" : color}`}>{label}</p></div></CardContent></Card>)}
    </div>

    <Card className="overflow-hidden py-0"><CardContent className="p-0">
      <div className="flex flex-col gap-4 border-b pr-4 pt-3 sm:flex-row sm:items-end sm:justify-between">
        <Tabs value={status} onValueChange={(value) => { setStatus(value); setCurrentPage(1); }} className="gap-0 overflow-x-auto">
          <TabsList className="h-auto w-max rounded-none bg-transparent p-0">
            {statsConfig.map((item) => <TabsTrigger key={item.key} value={item.key} className="relative h-11 rounded-none border-0 bg-transparent px-4 shadow-none after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:after:bg-primary">{item.key === "all" ? "All" : item.label}<Badge variant="secondary" className="ml-1 rounded-full px-1.5 py-0 text-[10px]">{counts[item.key]}</Badge></TabsTrigger>)}
          </TabsList>
        </Tabs>
        <div className="grid grid-cols-2 gap-2 pb-3 sm:flex sm:items-end">
          <div className="space-y-1"><Label htmlFor="leave-filter-from" className="text-xs">From date</Label><Input id="leave-filter-from" type="date" value={fromDate} onChange={(event) => { setFromDate(event.target.value); setCurrentPage(1); }} className="h-9 sm:w-36" /></div>
          <div className="space-y-1"><Label htmlFor="leave-filter-to" className="text-xs">To date</Label><Input id="leave-filter-to" type="date" min={fromDate} value={toDate} onChange={(event) => { setToDate(event.target.value); setCurrentPage(1); }} className="h-9 sm:w-36" /></div>
          <Button variant="ghost" size="sm" onClick={clearFilters} disabled={!fromDate && !toDate} className="col-span-2">Clear</Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader><TableRow><TableHead className="min-w-60 px-4 text-left">Member</TableHead><TableHead className="min-w-48 px-4 text-left">Leave Dates</TableHead><TableHead className="px-4 text-left">Duration</TableHead><TableHead className="min-w-64 px-4 text-left">Reason</TableHead><TableHead className="min-w-40 px-4 text-left">Approved by</TableHead><TableHead className="min-w-48 px-4 text-left">Action</TableHead></TableRow></TableHeader>
          <TableBody>
            {filtered.length === 0 ? <TableRow><TableCell colSpan={6} className="h-32 text-center text-muted-foreground">No leave requests match these filters.</TableCell></TableRow> : paginatedRequests.map((request) => {
              const member = members[request.memberId] || {};
              const name = `${member.firstName || ""} ${member.lastName || ""}`.trim() || request.memberName || "Member";
              return <TableRow key={request.id}>
                <TableCell className="px-4"><div className="flex items-center gap-3"><Avatar className="size-10"><AvatarImage src={member.photoURL || ""} alt={name} /><AvatarFallback>{initials(name)}</AvatarFallback></Avatar><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="font-medium">{name}</span><Badge variant="outline" className={`capitalize ${roleClass(member.role)}`}>{member.role || "member"}</Badge></div><p className="max-w-44 truncate text-xs text-muted-foreground">{member.email || request.memberEmail}</p></div></div></TableCell>
                <TableCell className="px-4"><div className="flex items-center gap-2"><CalendarDays className="size-4 text-muted-foreground" /><span>{request.fromDate === request.toDate ? request.fromDate : `${request.fromDate} – ${request.toDate}`}</span></div></TableCell>
                <TableCell className="px-4">{request.durationType === "half_day" ? `Half day (${request.halfDayPeriod === "second_half" ? "Second half" : "First half"})` : `${request.totalDays || 1} day${Number(request.totalDays || 1) === 1 ? "" : "s"}`}</TableCell>
                <TableCell className="px-4"><p className="max-w-md whitespace-normal break-words text-sm text-muted-foreground">{request.reason || "—"}</p></TableCell>
                <TableCell className="px-4"><div>{request.reviewedBy?.name || "—"}{request.reviewedBy?.role && <p className="text-xs capitalize text-muted-foreground">{request.reviewedBy.role}</p>}</div></TableCell>
                <TableCell className="px-4 text-left">{request.status === "pending" ? <Select onValueChange={(value) => setPendingChange({ request, decision: value === "reject" ? "rejected" : "approved", leaveType: value === "paid" ? "paid" : value === "unpaid" ? "unpaid" : null })}><SelectTrigger className="w-44"><SelectValue placeholder="Select action" /></SelectTrigger><SelectContent><SelectItem value="paid" className="text-emerald-600">Approve</SelectItem><SelectItem value="unpaid" className="text-orange-500">Unpaid Leave</SelectItem><SelectItem value="reject" className="text-red-500">Reject</SelectItem></SelectContent></Select> : <Badge variant="outline" className={`capitalize ${request.status === "rejected" ? "border-red-500/30 bg-red-500/10 text-red-500" : request.leaveType === "unpaid" ? "border-orange-500/30 bg-orange-500/10 text-orange-500" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"}`}>{request.status === "approved" ? `${request.leaveType} leave` : request.status}</Badge>}</TableCell>
              </TableRow>;
            })}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between gap-4 border-t px-4 py-4">
        <p className="hidden text-sm text-muted-foreground lg:block">
          Showing {totalRows === 0 ? 0 : startIndex + 1} to {Math.min(startIndex + rowsPerPage, totalRows)} of {totalRows} requests
        </p>
        <div className="flex w-full items-center justify-between gap-4 lg:w-auto lg:justify-end lg:gap-6">
          <div className="hidden items-center gap-2 sm:flex">
            <Label className="text-sm">Rows</Label>
            <Select value={`${rowsPerPage}`} onValueChange={(value) => { setRowsPerPage(Number(value)); setCurrentPage(1); }}>
              <SelectTrigger className="h-8 w-[70px]"><SelectValue /></SelectTrigger>
              <SelectContent align="end">{[10, 20, 50].map((size) => <SelectItem key={size} value={`${size}`}>{size}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <p className="whitespace-nowrap text-sm font-medium">Page {totalPages === 0 ? 0 : safeCurrentPage} of {totalPages || 1}</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="hidden size-8 lg:flex" onClick={() => setCurrentPage(1)} disabled={safeCurrentPage === 1}>{"<<"}</Button>
            <Button variant="outline" size="icon" className="size-8" onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))} disabled={safeCurrentPage === 1}>{"<"}</Button>
            <Button variant="outline" size="icon" className="size-8" onClick={() => setCurrentPage((page) => Math.min(page + 1, totalPages || 1))} disabled={safeCurrentPage === totalPages || totalPages === 0}>{">"}</Button>
            <Button variant="outline" size="icon" className="hidden size-8 lg:flex" onClick={() => setCurrentPage(totalPages)} disabled={safeCurrentPage === totalPages || totalPages === 0}>{">>"}</Button>
          </div>
        </div>
      </div>
    </CardContent></Card>

    <AlertDialog open={!!pendingChange} onOpenChange={(open) => !open && !processing && setPendingChange(null)}>
      <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Confirm leave status change</AlertDialogTitle><AlertDialogDescription>You are about to <strong>{selectedLabel?.toLowerCase()}</strong> for {pendingChange?.request?.memberName}. Approved requests automatically update attendance and salary calculations for the selected dates.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={!!processing}>Cancel</AlertDialogCancel><AlertDialogAction onClick={(event) => { event.preventDefault(); confirmReview(); }} disabled={!!processing} className={pendingChange?.decision === "rejected" ? "bg-red-600 text-white hover:bg-red-700" : pendingChange?.leaveType === "unpaid" ? "bg-orange-500 text-white hover:bg-orange-600" : "bg-emerald-600 text-white hover:bg-emerald-700"}>{processing && <Loader2 className="size-4 animate-spin" />}{processing ? "Updating..." : "Confirm change"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
    </AlertDialog>
  </div>;
}
