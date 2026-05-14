"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { PiFilePdf } from "react-icons/pi";
import { User } from "lucide-react";
import BillingContentLoader from "../BillingContentLoader";

const Salary = ({ teamId, team, members }) => {
  const router = useRouter();

  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [salarySlips, setSalarySlips] = useState([]);
  const [salarySlipsLoading, setSalarySlipsLoading] = useState(false);
  const [attendancePreviewLoading, setAttendancePreviewLoading] =
    useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [selectedAction, setSelectedAction] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [attendancePreview, setAttendancePreview] = useState({});

  const [filterFromDate, setFilterFromDate] = useState("");
  const [filterToDate, setFilterToDate] = useState("");
  const [filterAttendance, setFilterAttendance] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const selectedMember = useMemo(() => {
    if (!selectedMemberId || selectedMemberId === "placeholder") return null;
    return members?.find((member) => member.id === selectedMemberId);
  }, [members, selectedMemberId]);

  useEffect(() => {
    if (teamId && selectedMemberId && selectedMemberId !== "placeholder") {
      fetchSalarySlips();
    }
  }, [teamId, selectedMemberId]);

  const parseDateKey = (dateKey) => {
    const [year, month, day] = dateKey.split("-").map(Number);
    return new Date(year, month - 1, day);
  };

  const toDateKey = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const formatCurrency = (value) => {
    return `₹${Number(value || 0).toLocaleString("en-IN")}`;
  };

  const formatDate = (value) => {
    if (!value) return "—";

    if (value?.seconds) {
      return new Date(value.seconds * 1000).toLocaleDateString("en-IN");
    }

    return parseDateKey(value).toLocaleDateString("en-IN");
  };

  const getTodayKey = () => {
    return toDateKey(new Date());
  };

  const getDateKeys = (start, end) => {
    const dates = [];
    const current = parseDateKey(start);
    const last = parseDateKey(end);

    while (current <= last) {
      dates.push(toDateKey(current));
      current.setDate(current.getDate() + 1);
    }

    return dates;
  };

  const getMonthDaysCount = (dateKey) => {
    const date = parseDateKey(dateKey);
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getWorkingDaysCount = (dateKeys) => {
    const workingDays = team?.schedule?.workingDays || [];

    return dateKeys.filter((dateKey) => {
      const day = parseDateKey(dateKey).getDay();
      return workingDays.includes(day);
    }).length;
  };

  const getSlipId = (memberId, fromDate, toDate) => {
    return `${memberId}_${fromDate}_${toDate}`;
  };

  const fetchSalarySlips = async () => {
    if (!teamId || !selectedMemberId) return;

    setSalarySlipsLoading(true);

    try {
      const q = query(
        collection(db, "teams", teamId, "salarySlips"),
        where("memberId", "==", selectedMemberId),
      );

      const snap = await getDocs(q);

      setSalarySlips(
        snap.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        })),
      );
    } finally {
      setSalarySlipsLoading(false);
    }
  };

  const getMemberSlip = (period) => {
    if (!selectedMember) return null;

    const slipId = getSlipId(selectedMember.id, period.fromDate, period.toDate);
    return salarySlips.find((slip) => slip.id === slipId);
  };

  const getStatusBadge = (status) => {
    if (status === "settled")
      return <Badge className="bg-emerald-600">Settled</Badge>;
    if (status === "hold") return <Badge variant="secondary">Hold</Badge>;
    return <Badge variant="destructive">Pending</Badge>;
  };

  const getSalaryAmount = (salaryConfig) => {
    if (salaryConfig?.salaryType === "daily") {
      return `${formatCurrency(salaryConfig.dailyRate)} / day`;
    }

    if (salaryConfig?.salaryType === "monthly") {
      return `${formatCurrency(salaryConfig.monthlySalary)} / month`;
    }

    return "—";
  };

  const getAnnualCTC = (salaryConfig) => {
    if (salaryConfig?.salaryType !== "monthly") return "—";
    return formatCurrency(salaryConfig.annualCTC || 0);
  };

  const getSalaryHistoryPeriods = () => {
    if (!selectedMember?.salaryConfig?.joiningDate) return [];

    const salaryConfig = selectedMember.salaryConfig;
    const joiningDate = parseDateKey(salaryConfig.joiningDate);
    const today = parseDateKey(getTodayKey());

    const periods = [];

    if (salaryConfig.salaryType === "daily") {
      const dateKeys = getDateKeys(toDateKey(joiningDate), toDateKey(today));

      return dateKeys.map((dateKey) => ({
        label: formatDate(dateKey),
        fromDate: dateKey,
        toDate: dateKey,
        type: "Daily",
      }));
    }

    if (salaryConfig.salaryType === "monthly") {
      const current = new Date(
        joiningDate.getFullYear(),
        joiningDate.getMonth(),
        1,
      );

      while (current <= today) {
        const monthStart = new Date(
          current.getFullYear(),
          current.getMonth(),
          1,
        );
        const monthEnd = new Date(
          current.getFullYear(),
          current.getMonth() + 1,
          0,
        );

        const fromDate = monthStart < joiningDate ? joiningDate : monthStart;
        const toDate = monthEnd > today ? today : monthEnd;

        periods.push({
          label: current.toLocaleString("en-IN", {
            month: "long",
            year: "numeric",
          }),
          fromDate: toDateKey(fromDate),
          toDate: toDateKey(toDate),
          type: "Monthly",
        });

        current.setMonth(current.getMonth() + 1);
      }
    }

    return periods;
  };

  const fetchAttendanceSummary = async (memberId, fromDate, toDate) => {
    const attendanceDateKeys = getDateKeys(fromDate, toDate);

    let presentDays = 0;
    let absentDays = 0;
    let halfDays = 0;

    const workingDays = team?.schedule?.workingDays || [];

    await Promise.all(
      attendanceDateKeys.map(async (dateKey) => {
        const currentDate = parseDateKey(dateKey);
        const day = currentDate.getDay();

        // Skip non-working days
        if (!workingDays.includes(day)) return;

        const punchRef = doc(
          db,
          "teams",
          teamId,
          "attendance",
          dateKey,
          "punches",
          memberId,
        );

        const punchSnap = await getDoc(punchRef);

        // If no attendance on working day => absent
        if (!punchSnap.exists()) {
          absentDays += 1;
          return;
        }

        const status = punchSnap.data()?.status;

        if (status === "present") presentDays += 1;
        else if (status === "absent") absentDays += 1;
        else if (status === "halfday") halfDays += 1;
        else absentDays += 1;
      }),
    );

    const totalWorkingDays = presentDays + absentDays + halfDays;

    return {
      totalDays: attendanceDateKeys.length,
      totalDaysInMonth: getMonthDaysCount(fromDate),
      totalWorkingDays,
      presentDays,
      absentDays,
      halfDays,
      payableDays: presentDays + halfDays * 0.5,
    };
  };

  const hasNoAttendance = (preview) => {
    return (
      preview &&
      preview.presentDays === 0 &&
      preview.absentDays === preview.totalWorkingDays &&
      preview.halfDays === 0
    );
  };

  const calculateNetSalaryFromAttendance = (salaryConfig, attendance) => {
    const salaryType = salaryConfig?.salaryType;

    if (salaryType === "daily") {
      const dailyRate = Number(salaryConfig.dailyRate || 0);

      return {
        basicPay:
          attendance.presentDays * dailyRate +
          attendance.halfDays * (dailyRate / 2),
        perDaySalary: dailyRate,
        lossOfPay:
          attendance.absentDays * dailyRate +
          attendance.halfDays * (dailyRate / 2),
      };
    }

    if (salaryType === "monthly") {
      const monthlySalary = Number(salaryConfig.monthlySalary || 0);

      const perDaySalary =
        attendance.totalWorkingDays > 0
          ? monthlySalary / attendance.totalWorkingDays
          : 0;

      const payableDays = attendance.presentDays + attendance.halfDays * 0.5;

      const basicPay = payableDays * perDaySalary;

      const lossOfPay = monthlySalary - basicPay;

      return {
        basicPay,
        perDaySalary,
        lossOfPay,
      };
    }

    return {
      basicPay: 0,
      perDaySalary: 0,
      lossOfPay: 0,
    };
  };

  const fetchAttendancePreview = async (periods) => {
    if (!teamId || !selectedMember) return;

    setAttendancePreviewLoading(true);

    try {
      const result = {};

      await Promise.all(
        periods.map(async (period) => {
          const attendance = await fetchAttendanceSummary(
            selectedMember.id,
            period.fromDate,
            period.toDate,
          );

          const salaryConfig = selectedMember.salaryConfig || {};

          const { basicPay, perDaySalary, lossOfPay } =
            calculateNetSalaryFromAttendance(salaryConfig, attendance);

          const specialAllowance = Number(salaryConfig.specialAllowance || 0);
          const bonus = Number(salaryConfig.bonus || 0);
          const pf = Number(salaryConfig.pf || 0);
          const esi = Number(salaryConfig.esi || 0);

          const grossSalary = basicPay + specialAllowance + bonus;
          const totalDeductions = pf + esi;
          const netSalary = grossSalary - totalDeductions;

          const key = `${period.fromDate}_${period.toDate}`;

          result[key] = {
            ...attendance,
            perDaySalary: Math.round(perDaySalary),
            lossOfPay: Math.round(lossOfPay),
            netSalary: Math.round(netSalary),
          };
        }),
      );

      setAttendancePreview(result);
    } finally {
      setAttendancePreviewLoading(false);
    }
  };

  const getDailyAttendanceText = (preview) => {
    if (!preview) return "—";

    if (preview.presentDays === 1) return "present";
    if (preview.halfDays === 1) return "halfday";
    if (preview.absentDays === 1) return "absent";

    return "absent";
  };

  const isDailyAbsent = (preview) => {
    return (
      selectedMember?.salaryConfig?.salaryType === "daily" &&
      getDailyAttendanceText(preview) === "absent"
    );
  };

  const calculateSalary = async (member, period) => {
    const salaryConfig = member.salaryConfig || {};

    const attendance = await fetchAttendanceSummary(
      member.id,
      period.fromDate,
      period.toDate,
    );

    const salaryType = salaryConfig.salaryType || "monthly";

    const { basicPay, perDaySalary, lossOfPay } =
      calculateNetSalaryFromAttendance(salaryConfig, attendance);

    const specialAllowance = Number(salaryConfig.specialAllowance || 0);
    const bonus = Number(salaryConfig.bonus || 0);
    const pf = Number(salaryConfig.pf || 0);
    const esi = Number(salaryConfig.esi || 0);

    const grossSalary = basicPay + specialAllowance + bonus;
    const totalDeductions = pf + esi;
    const netSalary = grossSalary - totalDeductions;

    return {
      memberId: member.id,
      memberName: `${member.firstName || ""} ${member.lastName || ""}`.trim(),

      fromDate: period.fromDate,
      toDate: period.toDate,
      periodLabel: period.label,

      salaryType,
      joiningDate: salaryConfig.joiningDate || null,
      monthlySalary: Number(salaryConfig.monthlySalary || 0),
      annualCTC: Number(salaryConfig.annualCTC || 0),
      dailyRate: Number(salaryConfig.dailyRate || 0),

      totalDays: attendance.totalDays,
      totalDaysInMonth: attendance.totalDaysInMonth,
      totalWorkingDays: attendance.totalWorkingDays,
      presentDays: attendance.presentDays,
      absentDays: attendance.absentDays,
      halfDays: attendance.halfDays,
      payableDays: attendance.payableDays,

      perDaySalary: Math.round(perDaySalary),
      lossOfPay: Math.round(lossOfPay),
      basicPay: Math.round(basicPay),

      specialAllowance,
      bonus,
      pf,
      esi,

      grossSalary: Math.round(grossSalary),
      totalDeductions,
      netSalary: Math.round(netSalary),

      status: "pending",
      paidAt: null,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
  };

  const generatePayslip = async () => {
    if (!selectedMember || !selectedPeriod) return;

    setLoading(true);

    try {
      const slipData = await calculateSalary(selectedMember, selectedPeriod);

      const slipId = getSlipId(
        selectedMember.id,
        selectedPeriod.fromDate,
        selectedPeriod.toDate,
      );

      await setDoc(doc(db, "teams", teamId, "salarySlips", slipId), slipData, {
        merge: true,
      });

      await fetchSalarySlips();
    } catch (error) {
      console.error("Error generating payslip:", error);
    } finally {
      setLoading(false);
    }
  };

  const markAsPaid = async () => {
    if (!selectedMember || !selectedPeriod) return;

    setLoading(true);

    try {
      const slipId = getSlipId(
        selectedMember.id,
        selectedPeriod.fromDate,
        selectedPeriod.toDate,
      );

      const slipRef = doc(db, "teams", teamId, "salarySlips", slipId);
      const slipSnap = await getDoc(slipRef);

      if (!slipSnap.exists()) {
        const slipData = await calculateSalary(selectedMember, selectedPeriod);

        await setDoc(slipRef, {
          ...slipData,
          status: "settled",
          paidAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
      } else {
        await updateDoc(slipRef, {
          status: "settled",
          paidAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
      }

      await fetchSalarySlips();
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error marking as settled:", error);
    } finally {
      setLoading(false);
    }
  };

  const markAsHold = async () => {
    if (!selectedMember || !selectedPeriod) return;

    setLoading(true);

    try {
      const slipId = getSlipId(
        selectedMember.id,
        selectedPeriod.fromDate,
        selectedPeriod.toDate,
      );

      const slipRef = doc(db, "teams", teamId, "salarySlips", slipId);
      const slipSnap = await getDoc(slipRef);

      if (!slipSnap.exists()) {
        const slipData = await calculateSalary(selectedMember, selectedPeriod);

        await setDoc(slipRef, {
          ...slipData,
          status: "hold",
          updatedAt: Timestamp.now(),
        });
      } else {
        await updateDoc(slipRef, {
          status: "hold",
          updatedAt: Timestamp.now(),
        });
      }

      await fetchSalarySlips();
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error marking as hold:", error);
    } finally {
      setLoading(false);
    }
  };

  const openPayslip = () => {
    if (!selectedMember || !selectedPeriod) return;

    const slipId = getSlipId(
      selectedMember.id,
      selectedPeriod.fromDate,
      selectedPeriod.toDate,
    );

    router.push(
      `/admin/billing/salary-payslip?teamId=${teamId}&memberId=${selectedMember.id}&slipId=${slipId}`,
    );
  };

  const openActionModal = (period) => {
    setSelectedPeriod(period);
    setSelectedAction("");
    setIsModalOpen(true);
  };

  const historyPeriods = getSalaryHistoryPeriods();

  useEffect(() => {
    if (historyPeriods.length > 0 && selectedMember) {
      fetchAttendancePreview(historyPeriods);
    }
  }, [selectedMemberId, salarySlips, team?.schedule?.workingDays]);

  const filteredHistoryPeriods = historyPeriods.filter((period) => {
    const key = `${period.fromDate}_${period.toDate}`;
    const preview = attendancePreview[key];
    const slip = getMemberSlip(period);

    const status = slip?.status || "pending";
    const attendance = getDailyAttendanceText(preview);

    const matchesFromDate = filterFromDate
      ? period.fromDate >= filterFromDate
      : true;

    const matchesToDate = filterToDate ? period.toDate <= filterToDate : true;

    const matchesAttendance =
      filterAttendance === "all" ? true : attendance === filterAttendance;

    const matchesStatus =
      filterStatus === "all" ? true : status === filterStatus;

    return (
      matchesFromDate && matchesToDate && matchesAttendance && matchesStatus
    );
  });

  const selectedSlip = selectedPeriod ? getMemberSlip(selectedPeriod) : null;
  const salaryConfig = selectedMember?.salaryConfig || {};
  const contentLoading = salarySlipsLoading || attendancePreviewLoading;

  return (
    <div className="space-y-5">
      <Card>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
            <div className="space-y-2 w-full col-span-2 lg:col-span-1">
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

            <div className="space-y-2 w-full">
              <Label>From Date</Label>
              <Input
                type="date"
                value={filterFromDate}
                onChange={(e) => setFilterFromDate(e.target.value)}
              />
            </div>

            <div className="space-y-2 w-full">
              <Label>To Date</Label>
              <Input
                type="date"
                value={filterToDate}
                onChange={(e) => setFilterToDate(e.target.value)}
              />
            </div>

            <div className="space-y-2 w-full">
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
                  <SelectItem value="absent">Absent</SelectItem>
                  <SelectItem value="halfday">Half Day</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 w-full">
              <Label>Status</Label>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="settled">Settled</SelectItem>
                  <SelectItem value="hold">Hold</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end w-full col-span-2 lg:col-span-1">
              <Button
                type="button"
                className="w-full cursor-pointer"
                onClick={() => {
                  setFilterFromDate("");
                  setFilterToDate("");
                  setFilterAttendance("all");
                  setFilterStatus("all");
                  setSelectedMemberId("placeholder");
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
          <CardContent className="py-12 flex flex-col items-center justify-center text-center">
            <User className="h-10 w-10 text-muted-foreground mb-3" />
            <h3 className="text-lg font-semibold">Please select the member</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Select a member from the filter above to view salary details,
              attendance history, and payroll actions.
            </p>
          </CardContent>
        </Card>
      ) : contentLoading ? (
        <BillingContentLoader />
      ) : (
        <>
          <Card className="gap-4">
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5 shrink-0" />
                <span className="break-words">
                  {selectedMember.firstName} {selectedMember.lastName}
                </span>
              </CardTitle>

              <Button
                asChild
                variant="outline"
                size="sm"
                className="w-full sm:w-auto"
              >
                <Link
                  href={`/admin/teams/${teamId}/members/${selectedMember.id}`}
                >
                  Go to Profile
                </Link>
              </Button>
            </CardHeader>

            <CardContent>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">Joining Date</p>
                  <p className="font-semibold">
                    {formatDate(salaryConfig.joiningDate)}
                  </p>
                </div>

                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">Salary Type</p>
                  <p className="font-semibold capitalize">
                    {salaryConfig.salaryType || "—"}
                  </p>
                </div>

                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">Salary Amount</p>
                  <p className="font-semibold">
                    {getSalaryAmount(salaryConfig)}
                  </p>
                </div>

                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">Annual CTC</p>
                  <p className="font-semibold">{getAnnualCTC(salaryConfig)}</p>
                </div>

                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">PF</p>
                  <p className="font-semibold">
                    {formatCurrency(salaryConfig.pf)}
                  </p>
                </div>

                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">ESI</p>
                  <p className="font-semibold">
                    {formatCurrency(salaryConfig.esi)}
                  </p>
                </div>

                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">
                    Special Allowance
                  </p>
                  <p className="font-semibold">
                    {formatCurrency(salaryConfig.specialAllowance)}
                  </p>
                </div>

                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">Bonus</p>
                  <p className="font-semibold">
                    {formatCurrency(salaryConfig.bonus)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="rounded-xl border bg-card shadow-sm overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="text-center border-r">Period</TableHead>
                  <TableHead className="text-center border-r">
                    Total Days in Month
                  </TableHead>
                  <TableHead className="text-center border-r">
                    Working Days
                  </TableHead>
                  <TableHead className="text-center border-r">
                    Attendance
                  </TableHead>
                  <TableHead className="text-center border-r">
                    Net Salary
                  </TableHead>
                  <TableHead className="text-center border-r">Status</TableHead>
                  <TableHead className="text-center">Action</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filteredHistoryPeriods.map((period) => {
                  const slip = getMemberSlip(period);
                  const key = `${period.fromDate}_${period.toDate}`;
                  const preview = attendancePreview[key];
                  const noAttendance = hasNoAttendance(preview);
                  const dailyAbsent = isDailyAbsent(preview);

                  return (
                    <TableRow key={key}>
                      <TableCell className="text-center font-medium border-r">
                        {period.label}
                      </TableCell>

                      <TableCell className="text-center border-r">
                        {preview?.totalDaysInMonth || "—"}
                      </TableCell>

                      <TableCell className="text-center border-r">
                        {preview?.totalWorkingDays || "—"}
                      </TableCell>

                      <TableCell className="border-r p-0">
                        {preview ? (
                          selectedMember?.salaryConfig?.salaryType ===
                          "daily" ? (
                            <div className="flex items-center justify-center h-full py-3 text-sm font-medium">
                              {getDailyAttendanceText(preview) === "present" ? (
                                <span className="text-emerald-600">
                                  Present
                                </span>
                              ) : getDailyAttendanceText(preview) ===
                                "halfday" ? (
                                <span className="text-orange-500">
                                  Half Day
                                </span>
                              ) : (
                                <span className="text-red-600">Absent</span>
                              )}
                            </div>
                          ) : (
                            <div className="flex flex-col divide-y text-sm">
                              <div className="py-2 px-3 text-emerald-600 font-medium text-center">
                                Present: {preview.presentDays}
                              </div>
                              <div className="py-2 px-3 text-red-600 font-medium text-center">
                                Absent: {preview.absentDays}
                              </div>
                              <div className="py-2 px-3 text-orange-500 font-medium text-center">
                                Half Day: {preview.halfDays}
                              </div>
                            </div>
                          )
                        ) : (
                          <div className="py-3 text-center">—</div>
                        )}
                      </TableCell>

                      <TableCell className="text-center font-bold border-r">
                        {slip
                          ? formatCurrency(slip.netSalary)
                          : preview
                            ? formatCurrency(preview.netSalary)
                            : "—"}
                      </TableCell>

                      <TableCell className="text-center border-r">
                        {noAttendance
                          ? "-"
                          : dailyAbsent
                            ? "—"
                            : getStatusBadge(slip?.status)}
                      </TableCell>

                      <TableCell className="text-center">
                        {noAttendance ? (
                          <span className="text-sm text-muted-foreground">
                            Not Applicable
                          </span>
                        ) : dailyAbsent ? (
                          <span className="text-sm text-muted-foreground">
                            Not Applicable
                          </span>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openActionModal(period)}
                          >
                            Action
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Salary Action</DialogTitle>
            <DialogDescription>
              Manage salary for{" "}
              <strong>
                {selectedMember?.firstName} {selectedMember?.lastName}
              </strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Period</span>
                <strong>{selectedPeriod?.label}</strong>
              </div>

              <div className="flex justify-between text-sm">
                <span>Date</span>
                <strong>
                  {selectedPeriod?.fromDate} to {selectedPeriod?.toDate}
                </strong>
              </div>

              <div className="flex justify-between text-sm">
                <span>Status</span>
                <span>{getStatusBadge(selectedSlip?.status)}</span>
              </div>

              <div className="flex justify-between text-sm">
                <span>Net Salary</span>
                <strong>
                  {selectedSlip
                    ? formatCurrency(selectedSlip.netSalary)
                    : "Not Generated"}
                </strong>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Select Action</Label>

              <Select value={selectedAction} onValueChange={setSelectedAction}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose action" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="pay">Pay</SelectItem>
                  <SelectItem value="hold">Hold</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedAction === "pay" && (
              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={generatePayslip}
                    disabled={loading}
                  >
                    {selectedSlip ? "Regenerate Payslip" : "Generate Payslip"}
                  </Button>

                  <Button onClick={markAsPaid} disabled={loading}>
                    Mark as Settled
                  </Button>

                  {selectedSlip && (
                    <Button variant="secondary" onClick={openPayslip}>
                      <PiFilePdf className="mr-2 text-lg" />
                      Download Payslip
                    </Button>
                  )}
                </div>
              </div>
            )}

            {selectedAction === "hold" && (
              <div className="rounded-lg border p-4">
                <Button
                  variant="outline"
                  onClick={markAsHold}
                  disabled={loading}
                >
                  Mark as Hold
                </Button>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Salary;
