"use client";

import React, { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Copy, Send, Share2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

const InvoiceForm = ({ teamId, memberId, period }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const periodId = searchParams.get("periodId");

  const [member, setMember] = useState(null);
  const [team, setTeam] = useState(null);
  const [billingPeriod, setBillingPeriod] = useState(null);

  const [amount, setAmount] = useState(0);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [paymentMode, setPaymentMode] = useState("cash");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [useOtherNumber, setUseOtherNumber] = useState(false);
  const [saving, setSaving] = useState(false);

  const discountAmount =
    (Number(amount || 0) * Number(discountPercent || 0)) / 100;
  const totalAmount = Math.max(Number(amount || 0) - discountAmount, 0);
  const periodLabel = billingPeriod?.periodLabel || period || "";
  const memberName =
    `${member?.firstName || ""} ${member?.lastName || ""}`.trim();
  const normalizedContact = (member?.contact || "").replace(/\D/g, "");
  const razorpayLink = `https://rzp.io/i/kda-${teamId}-${memberId}-${periodId || "invoice"}?amount=${Math.round(totalAmount * 100)}`;
  const whatsappMessage = `Hello ${memberName || "Customer"},

Please pay Rs. ${totalAmount.toFixed(2)} for ${periodLabel || "your invoice"} using this payment link:
Link: ${razorpayLink}

Thank you,
Kingz Digital Solutions`;

  useEffect(() => {
    const fetchData = async () => {
      if (!teamId || !memberId) return;

      const teamSnap = await getDoc(doc(db, "teams", teamId));
      const memberSnap = await getDoc(
        doc(db, "teams", teamId, "members", memberId),
      );

      if (teamSnap.exists()) {
        const teamData = teamSnap.data();
        setTeam(teamData);

        const baseAmount = teamData.billingConfig?.baseAmount || 0;
        const divisions =
          teamData.billingConfig?.termDetails?.divisionsPerYear || 3;
        setAmount(Math.floor(baseAmount / divisions));
      }

      if (memberSnap.exists()) {
        const memberData = memberSnap.data();
        setMember(memberData);
        setWhatsappNumber((memberData.contact || "").replace(/\D/g, ""));
      }

      if (periodId) {
        const periodSnap = await getDoc(
          doc(
            db,
            "teams",
            teamId,
            "members",
            memberId,
            "billingPeriods",
            periodId,
          ),
        );

        if (periodSnap.exists()) {
          const periodData = {
            id: periodSnap.id,
            ...periodSnap.data(),
          };
          const effectiveBalance = Math.max(
            Number(periodData.amount || 0) -
              Number(periodData.paid || 0) -
              Number(periodData.discountAmount || 0),
            0,
          );

          setBillingPeriod(periodData);
          setAmount(effectiveBalance);
          setPaymentMode(periodData.paymentMode || "cash");
        }
      }
    };

    fetchData();
  }, [teamId, memberId, periodId]);

  const handleCopyPaymentLink = async () => {
    try {
      await navigator.clipboard.writeText(razorpayLink);
      toast.success("Payment link copied");
    } catch (error) {
      console.error("Copy failed:", error);
      toast.error("Failed to copy payment link");
    }
  };

  const handleSharePaymentLink = async () => {
    
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Payment Link",
          text: whatsappMessage,
          url: razorpayLink,
        });
        return;
      }

      await navigator.clipboard.writeText(whatsappMessage);
      toast.success("Share message copied");
    } catch (error) {
      if (error?.name !== "AbortError") {
        console.error("Share failed:", error);
        toast.error("Failed to share payment link");
      }
    }
  };

  const handleSendWhatsapp = async () => {
    if (!whatsappNumber.trim()) {
      toast.error("Enter a WhatsApp number");
      return;
    }
  
  
    try {
      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: whatsappNumber,
          memberName,
          amount: totalAmount.toFixed(2),
          periodLabel,
          razorpayLink,
        }),
      });

      const data = await res.json();

      console.log("META STATUS:", res.status);
console.log("META RESPONSE:", JSON.stringify(data, null, 2));

      if (!res.ok) {
        console.error("WhatsApp API response:", data);
        throw new Error(
          data.code
            ? `${data.error || "Failed to send WhatsApp message"} (${data.code})`
            : data.error || "Failed to send WhatsApp message",
        );
      }

      toast.success(
        data.status === "accepted"
          ? "WhatsApp request accepted by Meta"
          : "WhatsApp message submitted",
      );
    } catch (error) {
      console.error("WhatsApp send error:", error);
      toast.error(error.message || "Failed to send WhatsApp message");
    }
  };

  const handleSave = async () => {
    if (!member || !teamId || !memberId) return;

    setSaving(true);

    try {
      const payableAmount = Number(totalAmount || 0);

      if (periodId && billingPeriod) {
        const previousPaid = Number(billingPeriod.paid || 0);
        const previousDiscount = Number(billingPeriod.discountAmount || 0);
        const currentDiscount = Number(discountAmount || 0);
        const newDiscount = previousDiscount + currentDiscount;
        const periodAmount = Number(billingPeriod.amount || 0);
        const newPaid = previousPaid + payableAmount;
        const newBalance = Math.max(periodAmount - newPaid - newDiscount, 0);
        const newStatus = newBalance <= 0 ? "settled" : "partial";

        await updateDoc(
          doc(
            db,
            "teams",
            teamId,
            "members",
            memberId,
            "billingPeriods",
            periodId,
          ),
          {
            paid: newPaid,
            balance: newBalance,
            status: newStatus,
            lastPaymentAmount: payableAmount,
            lastPaymentBaseAmount: Number(amount || 0),
            discountPercent: Number(discountPercent || 0),
            discountAmount: newDiscount,
            totalAmount: payableAmount,
            paymentMode,
            lastPaymentDate: Timestamp.now(),
            updatedAt: Timestamp.now(),
          },
        );

        await addDoc(collection(db, "teams", teamId, "payments"), {
          memberId,
          memberName:
            `${member.firstName || ""} ${member.lastName || ""}`.trim(),
          periodId,
          period: periodLabel,
          periodLabel,
          billingCycle: billingPeriod.billingCycle,
          paymentMode,
          amount: payableAmount,
          status: "success",
          createdAt: Timestamp.now(),
        });

        const periodsSnap = await getDocs(
          collection(
            db,
            "teams",
            teamId,
            "members",
            memberId,
            "billingPeriods",
          ),
        );

        const billingSummary = periodsSnap.docs.reduce(
          (summary, docSnap) => {
            const period = docSnap.data();
            const amount = Number(period.amount || 0);
            const paid = Number(period.paid || 0);
            const discount = Number(period.discountAmount || 0);

            return {
              totalBalance:
                summary.totalBalance + Math.max(amount - paid - discount, 0),
              totalDiscount: summary.totalDiscount + discount,
            };
          },
          {
            totalBalance: 0,
            totalDiscount: 0,
          },
        );

        await setDoc(
          doc(db, "teams", teamId, "members", memberId),
          {
            billing: {
              totalPaid: increment(payableAmount),
              totalBalance: billingSummary.totalBalance,
              totalDiscount: billingSummary.totalDiscount,
              lastPaymentDate: Timestamp.now(),
            },
          },
          { merge: true },
        );

        setBillingPeriod({
          ...billingPeriod,
          paid: newPaid,
          balance: newBalance,
          status: newStatus,
          lastPaymentAmount: payableAmount,
          lastPaymentBaseAmount: Number(amount || 0),
          discountPercent: Number(discountPercent || 0),
          discountAmount: newDiscount,
          totalAmount: payableAmount,
          paymentMode,
        });
      }

      await addDoc(
        collection(db, "teams", teamId, "members", memberId, "invoices"),
        {
          periodId: periodId || null,
          periodLabel,
          amount: Number(amount || 0),
          discountPercent: Number(discountPercent || 0),
          discountAmount,
          totalAmount,
          paymentMode,
          memberName:
            `${member.firstName || ""} ${member.lastName || ""}`.trim(),
          createdAt: serverTimestamp(),
        },
      );

      toast.success("Payment saved successfully");
      router.replace(`/admin/teams/${teamId}/billing?memberId=${memberId}`);
    } catch (error) {
      console.error("Error saving payment:", error);
      toast.error("Failed to save payment");
    } finally {
      setSaving(false);
    }
  };

  if (!member || !team) {
    return <div className="text-center py-10">Loading...</div>;
  }

  return (
    <div className="w-full flex flex-col items-center justify-center px-4 pt-4 space-y-2">
      <div className="w-full max-w-[600px] flex justify-start">
        <button
          onClick={() =>
            router.replace(
              `/admin/teams/${teamId}/billing?memberId=${memberId}`,
            )
          }
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
      </div>

      <div className="w-full max-w-[600px] bg-card rounded-2xl shadow p-6 md:p-8 space-y-6">
        <h2 className="text-2xl font-bold text-center">Create Invoice</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Member</label>
            <Input value={`${member.firstName} ${member.lastName}`} disabled />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Period</label>
            <Input value={periodLabel} disabled />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-1 block">
              Amount (Rs.)
            </label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">
              Discount (%)
            </label>
            <Input
              type="number"
              min="0"
              value={discountPercent}
              onChange={(e) =>
                setDiscountPercent(Math.max(Number(e.target.value), 0))
              }
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-sm font-medium mb-1 block">
              Payment Mode
            </label>
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

        {paymentMode === "upi" && (
          <div className="rounded-xl border bg-muted/30 p-4 space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">
                Razorpay Payment Link
              </label>
              <div className="flex gap-2">
                <Input
                  value={razorpayLink}
                  readOnly
                  className="font-mono text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleCopyPaymentLink}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleSharePaymentLink}
                >
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium block">
                Send WhatsApp Message
              </label>

              <div className="flex flex-col gap-2 rounded-lg border bg-background p-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-muted-foreground">
                    Default number:{" "}
                    <span className="font-medium text-foreground">
                      {normalizedContact || "Not available"}
                    </span>
                  </p>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const next = !useOtherNumber;
                      setUseOtherNumber(next);
                      setWhatsappNumber(next ? "" : normalizedContact);
                    }}
                  >
                    {useOtherNumber
                      ? "Use member number"
                      : "Not this number? Use other"}
                  </Button>
                </div>

                <Input
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  placeholder="Enter WhatsApp number"
                />

                <p className="whitespace-pre-line text-xs text-muted-foreground">
                  Message: {whatsappMessage}
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full gap-2"
                onClick={handleSendWhatsapp}
              >
                <Send className="h-4 w-4" />
                Send to Member
              </Button>
            </div>
          </div>
        )}

        <div className="bg-muted/40 rounded-xl p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Base Amount</span>
            <span>Rs. {Number(amount || 0).toFixed(2)}</span>
          </div>

          <div className="flex justify-between text-red-500">
            <span>Discount</span>
            <span>- Rs. {discountAmount.toFixed(2)}</span>
          </div>

          <div className="flex justify-between">
            <span>Payment Mode</span>
            <span className="capitalize">{paymentMode.replace("_", " ")}</span>
          </div>

          <div className="border-t pt-2 flex justify-between font-bold text-lg">
            <span>Total</span>
            <span>Rs. {totalAmount.toFixed(2)}</span>
          </div>
        </div>

        <div className="flex flex-col gap-3 w-full">
          <Button className="w-full" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Payment"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default InvoiceForm;
