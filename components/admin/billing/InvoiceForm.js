"use client";

import React, { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import jsPDF from "jspdf";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

const InvoiceForm = ({ teamId, memberId, period }) => {
  const [member, setMember] = useState(null);
  const [team, setTeam] = useState(null);

  const [amount, setAmount] = useState(0);
  const [taxPercent, setTaxPercent] = useState(0);
  const [discountPercent, setDiscountPercent] = useState(0);

  // Calculations
  const discountAmount = (amount * discountPercent) / 100;
  const taxableAmount = amount - discountAmount;
  const taxAmount = (taxableAmount * taxPercent) / 100;
  const totalAmount = taxableAmount + taxAmount;
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      if (!teamId || !memberId) return;

      const teamSnap = await getDoc(doc(db, "teams", teamId));
      const memberSnap = await getDoc(doc(db, "teams", teamId, "members", memberId));

      if (teamSnap.exists()) {
        const teamData = teamSnap.data();
        setTeam(teamData);

        const baseAmount = teamData.billingConfig?.baseAmount || 0;
        const divisions = teamData.billingConfig?.termDetails?.divisionsPerYear || 3;
        setAmount(Math.floor(baseAmount / divisions));
      }

      if (memberSnap.exists()) {
        setMember(memberSnap.data());
      }
    };

    fetchData();
  }, [teamId, memberId]);

  const handleSave = async () => {
    await addDoc(
      collection(db, "teams", teamId, "members", memberId, "invoices"),
      {
        periodLabel: period,
        amount,
        discountPercent,
        discountAmount,
        taxPercent,
        taxAmount,
        totalAmount,
        memberName: `${member.firstName} ${member.lastName}`,
        createdAt: serverTimestamp(),
      }
    );

    alert("Invoice Saved ✅");
  };

  const handleDownload = () => {
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text("INVOICE", 150, 20);

    doc.setFontSize(12);
    doc.text(`Member: ${member.firstName} ${member.lastName}`, 20, 40);
    doc.text(`Period: ${period}`, 20, 50);

    doc.text(`Amount: ₹${amount}`, 20, 70);
    doc.text(`Discount: ${discountPercent}% (-₹${discountAmount.toFixed(2)})`, 20, 80);
    doc.text(`Tax: ${taxPercent}% (+₹${taxAmount.toFixed(2)})`, 20, 90);

    doc.setFontSize(14);
    doc.text(`Total: ₹${totalAmount.toFixed(2)}`, 20, 110);

    doc.save(`invoice-${member.firstName}.pdf`);
  };

  if (!member || !team) return <div className="text-center py-10">Loading...</div>;

  return (
    <div className="w-full flex flex-col items-center justify-center px-4 space-y-2">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
      <div className="w-full max-w-[1000px] bg-card rounded-2xl shadow p-6 md:p-8 space-y-6">
        {/* Header */}
        <h2 className="text-2xl font-bold text-center">Create Invoice</h2>

        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Member</label>
            <Input value={`${member.firstName} ${member.lastName}`} disabled />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Period</label>
            <Input value={period} disabled />
          </div>
        </div>

        {/* Financial Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Amount (₹)</label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Discount (%)</label>
            <Input
              type="number"
              value={discountPercent}
              onChange={(e) => setDiscountPercent(Number(e.target.value))}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Tax (%)</label>
            <Input
              type="number"
              value={taxPercent}
              onChange={(e) => setTaxPercent(Number(e.target.value))}
            />
          </div>
        </div>

        {/* Summary Card */}
        <div className="bg-muted/40 rounded-xl p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Base Amount</span>
            <span>₹{amount.toFixed(2)}</span>
          </div>

          <div className="flex justify-between text-red-500">
            <span>Discount</span>
            <span>- ₹{discountAmount.toFixed(2)}</span>
          </div>

          <div className="flex justify-between">
            <span>Taxable Amount</span>
            <span>₹{taxableAmount.toFixed(2)}</span>
          </div>

          <div className="flex justify-between text-blue-500">
            <span>Tax</span>
            <span>+ ₹{taxAmount.toFixed(2)}</span>
          </div>

          <div className="border-t pt-2 flex justify-between font-bold text-lg">
            <span>Total</span>
            <span>₹{totalAmount.toFixed(2)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <Button className="w-full sm:w-1/2" onClick={handleSave}>
                Save Invoice
                </Button>

                <Button
                variant="outline"
                className="w-full sm:w-1/2"
                onClick={handleDownload}
                >
                Download PDF
                </Button>
        </div>

      </div>
    </div>
  );
};

export default InvoiceForm;