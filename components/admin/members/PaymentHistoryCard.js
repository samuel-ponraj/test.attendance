"use client";

import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { CalendarDays, CreditCard, ReceiptText, User } from "lucide-react";

const PaymentHistoryTable = ({ payments = [] }) => {
  // Helper to format Firebase Timestamp
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

  return (
    <Card className="">
      <CardHeader>
        <CardTitle className="text-xl ">
          Payment History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Date & Time</TableHead>
                <TableHead>Member</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                    No payment records found.
                  </TableCell>
                </TableRow>
              ) : (
                payments.map((payment) => (
                  <TableRow key={payment.id}>
                    {/* Date */}
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {formatDateTime(payment.createdAt)}
                      </div>
                    </TableCell>

                    {/* Member */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {payment.memberName}
                      </div>
                    </TableCell>

                    {/* Period */}
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {payment.period || "General Payment"}
                      </Badge>
                    </TableCell>

                    {/* Method */}
                    <TableCell>
                      <div className="flex items-center ">
                        {payment.paymentMode}
                      </div>
                    </TableCell>

                    {/* Amount */}
                    <TableCell className="font-bold ">
                      ₹{payment.amount?.toLocaleString()}
                    </TableCell>

                    {/* Status */}
                    <TableCell className="text-right">
                      <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 ">
                        Success
                      </Badge>
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