"use client";

import { useEffect, useMemo, useState } from "react";
import { addDoc, collection, doc, onSnapshot, query, serverTimestamp, where } from "firebase/firestore";
import { CalendarDays, CheckCircle2, ClipboardList, Clock3, Loader2, Plus, XCircle } from "lucide-react";
import { db } from "@/lib/firebase";
import { useMembers } from "@/app/context/MembersContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import LeaveRequestsTab from "@/components/admin/team/LeaveRequestsTab";

const dayCount = (from, to) => Math.floor((new Date(`${to}T00:00:00`) - new Date(`${from}T00:00:00`)) / 86400000) + 1;
const statsConfig = [
  { key: "all", label: "Total requests", icon: ClipboardList, color: "text-blue-500", box: "bg-blue-500/10" },
  { key: "pending", label: "Pending", icon: Clock3, color: "text-amber-500", box: "bg-amber-500/10" },
  { key: "approved", label: "Approved", icon: CheckCircle2, color: "text-emerald-500", box: "bg-emerald-500/10" },
  { key: "rejected", label: "Rejected", icon: XCircle, color: "text-red-500", box: "bg-red-500/10" },
];

export default function LeaveRequests() {
  const { members, loading: memberLoading } = useMembers();
  const member = members?.[0];
  const [team, setTeam] = useState(null);
  const [requests, setRequests] = useState([]);
  const [applyOpen, setApplyOpen] = useState(false);
  const [durationType, setDurationType] = useState("full_day");
  const [halfDayPeriod, setHalfDayPeriod] = useState("first_half");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("all");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [managerView, setManagerView] = useState("self");

  useEffect(() => member?.teamId ? onSnapshot(doc(db, "teams", member.teamId), (snap) => setTeam(snap.exists() ? snap.data() : null)) : undefined, [member?.teamId]);
  useEffect(() => {
    if (!member?.teamId || !member?.id) return;
    const requestQuery = query(collection(db, "teams", member.teamId, "leaveRequests"), where("memberId", "==", member.id));
    return onSnapshot(requestQuery, (snap) => setRequests(snap.docs.map((item) => ({ id: item.id, ...item.data() })).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))));
  }, [member?.id, member?.teamId]);

  const isSalaryTeam = team?.billingConfig?.billingType === "salary";
  const duration = durationType === "half_day" ? 0.5 : fromDate && toDate ? dayCount(fromDate, toDate) : 0;
  const counts = useMemo(() => ({ all: requests.length, pending: requests.filter((item) => item.status === "pending").length, approved: requests.filter((item) => item.status === "approved").length, rejected: requests.filter((item) => item.status === "rejected").length }), [requests]);
  const filtered = useMemo(() => requests.filter((request) => {
    if (status !== "all" && request.status !== status) return false;
    if (filterFrom && request.toDate < filterFrom) return false;
    if (filterTo && request.fromDate > filterTo) return false;
    return true;
  }), [filterFrom, filterTo, requests, status]);
  const totalRows = filtered.length;
  const totalPages = Math.ceil(totalRows / rowsPerPage);
  const safeCurrentPage = totalPages > 0 ? Math.min(currentPage, totalPages) : 1;
  const startIndex = (safeCurrentPage - 1) * rowsPerPage;
  const paginated = filtered.slice(startIndex, startIndex + rowsPerPage);

  const resetForm = () => { setDurationType("full_day"); setHalfDayPeriod("first_half"); setFromDate(""); setToDate(""); setReason(""); };
  const submit = async (event) => {
    event.preventDefault();
    const effectiveTo = durationType === "half_day" ? fromDate : toDate;
    if (!member || !fromDate || !effectiveTo || duration <= 0 || duration > 31) return toast.error("Choose a valid leave period of up to 31 days.");
    if (!reason.trim()) return toast.error("Reason is required.");
    setSaving(true);
    try {
      await addDoc(collection(db, "teams", member.teamId, "leaveRequests"), {
        memberId: member.id, memberName: `${member.firstName || ""} ${member.lastName || ""}`.trim(), memberEmail: member.email || "",
        fromDate, toDate: effectiveTo, totalDays: duration, durationType, halfDayPeriod: durationType === "half_day" ? halfDayPeriod : null,
        reason: reason.trim(), status: "pending", leaveType: null, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      });
      resetForm(); setApplyOpen(false); toast.success("Leave request submitted.");
    } catch (error) { toast.error(error?.message || "Could not submit leave request."); }
    finally { setSaving(false); }
  };

  if (memberLoading || (member && team === null)) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="size-7 animate-spin" /></div>;
  if (!member) return <div className="p-6 text-muted-foreground">Member profile not found.</div>;
  if (!isSalaryTeam) return <div className="p-6 text-muted-foreground">Leave management is available only for salary teams.</div>;

  return <div className="space-y-4">
    {member.role === "manager" && <Tabs value={managerView} onValueChange={setManagerView} className="gap-0 border-b"><TabsList className="h-auto rounded-none bg-transparent p-0"><TabsTrigger value="self" className="relative h-11 rounded-none border-0 bg-transparent px-6 shadow-none after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:after:bg-primary">Self</TabsTrigger><TabsTrigger value="team" className="relative h-11 rounded-none border-0 bg-transparent px-6 shadow-none after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:after:bg-primary">Team</TabsTrigger></TabsList></Tabs>}
    <div className="flex items-center justify-between gap-4"><div><h1 className="text-2xl font-bold">{member.role === "manager" && managerView === "team" ? "Team leave approvals" : "Leave"}</h1><p className="text-sm text-muted-foreground">{member.role === "manager" && managerView === "team" ? "Review leave requests raised by your team members." : "Request leave and track approval status."}</p></div>{(member.role !== "manager" || managerView === "self") && <Button onClick={() => setApplyOpen(true)}><Plus className="size-4" />Apply Leave</Button>}</div>
    {(member.role !== "manager" || managerView === "self") && <>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{statsConfig.map(({ key, label, icon: Icon, color, box }) => <Card key={key} className="py-0"><CardContent className="flex min-h-24 items-center gap-4 p-5"><div className={`flex size-12 shrink-0 items-center justify-center rounded-xl ${box}`}><Icon className={`size-5 ${color}`} /></div><div className="space-y-1"><p className="text-2xl font-bold leading-none">{counts[key]}</p><p className={`text-sm font-medium ${key === "all" ? "" : color}`}>{label}</p></div></CardContent></Card>)}</div>

    <Card className="overflow-hidden py-0"><CardContent className="p-0">
      <div className="flex flex-col gap-4 border-b pr-4 pt-3 sm:flex-row sm:items-end sm:justify-between">
        <Tabs value={status} onValueChange={(value) => { setStatus(value); setCurrentPage(1); }} className="gap-0 overflow-x-auto"><TabsList className="h-auto w-max rounded-none bg-transparent p-0">{statsConfig.map((item) => <TabsTrigger key={item.key} value={item.key} className="relative h-11 rounded-none border-0 bg-transparent px-4 shadow-none after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:after:bg-primary">{item.key === "all" ? "All" : item.label}<Badge variant="secondary" className="ml-1 rounded-full px-1.5 py-0 text-[10px]">{counts[item.key]}</Badge></TabsTrigger>)}</TabsList></Tabs>
        <div className="grid grid-cols-2 gap-2 pb-3 sm:flex sm:items-end"><div className="space-y-1"><Label className="text-xs">From date</Label><Input type="date" value={filterFrom} onChange={(event) => { setFilterFrom(event.target.value); setCurrentPage(1); }} className="h-9 sm:w-36" /></div><div className="space-y-1"><Label className="text-xs">To date</Label><Input type="date" min={filterFrom} value={filterTo} onChange={(event) => { setFilterTo(event.target.value); setCurrentPage(1); }} className="h-9 sm:w-36" /></div><Button variant="ghost" size="sm" className="col-span-2" disabled={!filterFrom && !filterTo} onClick={() => { setFilterFrom(""); setFilterTo(""); setCurrentPage(1); }}>Clear</Button></div>
      </div>
      <Table><TableHeader><TableRow><TableHead className="min-w-48 px-4">Leave Dates</TableHead><TableHead className="px-4">Duration</TableHead><TableHead className="min-w-64 px-4">Reason</TableHead><TableHead className="min-w-40 px-4">Approved by</TableHead><TableHead className="px-4">Status</TableHead></TableRow></TableHeader><TableBody>{filtered.length === 0 ? <TableRow><TableCell colSpan={5} className="h-32 text-center text-muted-foreground">No leave requests match these filters.</TableCell></TableRow> : paginated.map((request) => <TableRow key={request.id}><TableCell className="px-4"><div className="flex items-center gap-2"><CalendarDays className="size-4 text-muted-foreground" />{request.fromDate === request.toDate ? request.fromDate : `${request.fromDate} – ${request.toDate}`}</div></TableCell><TableCell className="px-4">{request.durationType === "half_day" ? `Half day (${request.halfDayPeriod === "second_half" ? "Second half" : "First half"})` : `${request.totalDays || 1} day${Number(request.totalDays || 1) === 1 ? "" : "s"}`}</TableCell><TableCell className="px-4"><p className="max-w-md whitespace-normal break-words text-muted-foreground">{request.reason || "—"}</p></TableCell><TableCell className="px-4"><div>{request.reviewedBy?.name || "—"}{request.reviewedBy?.role && <p className="text-xs capitalize text-muted-foreground">{request.reviewedBy.role}</p>}</div></TableCell><TableCell className="px-4"><Badge variant="outline" className={`capitalize ${request.status === "rejected" ? "border-red-500/30 bg-red-500/10 text-red-500" : request.status === "approved" && request.leaveType === "unpaid" ? "border-orange-500/30 bg-orange-500/10 text-orange-500" : request.status === "approved" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500" : ""}`}>{request.status === "approved" ? `${request.leaveType} leave` : request.status}</Badge></TableCell></TableRow>)}</TableBody></Table>
      <div className="flex items-center justify-between gap-4 border-t px-4 py-4"><p className="hidden text-sm text-muted-foreground lg:block">Showing {totalRows === 0 ? 0 : startIndex + 1} to {Math.min(startIndex + rowsPerPage, totalRows)} of {totalRows} requests</p><div className="flex w-full items-center justify-between gap-4 lg:w-auto lg:justify-end lg:gap-6"><div className="hidden items-center gap-2 sm:flex"><Label className="text-sm">Rows</Label><Select value={`${rowsPerPage}`} onValueChange={(value) => { setRowsPerPage(Number(value)); setCurrentPage(1); }}><SelectTrigger className="h-8 w-[70px]"><SelectValue /></SelectTrigger><SelectContent align="end">{[10, 20, 50].map((size) => <SelectItem key={size} value={`${size}`}>{size}</SelectItem>)}</SelectContent></Select></div><p className="whitespace-nowrap text-sm font-medium">Page {totalPages === 0 ? 0 : safeCurrentPage} of {totalPages || 1}</p><div className="flex items-center gap-2"><Button variant="outline" size="icon" className="hidden size-8 lg:flex" onClick={() => setCurrentPage(1)} disabled={safeCurrentPage === 1}>{"<<"}</Button><Button variant="outline" size="icon" className="size-8" onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))} disabled={safeCurrentPage === 1}>{"<"}</Button><Button variant="outline" size="icon" className="size-8" onClick={() => setCurrentPage((page) => Math.min(page + 1, totalPages || 1))} disabled={safeCurrentPage === totalPages || totalPages === 0}>{">"}</Button><Button variant="outline" size="icon" className="hidden size-8 lg:flex" onClick={() => setCurrentPage(totalPages)} disabled={safeCurrentPage === totalPages || totalPages === 0}>{">>"}</Button></div></div></div>
    </CardContent></Card>
    </>}

    {member.role === "manager" && managerView === "team" && <LeaveRequestsTab teamId={member.teamId} excludeMemberId={member.id} reviewer={{ id: member.id, name: `${member.firstName || ""} ${member.lastName || ""}`.trim() || member.email, role: "manager" }} />}

    <Dialog open={applyOpen} onOpenChange={(open) => { if (!saving) { setApplyOpen(open); if (!open) resetForm(); } }}><DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>Apply for leave</DialogTitle><DialogDescription>Select a full-day range or a half-day period.</DialogDescription></DialogHeader><form onSubmit={submit} className="space-y-4"><div className={`grid gap-4 ${durationType === "half_day" ? "sm:grid-cols-2" : ""}`}><div className="space-y-2"><Label>Duration</Label><Select value={durationType} onValueChange={(value) => { setDurationType(value); if (value === "half_day" && fromDate) setToDate(fromDate); }}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="full_day">Full day / Date range</SelectItem><SelectItem value="half_day">Half day</SelectItem></SelectContent></Select></div>{durationType === "half_day" && <div className="space-y-2"><Label>Half-day period</Label><Select value={halfDayPeriod} onValueChange={setHalfDayPeriod}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="first_half">First half</SelectItem><SelectItem value="second_half">Second half</SelectItem></SelectContent></Select></div>}</div><div className={`grid gap-4 ${durationType === "full_day" ? "sm:grid-cols-2" : ""}`}><div className="space-y-2"><Label htmlFor="leave-from">{durationType === "half_day" ? "Date" : "From date"}</Label><Input id="leave-from" type="date" value={fromDate} onChange={(event) => { setFromDate(event.target.value); if (durationType === "half_day" || !toDate) setToDate(event.target.value); }} required /></div>{durationType === "full_day" && <div className="space-y-2"><Label htmlFor="leave-to">To date</Label><Input id="leave-to" type="date" min={fromDate} value={toDate} onChange={(event) => setToDate(event.target.value)} required /></div>}</div><div className="space-y-2"><Label htmlFor="leave-reason">Reason</Label><Textarea id="leave-reason" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Enter the reason for leave" maxLength={500} required /></div><DialogFooter><Button type="button" variant="outline" onClick={() => setApplyOpen(false)} disabled={saving}>Cancel</Button><Button type="submit" disabled={saving}>{saving && <Loader2 className="size-4 animate-spin" />}{saving ? "Submitting..." : "Submit request"}</Button></DialogFooter></form></DialogContent></Dialog>
  </div>;
}
