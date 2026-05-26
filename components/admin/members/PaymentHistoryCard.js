"use client";

import React from "react";
import { toast } from "sonner";
import { FileDown } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { generateReceipt } from "@/components/admin/billing/GenerateReceipt";

const formatCurrency = (value) =>
  `Rs. ${Number(value || 0).toLocaleString("en-IN")}`;

const formatStatus = (status = "") =>
  String(status || "success")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const getStatusClassName = (status = "") => {
  const normalized = String(status || "success").toLowerCase();

  if (["success", "captured", "paid"].includes(normalized)) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300";
  }

  if (
    ["failed", "cancelled", "verification_failed", "expired"].includes(
      normalized,
    )
  ) {
    return "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300";
  }

  if (["created", "pending", "authorized"].includes(normalized)) {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300";
  }

  if (["partial", "partially_paid"].includes(normalized)) {
    return "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-300";
  }

  return "border-muted bg-muted text-muted-foreground";
};

const PaymentHistoryTable = ({
  payments = [],
  billingPeriods = [],
  team,
  member,
}) => {
  const formatDateTime = (timestamp) => {
    if (!timestamp?.seconds) return "Date N/A";
    return new Date(timestamp.seconds * 1000).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const periodByPaymentKey = React.useMemo(() => {
    const map = new Map();

    billingPeriods.forEach((period) => {
      if (period.id) map.set(period.id, period);
      if (period.periodLabel) map.set(period.periodLabel, period);
      if (period.period) map.set(period.period, period);
      if (period.periodKey) map.set(period.periodKey, period);
    });

    return map;
  }, [billingPeriods]);

  const getPaymentPeriod = (payment) =>
    periodByPaymentKey.get(payment.periodId) ||
    periodByPaymentKey.get(payment.periodLabel) ||
    periodByPaymentKey.get(payment.period) ||
    null;

  const getPaymentDiscount = (payment) => {
    if (payment.discountAmount !== undefined) {
      return Number(payment.discountAmount || 0);
    }

    return Number(getPaymentPeriod(payment)?.discountAmount || 0);
  };

  const downloadPaymentReceipt = async (payment) => {
    try {
      const period = getPaymentPeriod(payment);
      const paidAmount = Number(payment.paidAmount || payment.amount || 0);
      const periodAmount = Number(
        payment.periodAmount || period?.amount || paidAmount || 0,
      );
      const totalDiscount = Number(
        payment.totalDiscountAmount ?? period?.discountAmount ?? 0,
      );
      const previousPaid = Number(
        payment.previousPaid ??
          Math.max(Number(period?.paid || 0) - paidAmount, 0),
      );
      const balanceAfterPayment = Number(
        payment.balanceAfterPayment ??
          Math.max(periodAmount - previousPaid - paidAmount - totalDiscount, 0),
      );

      await generateReceipt({
        team,
        member,
        period: {
          ...(period || {}),
          ...payment,
          id: payment.id,
          receiptNo: payment.razorpayPaymentId || payment.id,
          periodLabel:
            payment.periodLabel || payment.period || period?.periodLabel,
          billingCycle: payment.billingCycle || period?.billingCycle,
          periodAmount,
          previousPaid,
          previousDiscount: Number(payment.previousDiscount || 0),
          paidAmount,
          paymentDiscountAmount: Number(payment.discountAmount || 0),
          totalDiscountAmount: totalDiscount,
          balanceAfterPayment,
          paymentMode: payment.paymentMode,
        },
      });

      toast.success("Receipt downloaded successfully");
    } catch (error) {
      console.error("Receipt download failed:", error);
      toast.error("Failed to download receipt");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Payment History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Date & Time</TableHead>
                <TableHead>Member</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No payment records found.
                  </TableCell>
                </TableRow>
              ) : (
                payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="whitespace-nowrap font-medium">
                      {formatDateTime(payment.createdAt)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {payment.memberName ||
                        `${member?.firstName || ""} ${member?.lastName || ""}`.trim() ||
                        "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {payment.periodLabel ||
                          payment.period ||
                          "General Payment"}
                      </Badge>
                    </TableCell>
                    <TableCell>{payment.paymentMode || "-"}</TableCell>
                    <TableCell className="font-bold">
                      {formatCurrency(payment.amount)}
                    </TableCell>
                    <TableCell>{formatCurrency(getPaymentDiscount(payment))}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={getStatusClassName(payment.status)}
                      >
                        {formatStatus(payment.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={payment.status && payment.status !== "success"}
                        onClick={() => downloadPaymentReceipt(payment)}
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
      </CardContent>
    </Card>
  );
};

export default PaymentHistoryTable;
