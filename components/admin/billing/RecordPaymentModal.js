"use client";

import React, { useState } from "react";
import { doc, collection, runTransaction, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const RecordPaymentModal = ({ isOpen, onOpenChange, member, team }) => {
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

      await runTransaction(db, async (transaction) => {
        const memberDoc = await transaction.get(memberRef);
        if (!memberDoc.exists()) throw "Member does not exist!";

        const data = memberDoc.data();
        let periods = data.billing?.periods || [];

        // Initialize periods if empty
        if (!periods.length) {
          const config = team?.billingConfig;
          const cycle = config?.billingCycle;
          const baseAmount = config?.baseAmount || 0;

          if (cycle === "term") {
            const count = config?.termDetails?.divisionsPerYear || 3;
            periods = Array.from({ length: count }, (_, i) => {
              const amt = i === count - 1
                ? baseAmount - Math.floor(baseAmount / count) * (count - 1)
                : Math.floor(baseAmount / count);
              return {
                key: `term_${i + 1}`,
                label: `Term ${i + 1}`,
                amount: amt,
                paid: 0,
                balance: amt,
                status: "pending",
              };
            });
          } else {
            const labelMap = { monthly: "Monthly", daily: "Daily", annual: "Annual" };
            periods = [{
              key: cycle || "standard",
              label: labelMap[cycle] || "Standard",
              amount: baseAmount,
              paid: 0,
              balance: baseAmount,
              status: "pending",
            }];
          }
        }

        // Apply payment logic (Waterfall)
        let remaining = numAmount;
        const updatedPeriods = periods.map((p) => {
          if (remaining <= 0) return p;
          const currentBalance = p.balance ?? p.amount ?? 0;
          if (currentBalance <= 0) return p;

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

        const totalPaid = (data.billing?.totalPaid || 0) + numAmount;

        // ✅ PERFORM THE UPDATE INSIDE TRANSACTION
        transaction.update(memberRef, {
          "billing.periods": updatedPeriods,
          "billing.totalPaid": totalPaid,
          "billing.lastPaymentDate": Timestamp.now(),
        });

        transaction.set(logRef, {
          memberId: member.id,
          memberName: `${member.firstName} ${member.lastName}`,
          amount: numAmount,
          method,
          createdAt: Timestamp.now(),
        });
      });

      toast.success("Payment Recorded");
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

  // Updated calculation logic
const getRemaining = () => {
  const periods = member.billing?.periods;
  
  // 1. If we have active billing periods, sum their balances
  if (Array.isArray(periods) && periods.length > 0) {
    return periods.reduce((sum, p) => sum + (p.balance || 0), 0);
  }

  // 2. If no billing periods exist yet, return the total base amount
  return team?.billingConfig?.baseAmount || 0;
};

const remainingAmount = getRemaining();

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Record Payment: {member.firstName}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex justify-between text-sm">
            <span className="font-semibold text-destructive">
              Remaining: ₹{remainingAmount.toLocaleString()}
            </span>
          </div>
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