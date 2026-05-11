// Monthly.js
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "sonner";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

import { PiFilePdf } from "react-icons/pi";
import { User, User2 } from "lucide-react";
import { generateReceipt } from "../../GenerateReceipt";

import {
  formatCurrency,
  formatDate,
  toDateKey,
  getBillingStartDate,
  getBaseAmount,
  fetchBillingPeriods,
  ensureBillingPeriods,
  recordFixedPayment,
  getStatusText,
  getEffectiveBalance,
} from "../BillingHelpers";

const Monthly = ({ teamId, team, members, initialMemberId }) => {
  const router = useRouter();

  const [selectedMemberId, setSelectedMemberId] = useState(initialMemberId || "");
  const [filterAttendance, setFilterAttendance] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterFromDate, setFilterFromDate] = useState("");
  const [filterToDate, setFilterToDate] = useState("");

  const [billingPeriods, setBillingPeriods] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [paymentMode, setPaymentMode] = useState("cash");
  const [workingDays, setWorkingDays] = useState([0, 1, 2, 3, 4, 5, 6]);
  const [scheduleLoaded, setScheduleLoaded] = useState(false);

  const selectedMember = useMemo(() => {
    if (!selectedMemberId || selectedMemberId === "placeholder") return null;
    return members?.find((member) => member.id === selectedMemberId);
  }, [members, selectedMemberId]);

  const fetchSchedule = async () => {
    try {
      const days = team?.schedule?.workingDays;

      if (Array.isArray(days)) {
        setWorkingDays(days.map(Number));
      } else {
        setWorkingDays([0, 1, 2, 3, 4, 5, 6]);
      }
    } finally {
      setScheduleLoaded(true);
    }
  };

  useEffect(() => {
    setScheduleLoaded(false);
    fetchSchedule();
  }, [team?.id, team?.schedule?.workingDays]);

  const baseAmount = getBaseAmount(team);

  const getMonthlyPeriods = async () => {
    const billStart = getBillingStartDate(team);
    const today = new Date();
    const baseAmount = getBaseAmount(team);

    const rows = [];
    const current = new Date(billStart.getFullYear(), billStart.getMonth(), 1);

    while (current <= today) {
      const year = current.getFullYear();
      const month = current.getMonth();

      const monthStart = new Date(year, month, 1);
      const monthEnd = new Date(year, month + 1, 0);

      const effectiveStart =
        year === billStart.getFullYear() && month === billStart.getMonth()
          ? new Date(billStart)
          : monthStart;

      const effectiveEnd = monthEnd;

      let presentDays = 0;
      let halfDays = 0;
      let absentDays = 0;

      const totalDaysInMonth = effectiveEnd.getDate();
      let billableDays = 0;
      const tempDate = new Date(effectiveStart);

      while (tempDate <= effectiveEnd) {
        const dayNumber = tempDate.getDay();

        if (workingDays.includes(dayNumber)) {
          billableDays += 1;

          const dateKey = toDateKey(tempDate);

          const punchRef = doc(
            db,
            "teams",
            teamId,
            "attendance",
            dateKey,
            "punches",
            selectedMember.id,
          );

          const punchSnap = await getDoc(punchRef);

          if (punchSnap.exists()) {
            const status = punchSnap.data()?.status;

            if (status === "present") {
              presentDays += 1;
            } else if (status === "halfday") {
              halfDays += 1;
            } else {
              absentDays += 1;
            }
          } else {
            absentDays += 1;
          }
        }

        tempDate.setDate(tempDate.getDate() + 1);
      }

      const perDayAmount = billableDays > 0 ? baseAmount / billableDays : 0;
      const payableDays = presentDays + halfDays * 0.5;
      const amount = Math.round(payableDays * perDayAmount);

      const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;

      const monthLabel = effectiveStart.toLocaleDateString("en-IN", {
        month: "long",
        year: "numeric",
      });

      rows.push({
        id: `${monthKey}_monthly`,
        periodKey: monthKey,
        periodLabel: monthLabel,
        billingCycle: "monthly",

        fromDate: toDateKey(effectiveStart),
        toDate: toDateKey(effectiveEnd),
        dueDate: toDateKey(effectiveEnd),

        totalDaysInMonth,
        billableDays,
        presentDays,
        halfDays,
        absentDays,

        amount,
        paid: 0,
        balance: amount,
        status: amount > 0 ? "pending" : "leave",
      });

      current.setMonth(current.getMonth() + 1);
    }

    return rows;
  };

  const loadPeriods = async () => {
    if (!selectedMember) return;

    const generated = await getMonthlyPeriods();

    await ensureBillingPeriods({
      teamId,
      member: selectedMember,
      periods: generated,
    });

    const data = await fetchBillingPeriods({
      teamId,
      memberId: selectedMember.id,
    });

    const mergedData = data.map((item) => {
      const generatedItem = generated.find((period) => period.id === item.id);

      if (!generatedItem) return item;

      const paid = Number(item.paid || 0);
      const amount = Number(generatedItem.amount || 0);
      const balance = Math.max(amount - paid, 0);

      return {
        ...item,
        ...generatedItem,
        paid,
        balance,
        status:
          amount <= 0
            ? "leave"
            : paid >= amount
              ? "settled"
              : paid > 0
                ? "partial"
                : "pending",
      };
    });

    setBillingPeriods(mergedData);
  };

  useEffect(() => {
    if (selectedMember && scheduleLoaded) {
      loadPeriods();
    }
  }, [
    selectedMemberId,
    teamId,
    scheduleLoaded,
    workingDays,
    team?.billingConfig?.billingStartDate,
  ]);

  const filteredPeriods = billingPeriods.filter((period) => {
    const matchesCycle = period.billingCycle === "monthly";

    const matchesAttendance =
      filterAttendance === "all"
        ? true
        : filterAttendance === "present"
          ? Number(period.presentDays || 0) > 0
          : filterAttendance === "halfday"
            ? Number(period.halfDays || 0) > 0
            : Number(period.absentDays || 0) > 0;

    const matchesStatus =
      filterStatus === "all" ? true : period.status === filterStatus;

    const periodStart = period.fromDate;
    const periodEnd = period.toDate;

    const selectedStart = filterFromDate || null;
    const selectedEnd = filterToDate || null;

    const matchesDateRange =
      !selectedStart && !selectedEnd
        ? true
        : selectedStart && selectedEnd
          ? periodStart <= selectedEnd && periodEnd >= selectedStart
          : selectedStart
            ? periodEnd >= selectedStart
            : periodStart <= selectedEnd;

    return (
      matchesCycle && matchesAttendance && matchesStatus && matchesDateRange
    );
  });

  const payablePeriods = filteredPeriods.filter(
    (period) => period.status !== "leave",
  );

  const totalAmount = payablePeriods.reduce(
    (acc, period) => acc + Number(period.amount || 0),
    0,
  );

  const totalPaid = payablePeriods.reduce(
    (acc, period) => acc + Number(period.paid || 0),
    0,
  );

  const totalBalance = payablePeriods.reduce(
    (acc, period) => acc + getEffectiveBalance(period),
    0,
  );

  const openPaymentDialog = (period) => {
    if (period.status === "leave") return;

    if (!selectedMember) return;

    router.push(
      `/admin/teams/${teamId}/billing/create-invoice?memberId=${selectedMember.id}&periodId=${period.id}`,
    );
  };

  const downloadReceipt = async (period) => {
    if (!selectedMember) return;

    try {
      await generateReceipt({
        team,
        member: selectedMember,
        period,
      });
      toast.success("Receipt downloaded successfully");
    } catch (error) {
      console.error("Error downloading receipt:", error);
      toast.error("Failed to download receipt");
    }
  };

  const recordPayment = async () => {
    if (!selectedMember || !selectedPeriod) return;

    setLoading(true);

    try {
      await recordFixedPayment({
        teamId,
        member: selectedMember,
        period: selectedPeriod,
        paymentAmount,
        paymentMode,
      });

      await loadPeriods();

      setIsPaymentOpen(false);
      setSelectedPeriod(null);
      setPaymentAmount("");
      setPaymentMode("cash");

      toast.success("Payment recorded successfully");
    } catch (error) {
      console.error("Error recording payment:", error);
      toast.error("Failed to record payment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <Card>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
            <div className="space-y-2 col-span-2 lg:col-span-1">
              <Label>Select Member</Label>

              <Select
                value={selectedMemberId}
                onValueChange={setSelectedMemberId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Member" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="placeholder" disabled>
                    Select Member
                  </SelectItem>

                  {members?.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.firstName} {member.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 col-span-1">
              <Label>From Date</Label>
              <Input
                type="date"
                value={filterFromDate}
                onChange={(e) => setFilterFromDate(e.target.value)}
                className="w-full"
              />
            </div>

            <div className="space-y-2 col-span-1">
              <Label>To Date</Label>
              <Input
                type="date"
                value={filterToDate}
                onChange={(e) => setFilterToDate(e.target.value)}
                className="w-full"
              />
            </div>

            <div className="space-y-2 col-span-2 lg:col-span-1">
              <Label>Attendance</Label>

              <Select
                value={filterAttendance}
                onValueChange={setFilterAttendance}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Attendance" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="present">Present</SelectItem>
                  <SelectItem value="halfday">Half Day</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 col-span-2 lg:col-span-1">
              <Label>Status</Label>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="settled">Settled</SelectItem>
                  <SelectItem value="leave">Leave</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end col-span-2 lg:col-span-1">
              <Button
                className="w-full"
                onClick={() => {
                  setSelectedMemberId("placeholder");
                  setFilterAttendance("all");
                  setFilterStatus("all");
                  setFilterFromDate("");
                  setFilterToDate("");
                }}
              >
                Clear Filter
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {!selectedMember ? (
        <Card>
          <CardContent className="py-12 text-center">
            <User className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <h3 className="font-semibold">Please select the member</h3>
            <p className="text-sm text-muted-foreground">
              Select a member to view monthly billing.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="gap-2">
            <CardHeader className="grid grid-cols-2 items-center">
              <CardTitle className="flex items-center gap-2 text-xl">
                <User2 className="h-5 w-5 shrink-0" />
                <span className="truncate">
                  {selectedMember.firstName} {selectedMember.lastName}
                </span>
              </CardTitle>

              <div className="flex justify-end">
                <Link
                  href={`/admin/teams/${teamId}/members/${selectedMember.id}`}
                >
                  <Button variant="outline" size="sm">
                    Go To Profile
                  </Button>
                </Link>
              </div>
            </CardHeader>

            <CardContent>
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-[repeat(auto-fit,minmax(180px,1fr))]">
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">Cycle</p>
                  <p className="font-semibold">Monthly</p>
                </div>

                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">
                    Monthly Base Amount
                  </p>
                  <p className="font-semibold">{formatCurrency(baseAmount)}</p>
                </div>

                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">
                    Payable Amount
                  </p>
                  <p className="font-semibold">{formatCurrency(totalAmount)}</p>
                </div>

                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">Total Paid</p>
                  <p className="font-semibold text-emerald-600">
                    {formatCurrency(totalPaid)}
                  </p>
                </div>

                <div className="rounded-lg border bg-muted/30 p-3 col-span-2 lg:col-span-1">
                  <p className="text-xs text-muted-foreground">Total Balance</p>
                  <p className="font-semibold text-red-600">
                    {formatCurrency(totalBalance)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="rounded-xl border bg-card shadow-sm overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="text-center border-r">Month</TableHead>
                  <TableHead className="text-center border-r">From</TableHead>
                  <TableHead className="text-center border-r">To</TableHead>
                  <TableHead className="text-center border-r">
                    Total Days
                  </TableHead>
                  <TableHead className="text-center border-r">
                    Billable Days
                  </TableHead>
                  <TableHead className="text-center border-r">
                    Present
                  </TableHead>
                  <TableHead className="text-center border-r">
                    Halfday
                  </TableHead>
                  <TableHead className="text-center border-r">Absent</TableHead>
                  <TableHead className="text-center border-r">Amount</TableHead>
                  <TableHead className="text-center border-r">Paid</TableHead>
                  <TableHead className="text-center border-r">Discount</TableHead>
                  <TableHead className="text-center border-r">
                    Balance
                  </TableHead>
                  <TableHead className="text-center border-r">Status</TableHead>
                  <TableHead className="text-center">Action</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filteredPeriods.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={14}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No monthly billing records found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPeriods.map((period) => (
                    <TableRow
                      key={period.id}
                      className={period.status === "leave" ? "bg-muted/30" : ""}
                    >
                      <TableCell className="text-center border-r font-medium">
                        {period.periodLabel}
                      </TableCell>

                      <TableCell className="text-center border-r">
                        {formatDate(period.fromDate)}
                      </TableCell>

                      <TableCell className="text-center border-r">
                        {formatDate(period.toDate)}
                      </TableCell>

                      <TableCell className="text-center border-r font-semibold">
                        {period.totalDaysInMonth || 0}
                      </TableCell>

                      <TableCell className="text-center border-r font-semibold">
                        {period.billableDays || 0}
                      </TableCell>

                      <TableCell className="text-center border-r text-emerald-600 font-semibold">
                        {period.presentDays || 0}
                      </TableCell>

                      <TableCell className="text-center border-r text-orange-500 font-semibold">
                        {period.halfDays || 0}
                      </TableCell>

                      <TableCell className="text-center border-r text-red-600 font-semibold">
                        {period.absentDays || 0}
                      </TableCell>

                      <TableCell className="text-center border-r">
                        {period.status === "leave"
                          ? "-"
                          : formatCurrency(period.amount)}
                      </TableCell>

                      <TableCell className="text-center border-r">
                        {period.status === "leave"
                          ? "-"
                          : Number(period.paid || 0) > 0
                            ? formatCurrency(period.paid)
                            : "—"}
                      </TableCell>

                      <TableCell className="text-center border-r">
                        {period.status === "holiday" || period.isHoliday || period.status === "leave" ? "-" : formatCurrency(period.discountAmount || 0)}
                      </TableCell>

                      <TableCell className="text-center border-r font-semibold">
                        {period.status === "leave"
                          ? "-"
                          : getEffectiveBalance(period) > 0
                            ? formatCurrency(getEffectiveBalance(period))
                            : formatCurrency(0)}
                      </TableCell>

                      <TableCell className="text-center border-r">
                        {period.status === "leave" ? (
                          <span className="text-muted-foreground font-semibold">
                            Leave
                          </span>
                        ) : (
                          getStatusText(getEffectiveBalance(period) <= 0 ? "settled" : period.status)
                        )}
                      </TableCell>

                      <TableCell className="text-center">
                        {period.status === "leave" ? (
                          <span className="text-sm text-muted-foreground">
                            Not Applicable
                          </span>
                        ) : (period.status === "settled" || getEffectiveBalance(period) <= 0) ? (
                          <PiFilePdf
                            className="cursor-pointer text-2xl text-orange-500 mx-auto"
                            onClick={() => downloadReceipt(period)}
                          />
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openPaymentDialog(period)}
                          >
                            Record
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Monthly Payment</DialogTitle>
            <DialogDescription>{selectedPeriod?.periodLabel}</DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label>Payment Amount</Label>
            <Input
              type="number"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Payment Mode</Label>

            <Select value={paymentMode} onValueChange={setPaymentMode}>
              <SelectTrigger>
                <SelectValue placeholder="Select payment mode" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="upi">UPI</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="cheque">Cheque</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPaymentOpen(false)}>
              Cancel
            </Button>

            <Button onClick={recordPayment} disabled={loading}>
              {loading ? "Saving..." : "Save Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Monthly;







