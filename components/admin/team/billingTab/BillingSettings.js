"use client";

import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const FixedBillingSettings = ({
  config,
  setConfig,
  totalMembers,
  selectedBillingType,
  billingStartDate,
  setBillingStartDate,
  billingModes,
}) => {
  const updateField = (key, value) => {
    setConfig((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const updateAcademicYears = (academicYears) => {
    setConfig((prev) => ({
      ...prev,
      academicYears,
    }));
  };

  const getDefaultAcademicYear = () => {
    const startDate = billingStartDate
      ? new Date(billingStartDate)
      : new Date();

    const startYear = startDate.getFullYear();

    return `${startYear}-${startYear + 1}`;
  };

  const addAcademicYear = () => {
    const academicYears = config.academicYears || [];
    const defaultYear = getDefaultAcademicYear();

    const alreadyExists = academicYears.some(
      (year) => year.academicYear === defaultYear,
    );

    const newAcademicYear = {
      academicYear: alreadyExists
        ? `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`
        : defaultYear,
      startDate: billingStartDate || "",
      endDate: "",
      terms: [
        {
          termNo: 1,
          name: "Term 1",
          startDate: "",
          endDate: "",
          amount: config.amountPerMember || "",
          dueDate: "",
        },
      ],
    };

    updateAcademicYears([...academicYears, newAcademicYear]);
  };

  const removeAcademicYear = (yearIndex) => {
    const academicYears = [...(config.academicYears || [])];
    academicYears.splice(yearIndex, 1);
    updateAcademicYears(academicYears);
  };

  const updateAcademicYearField = (yearIndex, key, value) => {
    const academicYears = [...(config.academicYears || [])];

    academicYears[yearIndex] = {
      ...academicYears[yearIndex],
      [key]: value,
    };

    updateAcademicYears(academicYears);
  };

  const addTerm = (yearIndex) => {
    const academicYears = [...(config.academicYears || [])];
    const terms = academicYears[yearIndex].terms || [];

    const nextTermNo = terms.length + 1;

    academicYears[yearIndex].terms = [
      ...terms,
      {
        termNo: nextTermNo,
        name: `Term ${nextTermNo}`,
        startDate: "",
        endDate: "",
        amount: config.amountPerMember || "",
        dueDate: "",
      },
    ];

    updateAcademicYears(academicYears);
  };

  const removeTerm = (yearIndex, termIndex) => {
    const academicYears = [...(config.academicYears || [])];
    const terms = [...(academicYears[yearIndex].terms || [])];

    terms.splice(termIndex, 1);

    academicYears[yearIndex].terms = terms.map((term, index) => ({
      ...term,
      termNo: index + 1,
      name: term.name || `Term ${index + 1}`,
    }));

    updateAcademicYears(academicYears);
  };

  const updateTermField = (yearIndex, termIndex, key, value) => {
    const academicYears = [...(config.academicYears || [])];

    academicYears[yearIndex].terms[termIndex] = {
      ...academicYears[yearIndex].terms[termIndex],
      [key]: value,
    };

    updateAcademicYears(academicYears);
  };

  const getTermTotal = (terms = []) => {
    return terms.reduce((total, term) => total + Number(term.amount || 0), 0);
  };

  const filteredBillingModes =
    selectedBillingType?.value === "attendanceBased"
      ? billingModes.filter(
          (mode) => mode.value === "daily" || mode.value === "monthly",
        )
      : billingModes;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 p-3 rounded-lg border bg-muted/40">
        <p className="text-sm font-medium">Estimated Billing Snapshot</p>

        <div className="text-sm text-muted-foreground space-y-1">
          <p>
            Total Members: <b>{totalMembers}</b>
          </p>

          <p>
            Billing Type: <b>{selectedBillingType?.label || "Not selected"}</b>
          </p>

          <p>
            Billing Cycle:{" "}
            <b className="capitalize">
              {config.billingCycle || "Not selected"}
            </b>
          </p>

          {config.billingCycle !== "term" && (
            <p>
              Rate: <b>₹{config.amountPerMember || 0} / member</b>
            </p>
          )}

          {config.billingCycle === "term" && (
            <p>
              Term billing will be generated from the academic year and term
              configuration below.
            </p>
          )}

          <div className="pt-2">
            <p className="text-primary font-bold text-base">
              Estimated Charge: ₹
              {totalMembers * Number(config.amountPerMember || 0)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Billing Start Date</Label>

          <Input
            type="date"
            value={billingStartDate}
            onChange={(e) => setBillingStartDate(e.target.value)}
            className="w-full"
          />

          <p className="text-[10px] text-muted-foreground italic">
            Used to auto-generate daily, monthly and annual billing periods.
          </p>
        </div>

        <div className="space-y-2 w-full">
          <Label>Billing Cycle</Label>

          <Select
            value={config.billingCycle}
            onValueChange={(value) => updateField("billingCycle", value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select cycle" />
            </SelectTrigger>

            <SelectContent>
              {filteredBillingModes.map((mode) => (
                <SelectItem key={mode.value} value={mode.value}>
                  {mode.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 w-full">
          <Label>
            {config.billingCycle === "daily"
              ? "Rate Per Day"
              : config.billingCycle === "monthly"
                ? "Rate Per Month"
                : config.billingCycle === "annual"
                  ? "Rate Per Year"
                  : "Default Term Amount"}
          </Label>

          <Input
            type="number"
            min={0}
            value={config.amountPerMember}
            onChange={(e) => updateField("amountPerMember", e.target.value)}
            placeholder="e.g. 500"
            className="w-full"
          />
        </div>

        {config.billingCycle === "monthly" && (
          <div className="space-y-2 w-full">
            <Label>Due Day of Month</Label>

            <Input
              type="number"
              min={1}
              max={31}
              value={config.dueDayOfMonth}
              onChange={(e) => updateField("dueDayOfMonth", e.target.value)}
              placeholder="e.g. 5"
            />
          </div>
        )}

        {config.billingCycle === "daily" && (
          <div className="space-y-2 w-full">
            <Label>Due Every N Days</Label>

            <Input
              type="number"
              min={1}
              value={config.dueEveryNDays}
              onChange={(e) => updateField("dueEveryNDays", e.target.value)}
              placeholder="e.g. 1"
            />
          </div>
        )}

        {config.billingCycle === "annual" && (
          <div className="space-y-2 w-full">
            <Label>Due After Days</Label>

            <Input
              type="number"
              min={1}
              value={config.dueDaysAfterStart}
              onChange={(e) => updateField("dueDaysAfterStart", e.target.value)}
              placeholder="e.g. 10"
            />
          </div>
        )}

        <div className="space-y-2 w-full">
          <Label>Grace Days</Label>

          <Input
            type="number"
            min={0}
            value={config.graceDays}
            onChange={(e) => updateField("graceDays", e.target.value)}
            placeholder="e.g. 5"
          />
        </div>

        <div className="space-y-2 w-full">
          <Label>Late Fee Per Day</Label>

          <Input
            type="number"
            min={0}
            value={config.lateFeePerDay}
            onChange={(e) => updateField("lateFeePerDay", e.target.value)}
            placeholder="e.g. 10"
          />
        </div>
      </div>

      {config.billingCycle === "term" && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base font-semibold">
                Academic Year Term Setup
              </h3>

              <p className="text-xs text-muted-foreground">
                Add academic year only when a new year starts or when term dates
                / fees change.
              </p>
            </div>

            <Button type="button" onClick={addAcademicYear}>
              <Plus className="h-4 w-4" />
              Add Academic Year
            </Button>
          </div>

          {(config.academicYears || []).length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              No academic year added. Click <b>Add Academic Year</b> to create
              term setup.
            </div>
          ) : (
            <div className="space-y-5">
              {config.academicYears.map((year, yearIndex) => (
                <Card key={yearIndex} className="border">
                  <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <CardTitle className="text-base">
                      Academic Year {year.academicYear || yearIndex + 1}
                    </CardTitle>

                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => removeAcademicYear(yearIndex)}
                    >
                      <Trash2 className="h-4 w-4" />
                      Remove Year
                    </Button>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Academic Year</Label>

                        <Input
                          value={year.academicYear}
                          onChange={(e) =>
                            updateAcademicYearField(
                              yearIndex,
                              "academicYear",
                              e.target.value,
                            )
                          }
                          placeholder="2026-2027"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Year Start Date</Label>

                        <Input
                          type="date"
                          value={year.startDate}
                          onChange={(e) =>
                            updateAcademicYearField(
                              yearIndex,
                              "startDate",
                              e.target.value,
                            )
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Year End Date</Label>

                        <Input
                          type="date"
                          value={year.endDate}
                          onChange={(e) =>
                            updateAcademicYearField(
                              yearIndex,
                              "endDate",
                              e.target.value,
                            )
                          }
                        />
                      </div>
                    </div>

                    <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                      Total Term Amount:{" "}
                      <b>₹{getTermTotal(year.terms).toLocaleString("en-IN")}</b>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Terms / Installments</Label>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addTerm(yearIndex)}
                        >
                          <Plus className="h-4 w-4" />
                          Add Term
                        </Button>
                      </div>

                      {(year.terms || []).map((term, termIndex) => (
                        <div
                          key={termIndex}
                          className="grid grid-cols-1 md:grid-cols-6 gap-3 rounded-lg border p-3"
                        >
                          <div className="space-y-2">
                            <Label>Term Name</Label>

                            <Input
                              value={term.name}
                              onChange={(e) =>
                                updateTermField(
                                  yearIndex,
                                  termIndex,
                                  "name",
                                  e.target.value,
                                )
                              }
                              placeholder="Term 1"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Start Date</Label>

                            <Input
                              type="date"
                              value={term.startDate}
                              onChange={(e) =>
                                updateTermField(
                                  yearIndex,
                                  termIndex,
                                  "startDate",
                                  e.target.value,
                                )
                              }
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>End Date</Label>

                            <Input
                              type="date"
                              value={term.endDate}
                              onChange={(e) =>
                                updateTermField(
                                  yearIndex,
                                  termIndex,
                                  "endDate",
                                  e.target.value,
                                )
                              }
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Due Date</Label>

                            <Input
                              type="date"
                              value={term.dueDate}
                              onChange={(e) =>
                                updateTermField(
                                  yearIndex,
                                  termIndex,
                                  "dueDate",
                                  e.target.value,
                                )
                              }
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Amount</Label>

                            <Input
                              type="number"
                              min={0}
                              value={term.amount}
                              onChange={(e) =>
                                updateTermField(
                                  yearIndex,
                                  termIndex,
                                  "amount",
                                  e.target.value,
                                )
                              }
                              placeholder="5000"
                            />
                          </div>

                          <div className="flex items-end">
                            <Button
                              type="button"
                              variant="destructive"
                              className="w-full"
                              onClick={() => removeTerm(yearIndex, termIndex)}
                              disabled={(year.terms || []).length === 1}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FixedBillingSettings;
