"use client";

import React, { useState } from "react";
import {
  doc,
  collection,
  runTransaction,
  increment,
  Timestamp
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const RecordPaymentModal = ({ isOpen, onOpenChange, member, team, getStatusDetail, onSuccess }) => {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("Cash");
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async () => {
    const numAmount = Number(amount);
    if (!amount || numAmount <= 0) return toast.error("Invalid amount");

    setIsSaving(true);
    try {
      const memberRef = doc(db, `teams/${team.id}/members`, member.id);
      const logRef = doc(collection(db, `teams/${team.id}/payments`));

      let updatedBilling = null;

      await runTransaction(db, async (transaction) => {
        const memberDoc = await transaction.get(memberRef);
        if (!memberDoc.exists()) throw "Member does not exist!";

        const data = memberDoc.data();
        let periods = data.billing?.periods || [];

        // Initialize periods if empty
        if (!periods.length) {
          const cycle = team?.billingConfig?.billingCycle;
          const baseAmount = team?.billingConfig?.baseAmount || 0;
          if (cycle === "term") {
            const count = team?.billingConfig?.termDetails?.divisionsPerYear || 3;
            periods = Array.from({ length: count }, (_, i) => {
              const amt = i === count - 1 
                ? baseAmount - Math.floor(baseAmount / count) * (count - 1) 
                : Math.floor(baseAmount / count);
              return { label: `Term ${i + 1}`, amount: amt, paid: 0, balance: amt, status: "pending" };
            });
          }
        }

        // Apply payment logic
        let remaining = numAmount;
        const updatedPeriods = periods.map((p) => {
          if (remaining <= 0) return p;
          const currentBalance = p.balance ?? p.amount ?? 0;
          const pay = Math.min(currentBalance, remaining);
          remaining -= pay;
          const newBalance = currentBalance - pay;
          return {
            ...p,
            paid: (p.paid || 0) + pay,
            balance: newBalance,
            status: newBalance === 0 ? "paid" : "partial",
            paidDate: Timestamp.now(),
          };
        });

        updatedBilling = {
          periods: updatedPeriods,
          totalPaid: (data.billing?.totalPaid || 0) + numAmount,
          totalPending: Math.max((data.billing?.totalPending || team?.billingConfig?.baseAmount || 0) - numAmount, 0),
          lastPaymentDate: Timestamp.now(),
        };

        transaction.update(memberRef, { billing: updatedBilling });
        transaction.set(logRef, {
          memberId: member.id,
          memberName: `${member.firstName} ${member.lastName}`,
          amount: numAmount,
          method,
          createdAt: Timestamp.now(),
          period: getStatusDetail(member),
        });
      });

      onSuccess(member.id, updatedBilling);
      toast.success("Payment Recorded Successfully");
      setAmount("");
      onOpenChange(false);
    } catch (e) {
      console.error(e);
      toast.error("Transaction failed");
    } finally {
      setIsSaving(false);
    }
  };

  if (!member || !team) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Payment: {member.firstName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="text-sm font-medium">Pending: ₹{member.billing?.totalPending ?? team?.billingConfig?.baseAmount}</div>
          <Input type="number" placeholder="Enter Amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <Select value={method} onValueChange={setMethod}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Cash">Cash</SelectItem>
              <SelectItem value="UPI">UPI</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSaving}>Confirm</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RecordPaymentModal;