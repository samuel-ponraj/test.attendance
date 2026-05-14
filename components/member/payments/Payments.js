"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  collection,
  doc,
  onSnapshot,
  query,
  runTransaction,
  Timestamp,
  where,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import {
  CreditCard,
  FileDown,
  Loader2,
  ReceiptText,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import { auth, db } from "@/lib/firebase";
import { generatePayslip } from "@/lib/GeneratePayslip";
import { generateReceipt } from "@/components/admin/billing/GenerateReceipt";
import { useMembers } from "@/app/context/MembersContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const formatCurrency = (value) =>
  `Rs. ${Number(value || 0).toLocaleString("en-IN")}`;

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

const formatDateTime = (value) => {
  if (!value) return "-";

  const date = value?.seconds
    ? new Date(value.seconds * 1000)
    : new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatLabel = (value) => {
  if (!value) return "-";

  if (String(value).toLowerCase() === "upi") return "UPI";

  return String(value)
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const getEffectiveBalance = (period) => {
  const amount = Number(period?.amount || 0);
  const paid = Number(period?.paid || 0);
  const discount = Number(period?.discountAmount || 0);

  return Math.max(amount - paid - discount, 0);
};

const getPaymentStatusBadge = (status) => {
  if (status === "success") {
    return <Badge className="bg-emerald-600">Success</Badge>;
  }

  if (status === "failed") {
    return <Badge variant="destructive">Failed</Badge>;
  }

  return <Badge variant="secondary">{formatLabel(status || "Recorded")}</Badge>;
};

const getSalaryStatusBadge = (status) => {
  if (status === "settled") {
    return <Badge className="bg-emerald-600">Settled</Badge>;
  }

  if (status === "partial") {
    return <Badge className="bg-orange-500">Partial</Badge>;
  }

  if (status === "hold") {
    return <Badge variant="secondary">Hold</Badge>;
  }

  return <Badge variant="destructive">Pending</Badge>;
};

const getSalaryPaidAmount = (slip) => {
  if (!slip) return 0;
  const netSalary = Number(slip.netSalary || 0);
  return Math.min(Number(slip.amountPaid ?? netSalary), netSalary);
};

const loadRazorpayCheckout = () =>
  new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Razorpay checkout is only available in the browser"));
      return;
    }

    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () =>
      reject(new Error("Failed to load Razorpay checkout"));
    document.body.appendChild(script);
  });

const Payments = () => {
  const { members, loading: membersLoading } = useMembers();

  const [authUser, setAuthUser] = useState(null);
  const [team, setTeam] = useState(null);
  const [billingPeriods, setBillingPeriods] = useState([]);
  const [payments, setPayments] = useState([]);
  const [salarySlips, setSalarySlips] = useState([]);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [selectedPeriodId, setSelectedPeriodId] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState("upi");
  const [saving, setSaving] = useState(false);

  const member = members?.[0] || null;
  const teamId = member?.teamId || "";
  const memberId = member?.id || "";
  const memberName =
    `${member?.firstName || ""} ${member?.lastName || ""}`.trim();
  const billingConfig = team?.billingConfig || {};
  const salaryConfig = member?.salaryConfig || {};
  const billingType = billingConfig?.billingType || "";
  const billingCycle = billingConfig?.billingCycle || "";
  const isSalaryBilling = billingType === "salary";

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthUser(user || null);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!teamId) return;

    const unsubscribe = onSnapshot(doc(db, "teams", teamId), (snapshot) => {
      setTeam(
        snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null,
      );
    });

    return () => unsubscribe();
  }, [teamId]);

  useEffect(() => {
    if (!teamId || !memberId || isSalaryBilling) return;

    const periodsRef = collection(
      db,
      "teams",
      teamId,
      "members",
      memberId,
      "billingPeriods",
    );

    const unsubscribe = onSnapshot(periodsRef, (snapshot) => {
      const list = snapshot.docs
        .map((periodDoc) => ({
          id: periodDoc.id,
          ...periodDoc.data(),
        }))
        .sort((a, b) => {
          const aTime = a.fromDate?.seconds
            ? a.fromDate.seconds * 1000
            : new Date(a.fromDate || 0).getTime();
          const bTime = b.fromDate?.seconds
            ? b.fromDate.seconds * 1000
            : new Date(b.fromDate || 0).getTime();

          return aTime - bTime;
        });

      setBillingPeriods(list);
    });

    return () => unsubscribe();
  }, [isSalaryBilling, memberId, teamId]);

  useEffect(() => {
    if (!teamId || !memberId) return;

    const paymentsRef = query(
      collection(db, "teams", teamId, "payments"),
      where("memberId", "==", memberId),
    );

    const unsubscribe = onSnapshot(paymentsRef, (snapshot) => {
      const list = snapshot.docs
        .map((paymentDoc) => ({
          id: paymentDoc.id,
          ...paymentDoc.data(),
        }))
        .sort((a, b) => {
          const aTime = a.createdAt?.seconds
            ? a.createdAt.seconds * 1000
            : new Date(a.createdAt || 0).getTime();
          const bTime = b.createdAt?.seconds
            ? b.createdAt.seconds * 1000
            : new Date(b.createdAt || 0).getTime();

          return bTime - aTime;
        });

      setPayments(list);
    });

    return () => unsubscribe();
  }, [memberId, teamId]);

  useEffect(() => {
    if (!teamId || !memberId || !isSalaryBilling) return;

    const slipsRef = query(
      collection(db, "teams", teamId, "salarySlips"),
      where("memberId", "==", memberId),
    );

    const unsubscribe = onSnapshot(slipsRef, (snapshot) => {
      const list = snapshot.docs
        .map((slipDoc) => ({
          id: slipDoc.id,
          ...slipDoc.data(),
        }))
        .sort((a, b) => {
          const aTime = new Date(a.fromDate || 0).getTime();
          const bTime = new Date(b.fromDate || 0).getTime();

          return bTime - aTime;
        });

      setSalarySlips(list);
    });

    return () => unsubscribe();
  }, [isSalaryBilling, memberId, teamId]);

  const activeBillingPeriods = useMemo(() => {
    if (!billingCycle) return billingPeriods;

    if (billingCycle === "term") {
      const validTermKeys = new Set(
        (billingConfig?.academicYears || []).flatMap((yearItem) =>
          (yearItem.terms || []).map(
            (term) => `${yearItem.academicYear}_term_${term.termNo}`,
          ),
        ),
      );

      return billingPeriods.filter(
        (period) =>
          period.billingCycle === "term" && validTermKeys.has(period.periodKey),
      );
    }

    return billingPeriods.filter(
      (period) => period.billingCycle === billingCycle,
    );
  }, [billingConfig?.academicYears, billingCycle, billingPeriods]);

  const payablePeriods = useMemo(
    () =>
      activeBillingPeriods.filter((period) => {
        if (period.status === "holiday" || period.status === "leave")
          return false;
        return getEffectiveBalance(period) > 0;
      }),
    [activeBillingPeriods],
  );

  const getPeriodLabel = (period) => {
    if (!period) return "-";

    if (period.periodLabel) return period.periodLabel;
    if (period.label) return period.label;
    if (period.fromDate && period.toDate && period.fromDate !== period.toDate) {
      return `${formatDate(period.fromDate)} - ${formatDate(period.toDate)}`;
    }
    if (period.fromDate) return formatDate(period.fromDate);

    return period.id || "-";
  };

  const selectedPaymentPeriod = useMemo(
    () =>
      payablePeriods.find((period) => period.id === selectedPeriodId) || null,
    [payablePeriods, selectedPeriodId],
  );

  const selectedPaymentBalance = selectedPaymentPeriod
    ? getEffectiveBalance(selectedPaymentPeriod)
    : 0;

  const billingSummary = useMemo(
    () =>
      activeBillingPeriods.reduce(
        (summary, period) => {
          if (period.status === "holiday" || period.status === "leave") {
            return summary;
          }

          const amount = Number(period.amount || 0);
          const paid = Number(period.paid || 0);
          const discount = Number(period.discountAmount || 0);

          return {
            totalAmount: summary.totalAmount + amount,
            totalPaid: summary.totalPaid + paid,
            totalDiscount: summary.totalDiscount + discount,
            totalBalance: summary.totalBalance + getEffectiveBalance(period),
          };
        },
        {
          totalAmount: 0,
          totalPaid: 0,
          totalDiscount: 0,
          totalBalance: 0,
        },
      ),
    [activeBillingPeriods],
  );

  const periodByPaymentKey = useMemo(() => {
    const map = new Map();

    activeBillingPeriods.forEach((period) => {
      if (period.id) map.set(period.id, period);
      if (period.periodLabel) map.set(period.periodLabel, period);
      if (period.label) map.set(period.label, period);
      if (period.periodKey) map.set(period.periodKey, period);
    });

    return map;
  }, [activeBillingPeriods]);

  const getPaymentDiscount = (payment) => {
    if (payment.discountAmount !== undefined) {
      return Number(payment.discountAmount || 0);
    }

    const period =
      periodByPaymentKey.get(payment.periodId) ||
      periodByPaymentKey.get(payment.periodLabel) ||
      periodByPaymentKey.get(payment.period);

    return Number(period?.discountAmount || 0);
  };

  const getPaymentPeriod = (payment) => {
    return (
      periodByPaymentKey.get(payment.periodId) ||
      periodByPaymentKey.get(payment.periodLabel) ||
      periodByPaymentKey.get(payment.period) ||
      null
    );
  };

  const downloadPaymentReceipt = async (payment) => {
    try {
      const period = getPaymentPeriod(payment);
      const receiptPeriod = {
        ...(period || {}),
        ...payment,
        id: payment.id,
        receiptNo: payment.razorpayPaymentId || payment.id,
        periodLabel:
          payment.periodLabel || payment.period || period?.periodLabel,
        billingCycle:
          payment.billingCycle || period?.billingCycle || billingCycle,
        paymentMode: payment.paymentMode,
        lastPaymentAmount: Number(payment.amount || 0),
        totalAmount: Number(payment.amount || 0),
        discountAmount: getPaymentDiscount(payment),
        lastPaymentBaseAmount: Number(period?.amount || payment.amount || 0),
      };

      await generateReceipt({
        team,
        member,
        period: receiptPeriod,
      });

      toast.success("Receipt downloaded successfully");
    } catch (error) {
      console.error("Receipt download failed:", error);
      toast.error("Failed to download receipt");
    }
  };

  const downloadSalaryPayslip = async (slip) => {
    try {
      await generatePayslip({
        team,
        member,
        slip,
      });

      toast.success("Payslip downloaded successfully");
    } catch (error) {
      console.error("Salary payslip download failed:", error);
      toast.error("Failed to download payslip");
    }
  };

  const salarySummary = useMemo(
    () =>
      salarySlips.reduce(
        (summary, slip) => ({
          totalNetSalary: summary.totalNetSalary + Number(slip.netSalary || 0),
          totalSettled:
            summary.totalSettled +
            (slip.status === "settled" ? Number(slip.netSalary || 0) : 0),
          pendingCount:
            summary.pendingCount + (slip.status === "pending" ? 1 : 0),
        }),
        {
          totalNetSalary: 0,
          totalSettled: 0,
          pendingCount: 0,
        },
      ),
    [salarySlips],
  );

  const openPaymentDialog = () => {
    const firstPendingPeriod = payablePeriods[0] || null;
    const firstPendingBalance = firstPendingPeriod
      ? getEffectiveBalance(firstPendingPeriod)
      : 0;

    setSelectedPeriodId(firstPendingPeriod?.id || "");
    setPaymentAmount(firstPendingBalance ? String(firstPendingBalance) : "");
    setPaymentMode("upi");
    setIsPaymentOpen(true);
  };

  const settleSelectedPayment = async (amount, razorpayDetails = {}) => {
    setSaving(true);

    try {
      await runTransaction(db, async (transaction) => {
        const periodSnapshots = [];

        const targetPeriods = payablePeriods.filter(
          (period) => period.id === selectedPeriodId,
        );

        for (const period of targetPeriods) {
          const periodRef = doc(
            db,
            "teams",
            teamId,
            "members",
            memberId,
            "billingPeriods",
            period.id,
          );
          const periodSnap = await transaction.get(periodRef);

          if (periodSnap.exists()) {
            periodSnapshots.push({
              ref: periodRef,
              id: period.id,
              data: periodSnap.data(),
            });
          }
        }

        const updatedPeriods = new Map();
        const paidLabels = [];
        let paidTotal = 0;

        for (const periodItem of periodSnapshots) {
          const period = periodItem.data;
          const balance = getEffectiveBalance(period);

          if (
            balance <= 0 ||
            period.status === "holiday" ||
            period.status === "leave"
          ) {
            continue;
          }

          const paidNow = Math.min(balance, amount);
          const newPaid = Number(period.paid || 0) + paidNow;
          const discount = Number(period.discountAmount || 0);
          const newBalance = Math.max(
            Number(period.amount || 0) - newPaid - discount,
            0,
          );
          const newStatus = newBalance <= 0 ? "settled" : "partial";

          transaction.update(periodItem.ref, {
            paid: newPaid,
            balance: newBalance,
            status: newStatus,
            lastPaymentAmount: paidNow,
            paymentMode,
            lastPaymentDate: Timestamp.now(),
            updatedAt: Timestamp.now(),
          });

          updatedPeriods.set(periodItem.id, {
            ...period,
            paid: newPaid,
            balance: newBalance,
            status: newStatus,
          });
          paidLabels.push(period.periodLabel || period.label || periodItem.id);
          paidTotal += paidNow;
        }

        if (updatedPeriods.size === 0 || paidTotal <= 0) {
          throw new Error("Selected billing period is already settled");
        }

        const nextSummary = activeBillingPeriods.reduce(
          (summary, period) => {
            if (period.status === "holiday" || period.status === "leave") {
              return summary;
            }

            const latest = updatedPeriods.get(period.id) || period;
            const discount = Number(latest.discountAmount || 0);

            return {
              totalPaid: summary.totalPaid + Number(latest.paid || 0),
              totalDiscount: summary.totalDiscount + discount,
              totalBalance: summary.totalBalance + getEffectiveBalance(latest),
            };
          },
          {
            totalPaid: 0,
            totalDiscount: 0,
            totalBalance: 0,
          },
        );

        const memberRef = doc(db, "teams", teamId, "members", memberId);
        transaction.set(
          memberRef,
          {
            billing: {
              totalPaid: nextSummary.totalPaid,
              totalBalance: nextSummary.totalBalance,
              totalDiscount: nextSummary.totalDiscount,
              lastPaymentDate: Timestamp.now(),
            },
          },
          { merge: true },
        );

        const paymentRef = doc(collection(db, "teams", teamId, "payments"));
        transaction.set(paymentRef, {
          memberId,
          memberName,
          periodId: selectedPeriodId,
          period: paidLabels.join(", "),
          periodLabel: paidLabels.join(", "),
          billingCycle,
          paymentMode,
          amount: paidTotal,
          discountAmount: 0,
          status: "success",
          source: "member_portal",
          gateway: razorpayDetails.gateway || null,
          razorpayOrderId: razorpayDetails.orderId || null,
          razorpayPaymentId: razorpayDetails.paymentId || null,
          razorpaySignature: razorpayDetails.signature || null,
          capturedBy: authUser?.displayName || authUser?.email || memberName,
          capturedById: authUser?.uid || null,
          createdAt: Timestamp.now(),
        });
      });

      toast.success(`Payment success - ${formatLabel(paymentMode)}`);
      setIsPaymentOpen(false);
      setPaymentAmount("");
    } catch (error) {
      console.error("Payment failed:", error);
      toast.error("Failed to record payment");
    } finally {
      setSaving(false);
    }
  };

  const openRazorpayPayment = async (amount) => {
    setSaving(true);

    try {
      const orderRes = await fetch("/api/razorpay/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount,
          receipt: `${memberId}_${selectedPeriodId}`,
          notes: {
            teamId,
            memberId,
            periodId: selectedPeriodId,
            periodLabel: getPeriodLabel(selectedPaymentPeriod),
          },
        }),
      });

      const orderData = await orderRes.json();

      if (!orderRes.ok) {
        throw new Error(orderData.error || "Failed to create Razorpay order");
      }

      await loadRazorpayCheckout();

      let completed = false;

      const checkout = new window.Razorpay({
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency || "INR",
        name: "Kingz Digital Attendance",
        description: getPeriodLabel(selectedPaymentPeriod),
        order_id: orderData.orderId,
        prefill: {
          name: memberName,
          email: member?.email || authUser?.email || "",
          contact: member?.contact || "",
        },
        notes: {
          teamId,
          memberId,
          periodId: selectedPeriodId,
        },
        theme: {
          color: "#111827",
        },
        handler: async (response) => {
          completed = true;

          try {
            const verifyRes = await fetch("/api/razorpay/verify-payment", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(response),
            });

            const verifyData = await verifyRes.json();

            if (!verifyRes.ok || !verifyData.success) {
              throw new Error(
                verifyData.error || "Razorpay payment verification failed",
              );
            }

            await settleSelectedPayment(amount, {
              gateway: "razorpay",
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            });
          } catch (error) {
            console.error("Razorpay payment verification failed:", error);
            toast.error(error.message || "Payment verification failed");
            setSaving(false);
          }
        },
        modal: {
          ondismiss: () => {
            if (!completed) {
              setSaving(false);
              toast.error("Payment cancelled");
            }
          },
        },
      });

      checkout.open();
    } catch (error) {
      console.error("Razorpay payment failed:", error);
      toast.error(error.message || "Failed to start Razorpay payment");
      setSaving(false);
    }
  };

  const recordMemberPayment = async () => {
    const amount = Number(paymentAmount || 0);

    if (!teamId || !memberId || !member) {
      toast.error("Member details not available");
      return;
    }

    if (isSalaryBilling) {
      toast.error("Salary records are managed by your admin");
      return;
    }

    if (amount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }

    if (!selectedPaymentPeriod) {
      toast.error("Select a pending billing period");
      return;
    }

    if (amount > selectedPaymentBalance) {
      toast.error(
        `Amount exceeds selected period due of ${formatCurrency(selectedPaymentBalance)}`,
      );
      return;
    }

    if (!payablePeriods.length) {
      toast.error("No pending dues found");
      return;
    }

    if (paymentMode === "upi") {
      await openRazorpayPayment(amount);
      return;
    }

    await settleSelectedPayment(amount);
  };

  if (membersLoading || (teamId && !team)) {
    return (
      <div className="flex min-h-[360px] items-center justify-center px-4">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!member) {
    return (
      <div className="px-4 md:px-6">
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No member profile found for this account.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4 md:px-6">
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Wallet className="h-5 w-5 text-primary" />
              Current Payment Dues
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {team?.name || "Your team"} ·{" "}
              {formatLabel(billingType || "billing")}
            </p>
          </div>

          <Badge
            variant={
              isSalaryBilling || billingSummary.totalBalance <= 0
                ? "secondary"
                : "destructive"
            }
          >
            {isSalaryBilling
              ? "Salary Based"
              : billingSummary.totalBalance > 0
                ? "Payment Due"
                : "Settled"}
          </Badge>
        </CardHeader>

        <CardContent className="space-y-5">
          {isSalaryBilling ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">Salary Type</p>
                  <p className="text-lg font-semibold">
                    {formatLabel(salaryConfig.salaryType)}
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">Salary Amount</p>
                  <p className="text-lg font-semibold">
                    {salaryConfig.salaryType === "daily"
                      ? `${formatCurrency(salaryConfig.dailyRate)} / day`
                      : `${formatCurrency(salaryConfig.monthlySalary)} / month`}
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">
                    Total Net Salary
                  </p>
                  <p className="text-lg font-semibold">
                    {formatCurrency(salarySummary.totalNetSalary)}
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">
                    Settled Salary
                  </p>
                  <p className="text-lg font-semibold text-emerald-600">
                    {formatCurrency(salarySummary.totalSettled)}
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">Pending Slips</p>
                  <p className="text-lg font-semibold">
                    {salarySummary.pendingCount}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 rounded-lg border bg-background p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">Salary details are managed by admin</p>
                  <p className="text-sm text-muted-foreground">
                    View your full salary configuration from your profile.
                  </p>
                </div>

                <Button asChild variant="outline" className="w-full sm:w-auto">
                  <Link href="/member/profile">Go to Profile</Link>
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">Total Amount</p>
                  <p className="text-lg font-semibold">
                    {formatCurrency(billingSummary.totalAmount)}
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">Total Paid</p>
                  <p className="text-lg font-semibold text-emerald-600">
                    {formatCurrency(billingSummary.totalPaid)}
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">Current Due</p>
                  <p className="text-lg font-semibold text-red-600">
                    {formatCurrency(billingSummary.totalBalance)}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 rounded-lg border bg-background p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">
                    {payablePeriods.length > 0
                      ? `${payablePeriods.length} pending billing period${payablePeriods.length === 1 ? "" : "s"}`
                      : "No pending dues"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Billing cycle: {formatLabel(billingCycle)}
                  </p>
                </div>

                <Button
                  className="w-full sm:w-auto"
                  disabled={billingSummary.totalBalance <= 0 || saving}
                  onClick={openPaymentDialog}
                >
                  <CreditCard className="h-4 w-4" />
                  Pay Now
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ReceiptText className="h-5 w-5 text-primary" />
            {isSalaryBilling ? "Payroll History" : "Payment History"}
          </CardTitle>
        </CardHeader>

        <CardContent className="p-0">
          {isSalaryBilling ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="border-r text-center">Period</TableHead>
                    <TableHead className="border-r text-center">From</TableHead>
                    <TableHead className="border-r text-center">To</TableHead>
                    <TableHead className="border-r text-center">Working Days</TableHead>
                    <TableHead className="border-r text-center">Attendance</TableHead>
                    <TableHead className="border-r text-center">Bonus</TableHead>
                    <TableHead className="border-r text-center">Deductions</TableHead>
                    <TableHead className="border-r text-center">Net Salary</TableHead>
                    <TableHead className="border-r text-center">Amount Paid</TableHead>
                    <TableHead className="border-r text-center">Status</TableHead>
                    <TableHead className="border-r text-center">Paid On</TableHead>
                    <TableHead className="border-r text-center">Notes</TableHead>
                    <TableHead className="text-center">Payslip</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {salarySlips.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={13}
                        className="h-28 text-center text-muted-foreground"
                      >
                        No salary records found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    salarySlips.map((slip) => (
                      <TableRow key={slip.id}>
                        <TableCell className="border-r text-center font-medium">
                          {slip.periodLabel || "-"}
                        </TableCell>
                        <TableCell className="border-r text-center">
                          {formatDate(slip.fromDate)}
                        </TableCell>
                        <TableCell className="border-r text-center">
                          {formatDate(slip.toDate)}
                        </TableCell>
                        <TableCell className="border-r text-center">
                          {slip.totalWorkingDays || 0}
                        </TableCell>
                        <TableCell className="border-r">
                          <div className="flex flex-wrap justify-center gap-2 text-xs">
                            <span className="text-emerald-600">
                              P: {slip.presentDays || 0}
                            </span>
                            <span className="text-orange-500">
                              H: {slip.halfDays || 0}
                            </span>
                            <span className="text-red-600">
                              A: {slip.absentDays || 0}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="border-r text-center font-semibold">
                          {formatCurrency(slip.bonus || 0)}
                        </TableCell>
                        <TableCell className="border-r text-center font-semibold">
                          {formatCurrency(slip.deductions || 0)}
                        </TableCell>
                        <TableCell className="border-r text-center font-semibold">
                          {formatCurrency(slip.netSalary)}
                        </TableCell>
                        <TableCell className="border-r text-center font-semibold">
                          {formatCurrency(getSalaryPaidAmount(slip))}
                        </TableCell>
                        <TableCell className="border-r text-center">
                          {getSalaryStatusBadge(slip.status)}
                        </TableCell>
                        <TableCell className="border-r text-center">
                          {formatDate(slip.paidAt)}
                        </TableCell>
                        <TableCell className="border-r text-center">
                          {slip.notes || "-"}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={
                              !["settled", "partial"].includes(slip.status)
                            }
                            onClick={() => downloadSalaryPayslip(slip)}
                            aria-label="Download payslip"
                          >
                            Payslip
                            <FileDown className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="border-r text-center">Date & Time</TableHead>
                    <TableHead className="border-r text-center">Member</TableHead>
                    <TableHead className="border-r text-center">Payment ID</TableHead>
                    <TableHead className="border-r text-center">Period</TableHead>
                    <TableHead className="border-r text-center">Method</TableHead>
                    <TableHead className="border-r text-center">Amount</TableHead>
                    <TableHead className="border-r text-center">Discount</TableHead>
                    <TableHead className="border-r text-center">Status</TableHead>
                    <TableHead className="text-center">Action</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {payments.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={9}
                        className="h-28 text-center text-muted-foreground"
                      >
                        No payment history found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="whitespace-nowrap border-r text-center">
                          {formatDateTime(payment.createdAt)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap border-r text-center">
                          {payment.memberName || memberName || "-"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap border-r text-center">
                          {payment.razorpayPaymentId || "-"}
                        </TableCell>
                        <TableCell className="border-r text-center font-medium">
                          {payment.periodLabel || payment.period || "-"}
                        </TableCell>
                        <TableCell className="border-r text-center">
                          {formatLabel(payment.paymentMode)}
                        </TableCell>
                        <TableCell className="border-r text-center font-semibold">
                          {formatCurrency(payment.amount)}
                        </TableCell>
                        <TableCell className="border-r text-center">
                          {formatCurrency(getPaymentDiscount(payment))}
                        </TableCell>
                        <TableCell className="border-r text-center">
                          {getPaymentStatusBadge(payment.status)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={payment.status !== "success"}
                            onClick={() => downloadPaymentReceipt(payment)}
                            aria-label="Download receipt"
                          >
                            Receipt
                            <FileDown className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pay Current Dues</DialogTitle>
            <DialogDescription>
              Select the pending {formatLabel(billingCycle).toLowerCase()}{" "}
              period you want to pay for.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/40 p-3">
              <p className="text-sm text-muted-foreground">
                Selected Period Due
              </p>
              <p className="text-xl font-bold text-red-600">
                {formatCurrency(selectedPaymentBalance)}
              </p>
            </div>

            <div className="space-y-2 w-full">
              <Label>Pay For</Label>
              <Select
                value={selectedPeriodId}
                onValueChange={(value) => {
                  const period = payablePeriods.find(
                    (item) => item.id === value,
                  );
                  setSelectedPeriodId(value);
                  setPaymentAmount(
                    period ? String(getEffectiveBalance(period)) : "",
                  );
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select pending period" />
                </SelectTrigger>
                <SelectContent>
                  {payablePeriods.map((period) => (
                    <SelectItem key={period.id} value={period.id}>
                      {getPeriodLabel(period)} -{" "}
                      {formatCurrency(getEffectiveBalance(period))}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col md:flex-row w-full gap-4">
              <div className="space-y-2 flex-1">
                <Label>Amount</Label>
                <Input
                  type="number"
                  min={1}
                  max={selectedPaymentBalance}
                  value={paymentAmount}
                  onChange={(event) => setPaymentAmount(event.target.value)}
                  className="w-full"
                />
              </div>

              <div className="space-y-2 flex-1">
                <Label>Payment Mode</Label>
                <Select value={paymentMode} onValueChange={setPaymentMode}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select payment mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsPaymentOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={recordMemberPayment} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : paymentMode === "upi" ? (
                "Pay"
              ) : (
                "Confirm Payment"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Payments;
