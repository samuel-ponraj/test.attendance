"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, updateDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

import { Switch } from "@/components/ui/switch";

const BillingTab = ({ teamId }) => {
  const [loading, setLoading] = useState(false);
  const [enableBilling, setEnableBilling] = useState(false);

  // States
  const [amountPerMember, setAmountPerMember] = useState("");
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [divisionsPerYear, setDivisionsPerYear] = useState("1");
  const [totalMembers, setTotalMembers] = useState(0);
  const [billingStartDate, setBillingStartDate] = useState("");
  const [dueDayOfMonth, setDueDayOfMonth] = useState(5);
  const [dueDaysAfterStart, setDueDaysAfterStart] = useState(30);
  const [dueEveryNDays, setDueEveryNDays] = useState(1);
  const [graceDays, setGraceDays] = useState(3);
  const [lateFeePerDay, setLateFeePerDay] = useState(10);

  useEffect(() => {
    const fetchTeam = async () => {
      if (!teamId) return;

      const ref = doc(db, "teams", teamId);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        const data = snap.data();
        const config = data.billingConfig || {};
        const due = config.dueConfig || {};

        setEnableBilling(data.enableBilling ?? false);
        setTotalMembers(data.totalMembers ?? 0);
        
        setAmountPerMember(config.baseAmount ?? 0);
        setBillingCycle(config.billingCycle || "monthly");
        setDivisionsPerYear(config.termDetails?.divisionsPerYear ?? "1");
        

        setDueDayOfMonth(due.dueDayOfMonth ?? 5);
        setDueDaysAfterStart(due.dueDaysAfterStart ?? 30);
        setDueEveryNDays(due.dueEveryNDays ?? 1);
        setGraceDays(due.graceDays ?? 3);
        setLateFeePerDay(due.lateFeePerDay ?? 10);

        if (config.billingStartDate) {
          const date = config.billingStartDate.toDate();
          setBillingStartDate(date.toISOString().split("T")[0]);
        } else {
          // Default to today if no date exists
          setBillingStartDate(new Date().toISOString().split("T")[0]);
        }
      }
    };

    fetchTeam();
  }, [teamId]);

  const billingModes = [
    { value: "daily", label: "Daily" }, // Added Daily
    { value: "monthly", label: "Monthly" },
    { value: "annual", label: "Annual" },
    { value: "term", label: "Term" },
  ];

  const updateEnableBilling = async (value) => {
    if (!teamId) return;
    try {
      const ref = doc(db, "teams", teamId);
      setEnableBilling(value);
      await updateDoc(ref, { enableBilling: value });
    } catch (err) {
      console.error(err);
    }
  };

  const updateBillingSettings = async () => {
  if (!teamId) return;
  setLoading(true);

  try {
    const ref = doc(db, "teams", teamId);

    const startDate = new Date(billingStartDate);

    // 🔥 Auto calculate end date (1 year cycle)
    const endDate = new Date(startDate);
    endDate.setFullYear(endDate.getFullYear() + 1);

    const billingConfig = {
  baseAmount: Number(amountPerMember) || 0,
  billingCycle: billingCycle,
  currency: "INR",
  billingType: "per-member",

  billingStartDate: Timestamp.fromDate(new Date(billingStartDate)),

  // 🔥 NEW
  billingEndDate: Timestamp.fromDate(
    new Date(new Date(billingStartDate).setFullYear(new Date(billingStartDate).getFullYear() + 1))
  ),

  nextInvoiceDate: Timestamp.now(),

  // 🔥 NEW: Due Config
  dueConfig: {
    dueDayOfMonth: Number(dueDayOfMonth),
    dueDaysAfterStart: Number(dueDaysAfterStart),
    dueEveryNDays: Number(dueEveryNDays),
    graceDays: Number(graceDays),
    lateFeePerDay: Number(lateFeePerDay),
  },

  autoGeneratePeriods: true,

  termDetails: billingCycle === "term"
    ? {
        currentTermName: "Active Term",
        divisionsPerYear: Number(divisionsPerYear) || 1,
        currentTermIndex: 0
      }
    : null
};

    await updateDoc(ref, { billingConfig });

  } catch (err) {
    console.error(err);
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Member Billing</h2>
          <p className="text-sm text-muted-foreground">
            Set the price per member and frequency (Daily, Monthly, Term, Annual).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Enable Billing</span>
          <Switch
            checked={enableBilling}
            onCheckedChange={updateEnableBilling}
          />
        </div>
      </div>

      {enableBilling && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Rates & Frequency</CardTitle>
            <Button onClick={updateBillingSettings} disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </CardHeader>

          <CardContent className="space-y-6">
              {/* PROJECTED REVENUE SNAPSHOT */}
              <div className="grid gap-3 p-3 rounded-lg border bg-muted/40">
                <p className="text-sm font-medium">Estimated Billing Snapshot</p>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>Total Members: <b>{totalMembers}</b></p>
                  <p>Rate: <b>₹{amountPerMember} / member</b></p>
                  
                  {/* TERM SPECIFIC DETAILS */}
                  {billingCycle === "term" && (
                    <div className="pt-1 border-t mt-1 border-gray-700/50">
                      <p>Terms per Year: <b>{divisionsPerYear}</b></p>
                      <p>Est. Term Duration: <b>{Math.round(12 / (Number(divisionsPerYear) || 1))} months</b></p>
                    </div>
                  )}

                  <div className="pt-2">
                    <p className="text-primary font-bold text-base">
                      Total Charge: ₹{totalMembers * Number(amountPerMember)} 
                          <span className="text-xs font-normal ml-1">
                            {billingCycle === 'daily' ? 'per day' : `per ${billingCycle}`}
                          </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* EDIT FIELDS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> 

                <div className="space-y-2">
                  <Label>Billing Start Date</Label>
                  <Input
                    type="date"
                    value={billingStartDate}
                    onChange={(e) => setBillingStartDate(e.target.value)}
                    className="w-full"
                  />
                  <p className="text-[10px] text-muted-foreground italic">The 1-year cycle will end automatically on this date + 365 days.</p>
                </div>
                <div className="space-y-2 w-full">
                  <Label>Billing Cycle</Label>
                  <Select value={billingCycle} onValueChange={setBillingCycle}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select cycle" />
                    </SelectTrigger>
                    <SelectContent>
                      {billingModes.map((mode) => (
                        <SelectItem key={mode.value} value={mode.value}>
                          {mode.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 w-full">
                  <Label>
                    {billingCycle === "term" ? "Rate Per Member (Per Term)" : "Rate Per Member (₹)"}
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    value={amountPerMember}
                    onChange={(e) => setAmountPerMember(e.target.value)}
                    placeholder="e.g. 500"
                    className="w-full"
                  />
                </div>

                {billingCycle === "term" && (
                  <div className="space-y-2 w-full">
                    <Label>How many terms in one year?</Label>
                    <Input
                      type="number"
                      min={1}
                      value={divisionsPerYear}
                      onChange={(e) => setDivisionsPerYear(e.target.value)}
                      placeholder="e.g. 3"
                      className="w-full"
                    />
                  </div>
                )}

                {/* 🔥 Due Settings (Minimal Add) */}

{billingCycle === "monthly" && (
  <div className="space-y-2 w-full">
    <Label>Due Day of Month</Label>
    <Input
      type="number"
      min={1}
      max={31}
      value={dueDayOfMonth}
      onChange={(e) => setDueDayOfMonth(e.target.value)}
    />
  </div>
)}

{(billingCycle === "term" || billingCycle === "annual") && (
  <div className="space-y-2 w-full">
    <Label>Due After (Days)</Label>
    <Input
      type="number"
      min={1}
      value={dueDaysAfterStart}
      onChange={(e) => setDueDaysAfterStart(e.target.value)}
    />
  </div>
)}

{billingCycle === "daily" && (
  <div className="space-y-2 w-full">
    <Label>Due Every N Days</Label>
    <Input
      type="number"
      min={1}
      value={dueEveryNDays}
      onChange={(e) => setDueEveryNDays(e.target.value)}
    />
  </div>
)}

{/* Common */}
<div className="space-y-2 w-full">
  <Label>Grace Days</Label>
  <Input
    type="number"
    min={0}
    value={graceDays}
    onChange={(e) => setGraceDays(e.target.value)}
  />
</div>

<div className="space-y-2 w-full">
  <Label>Late Fee Per Day (₹)</Label>
  <Input
    type="number"
    min={0}
    value={lateFeePerDay}
    onChange={(e) => setLateFeePerDay(e.target.value)}
  />
</div>
              </div>
</CardContent>
        </Card>
      )}

      {!enableBilling && (
        <div className="p-6 text-center text-muted-foreground border rounded-lg bg-muted/30">
          Billing is disabled for this team.
        </div>
      )}
    </div>
  );
};

export default BillingTab;