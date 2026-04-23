"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
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

  const [billingMode, setBillingMode] = useState("");
  const [defaultAmount, setDefaultAmount] = useState("");
  const [termCycle, setTermCycle] = useState("");

  // load team
  useEffect(() => {
    const fetchTeam = async () => {
      if (!teamId) return;

      const ref = doc(db, "teams", teamId);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        const data = snap.data();

        setBillingMode(data.billingMode || "monthly");
        setDefaultAmount(data.defaultAmount ?? 0);
        setTermCycle(data.termCycle ?? "");
        setEnableBilling(data.enableBilling ?? false);
      }
    };

    fetchTeam();
  }, [teamId]);

  const billingModes = [
    { value: "daily", label: "Daily" },
    { value: "monthly", label: "Monthly" },
  ];

  // ✅ ONLY toggle enableBilling
  const updateEnableBilling = async (value) => {
    if (!teamId) return;

    try {
      const ref = doc(db, "teams", teamId);

      setEnableBilling(value); // optimistic UI

      await updateDoc(ref, {
        enableBilling: value,
      });
    } catch (err) {
      console.error(err);
    }
  };

  // ✅ billing config update
  const updateBillingSettings = async () => {
    if (!teamId) return;

    setLoading(true);

    try {
      const ref = doc(db, "teams", teamId);

      await updateDoc(ref, {
        billingMode,
        defaultAmount: Number(defaultAmount) || 0,
        termCycle: billingMode === "term" ? Number(termCycle) : null,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

        <div>
          <h2 className="text-lg font-semibold">Billing Settings</h2>
          <p className="text-sm text-muted-foreground">
            Manage default billing rules for this team.
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

      {/* SHOW ONLY IF ENABLED */}
      {enableBilling && (
        <Card>

          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Team Billing Configuration</CardTitle>

            <Button
              onClick={updateBillingSettings}
              disabled={loading}
            >
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </CardHeader>

          <CardContent className="space-y-6">

            {/* CURRENT VALUES */}
            <div className="grid gap-3 p-3 rounded-lg border bg-muted/40">
              <p className="text-sm font-medium">Current Settings</p>

              <div className="text-sm text-muted-foreground space-y-1">
                <p>Billing Mode: <b>{billingMode}</b></p>
                <p>Amount: <b>₹{defaultAmount}</b></p>
                {billingMode === "term" && (
                  <p>Term Cycle: <b>{termCycle} terms</b></p>
                )}
              </div>
            </div>

            {/* EDIT MODE */}
            <div className="grid grid-cols-2 gap-4">

            <div className="space-y-2 w-full">
              <Label>Billing Mode</Label>
              <Select value={billingMode} onValueChange={setBillingMode}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select billing mode" />
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
              <Label>Amount</Label>
              <Input
                type="number"
                min={0}
                value={defaultAmount}
                onChange={(e) => setDefaultAmount(e.target.value)}
                placeholder="Enter amount"
                className="w-full"
              />
            </div>

          </div>

          </CardContent>
        </Card>
      )}

      {/* DISABLED STATE */}
      {!enableBilling && (
        <div className="p-6 text-center text-muted-foreground border rounded-lg bg-muted/30">
          Billing is disabled for this team
        </div>
      )}

    </div>
  );
};

export default BillingTab;