"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, updateDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

import FixedBillingSettings from "./billingTab/BillingSettings";
import { toast } from "sonner";

const BillingTab = ({ teamId }) => {
  const [loading, setLoading] = useState(false);
  const [enableBilling, setEnableBilling] = useState(false);
  const [billingType, setBillingType] = useState("");
  const [billingStartDate, setBillingStartDate] = useState("");
  const [teamData, setTeamData] = useState(null);

  const [fixedConfig, setFixedConfig] = useState({
    amountPerMember: "",
    billingCycle: "monthly",
    divisionsPerYear: "1",
    dueDayOfMonth: 5,
    dueDaysAfterStart: 30,
    dueEveryNDays: 1,
    graceDays: 3,
    lateFeePerDay: 10,
    academicYears: [],
  });

  useEffect(() => {
    const fetchTeam = async () => {
      if (!teamId) return;

      const ref = doc(db, "teams", teamId);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        const data = snap.data();
        const config = data.billingConfig || {};
        const due = config.dueConfig || {};

        setTeamData(data);
        setEnableBilling(data.enableBilling ?? false);
        setBillingType(config.billingType || "");

        setFixedConfig({
          amountPerMember: config.baseAmount ?? "",
          billingCycle: config.billingCycle || "monthly",
          divisionsPerYear: config.termDetails?.divisionsPerYear ?? "1",
          dueDayOfMonth: due.dueDayOfMonth ?? 5,
          dueDaysAfterStart: due.dueDaysAfterStart ?? 30,
          dueEveryNDays: due.dueEveryNDays ?? 1,
          graceDays: due.graceDays ?? 3,
          lateFeePerDay: due.lateFeePerDay ?? 10,
          academicYears: config.academicYears || [],
        });

        if (config.billingStartDate) {
          setBillingStartDate(
            config.billingStartDate.toDate().toISOString().split("T")[0],
          );
        } else {
          setBillingStartDate(new Date().toISOString().split("T")[0]);
        }
      }
    };

    fetchTeam();
  }, [teamId]);

  const updateEnableBilling = async (value) => {
    if (!teamId) return;

    const ref = doc(db, "teams", teamId);

    setEnableBilling(value);
    await updateDoc(ref, {
      enableBilling: value,
    });
  };

  const updateBillingSettings = async () => {
    if (!teamId) return;

    if (!billingType) {
      alert("Please select billing type.");
      return;
    }

    setLoading(true);

    try {
      const ref = doc(db, "teams", teamId);

      const startDate = new Date(billingStartDate);
      const endDate = new Date(startDate);
      endDate.setFullYear(endDate.getFullYear() + 1);

      const billingConfig = {
        billingType,
        baseAmount: Number(fixedConfig.amountPerMember) || 0,
        billingCycle: fixedConfig.billingCycle,
        currency: "INR",

        billingStartDate: Timestamp.fromDate(startDate),
        billingEndDate: Timestamp.fromDate(endDate),

        nextInvoiceDate: Timestamp.now(),

        dueConfig: {
          dueDayOfMonth: Number(fixedConfig.dueDayOfMonth) || 5,
          dueDaysAfterStart: Number(fixedConfig.dueDaysAfterStart) || 30,
          dueEveryNDays: Number(fixedConfig.dueEveryNDays) || 1,
          graceDays: Number(fixedConfig.graceDays) || 0,
          lateFeePerDay: Number(fixedConfig.lateFeePerDay) || 0,
        },

        autoGeneratePeriods: true,

        academicYears:
          fixedConfig.billingCycle === "term"
            ? fixedConfig.academicYears || []
            : [],

        termDetails:
          fixedConfig.billingCycle === "term"
            ? {
                currentTermName: "Active Term",
                divisionsPerYear: Number(fixedConfig.divisionsPerYear) || 1,
                currentTermIndex: 0,
              }
            : null,
      };

      await updateDoc(ref, {
        billingConfig,
      });

      setBillingType(billingConfig.billingType);
      toast.success("Billing settings updated successfully!");
    } catch (err) {
      console.error("Error saving billing settings:", err);
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
            Configure fixed or attendance-based billing for this team.
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

      {!enableBilling && (
        <div className="rounded-lg border bg-muted/30 p-6 text-center text-muted-foreground">
          Billing is disabled for this team.
        </div>
      )}

      {enableBilling && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Billing Settings</CardTitle>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button disabled={loading || !billingType}>
                  {loading ? "Saving..." : "Save Changes"}
                </Button>
              </AlertDialogTrigger>

              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirm Billing Settings</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will update the billing configuration for this team.
                  </AlertDialogDescription>
                </AlertDialogHeader>

                <AlertDialogFooter>
                  <AlertDialogCancel disabled={loading}>
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={updateBillingSettings}
                    disabled={loading}
                  >
                    Confirm
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                <Label>Billing Type</Label>

                <Select value={billingType} onValueChange={setBillingType}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select billing type" />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="fixed">Fixed</SelectItem>
                    <SelectItem value="attendanceBased">
                      Attendance Based
                    </SelectItem>
                    <SelectItem value="salary">Salary</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Billing Start Date</Label>

                <Input
                  type="date"
                  value={billingStartDate}
                  onChange={(e) => setBillingStartDate(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>

            {billingType === "fixed" || billingType === "attendanceBased" ? (
              <FixedBillingSettings
                config={fixedConfig}
                setConfig={setFixedConfig}
                totalMembers={teamData?.totalMembers ?? 0}
                billingType={billingType}
                billingTypes={[
                  { value: "fixed", label: "Fixed Billing" },
                  {
                    value: "attendanceBased",
                    label: "Attendance Based Billing",
                  },
                ]}
                selectedBillingType={
                  billingType === "fixed"
                    ? { value: "fixed", label: "Fixed Billing" }
                    : {
                        value: "attendanceBased",
                        label: "Attendance Based Billing",
                      }
                }
                isBillingTypeLocked={false}
                setBillingType={setBillingType}
                billingStartDate={billingStartDate}
                setBillingStartDate={setBillingStartDate}
                billingModes={[
                  { value: "daily", label: "Daily" },
                  { value: "monthly", label: "Monthly" },
                  { value: "annual", label: "Annual" },
                  { value: "term", label: "Term" },
                ]}
              />
            ) : billingType === "salary" ? (
              <div className="rounded-xl border bg-muted/30 p-6 text-center text-sm font-medium text-muted-foreground">
                Salary managed in member profile.
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BillingTab;
