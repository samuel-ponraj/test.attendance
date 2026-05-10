import React, { useEffect, useState } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const defaultSalaryConfig = {
  joiningDate: "",
  salaryType: "",
  dailyRate: 0,
  monthlySalary: 0,
  annualCTC: 0,
  pf: 0,
  esi: 0,
  specialAllowance: 0,
  bonus: 0,
};

const SalaryCard = ({ teamId, memberId }) => {
  const [salaryConfig, setSalaryConfig] = useState(defaultSalaryConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchSalaryConfig = async () => {
      if (!teamId || !memberId) {
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const memberRef = doc(db, "teams", teamId, "members", memberId);
        const snap = await getDoc(memberRef);

        if (snap.exists()) {
          const data = snap.data();

          setSalaryConfig({
            ...defaultSalaryConfig,
            ...(data.salaryConfig || {}),
          });
        }
      } catch (error) {
        console.error("Error loading salary config:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSalaryConfig();
  }, [teamId, memberId]);

  const updateField = (key, value) => {
    setSalaryConfig((prev) => {
      const numericValue = Number(value) || 0;

      const updated = {
        ...prev,
        [key]: value,
      };

      // Monthly → Annual
      if (key === "monthlySalary") {
        updated.annualCTC = numericValue * 12;
      }

      // Annual → Monthly
      if (key === "annualCTC") {
        updated.monthlySalary = Math.round(numericValue / 12);
      }

      return updated;
    });
  };

  const saveSalaryConfig = async () => {
    if (!teamId || !memberId) return;

    setSaving(true);

    try {
      const memberRef = doc(db, "teams", teamId, "members", memberId);

      const finalConfig = {
        joiningDate: salaryConfig.joiningDate || "",
        salaryType: salaryConfig.salaryType || "",
        dailyRate: Number(salaryConfig.dailyRate) || 0,
        monthlySalary: Number(salaryConfig.monthlySalary) || 0,
        annualCTC: Number(salaryConfig.annualCTC) || 0,
        pf: Number(salaryConfig.pf) || 0,
        esi: Number(salaryConfig.esi) || 0,
        specialAllowance: Number(salaryConfig.specialAllowance) || 0,
        bonus: Number(salaryConfig.bonus) || 0,
        updatedAt: new Date(),
      };

      await updateDoc(memberRef, {
        salaryConfig: finalConfig,
      });

      setSalaryConfig(finalConfig);
    } catch (error) {
      console.error("Error saving salary config:", error);
    } finally {
      setSaving(false);
    }
  };

  const salaryType = salaryConfig.salaryType || "";

  if (loading) {
    return (
      <Card className="rounded-2xl border shadow-sm">
        <CardContent className="flex items-center justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl border shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between px-3 lg:px-6">
        <CardTitle className="text-lg">Salary & Attendance Rate</CardTitle>

        <Button
          onClick={saveSalaryConfig}
          disabled={saving || !salaryType}
          className="min-w-[90px]"
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            </>
          ) : (
            "Save"
          )}
        </Button>
      </CardHeader>

      <CardContent className="px-3 lg:px-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <div className="space-y-2">
            <Label>Joining Date</Label>
            <Input
              type="date"
              value={salaryConfig.joiningDate}
              onChange={(e) => updateField("joiningDate", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Salary Type</Label>
            <Select
              value={salaryType}
              onValueChange={(value) =>
                setSalaryConfig((prev) => ({
                  ...prev,
                  salaryType: value,
                  dailyRate: value === "daily" ? prev.dailyRate || 0 : 0,
                  monthlySalary:
                    value === "monthly" ? prev.monthlySalary || 0 : 0,
                }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select salary type" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {salaryType === "daily" && (
            <div className="space-y-2">
              <Label>Daily Amount</Label>
              <Input
                type="number"
                min={0}
                value={salaryConfig.dailyRate}
                onChange={(e) => updateField("dailyRate", e.target.value)}
              />
            </div>
          )}

          {salaryType === "monthly" && (
            <>
              <div className="space-y-2">
                <Label>Monthly Salary</Label>
                <Input
                  type="number"
                  min={0}
                  value={salaryConfig.monthlySalary}
                  onChange={(e) => updateField("monthlySalary", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Annual CTC</Label>
                <Input
                  type="number"
                  min={0}
                  value={salaryConfig.annualCTC ?? 0}
                  onChange={(e) => updateField("annualCTC", e.target.value)}
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label>PF</Label>
            <Input
              type="number"
              min={0}
              value={salaryConfig.pf}
              onChange={(e) => updateField("pf", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>ESI</Label>
            <Input
              type="number"
              min={0}
              value={salaryConfig.esi}
              onChange={(e) => updateField("esi", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Special Allowance</Label>
            <Input
              type="number"
              min={0}
              value={salaryConfig.specialAllowance}
              onChange={(e) => updateField("specialAllowance", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Bonus</Label>
            <Input
              type="number"
              min={0}
              value={salaryConfig.bonus}
              onChange={(e) => updateField("bonus", e.target.value)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SalaryCard;
