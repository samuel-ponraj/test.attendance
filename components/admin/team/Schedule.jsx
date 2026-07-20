'use client'
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarDays, Clock, Coffee, Timer, Shield, Save, ArrowLeft, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { db } from "@/lib/firebase"; 
import { doc, updateDoc, onSnapshot } from "firebase/firestore";
import { useRouter } from "next/navigation";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const defaultSchedule = {
  workingDays: [1, 2, 3, 4, 5],
  shiftStartTime: "09:00",
  shiftEndTime: "18:00",
  breakDurationMinutes: 0,
  graceMinutes: 0,
  totalShiftHours: 0,
};


const Schedule = ({slug}) => {

  const teamId = slug;

  const [schedule, setSchedule] = useState(defaultSchedule);
  const [defaultAttendanceMode, setDefaultAttendanceMode] = useState("self");
  const [loading, setLoading] = useState(false);
  const router = useRouter()

useEffect(() => {
  if (!teamId) return;

  const teamRef = doc(db, "teams", teamId);

  const unsubscribe = onSnapshot(teamRef, (snap) => {
    if (snap.exists()) {
      const teamData = snap.data();
      const data = teamData.schedule;
      setDefaultAttendanceMode(teamData.defaultAttendanceMode === "managed" ? "managed" : "self");

      if (data) {
        setSchedule({
          ...defaultSchedule,
          ...data, 
        });
      }
    }
  });

  return () => unsubscribe();
}, [teamId]);


  // --- Helper: Calculate Net Hours ---
  const calculateNetHours = (start, end, breakMin) => {
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);
    
    // Convert to total minutes
    const startTotal = sh * 60 + sm;
    let endTotal = eh * 60 + em;

    // Handle overnight shifts (if end time is earlier than start)
    if (endTotal < startTotal) {
      endTotal += 24 * 60;
    }

    const netMin = endTotal - startTotal - (breakMin || 0);
    const hrs = netMin / 60;
    
    return hrs > 0 ? Number(hrs.toFixed(2)) : 0;
  };

  // Memoized value for UI display
  const shiftHours = useMemo(() => {
    return calculateNetHours(schedule.shiftStartTime, schedule.shiftEndTime, schedule.breakDurationMinutes);
  }, [schedule.shiftStartTime, schedule.shiftEndTime, schedule.breakDurationMinutes]);

  const toggleDay = (day) => {
    setSchedule((prev) => ({
      ...prev,
      workingDays: prev.workingDays.includes(day)
        ? prev.workingDays.filter((d) => d !== day)
        : [...prev.workingDays, day].sort(),
    }));
  };

  const handleSave = async () => {
    if (!teamId) {
      toast.error("Team ID is missing");
      return;
    }

    setLoading(true);
    try {
      const totalShiftHours = calculateNetHours(
        schedule.shiftStartTime,
        schedule.shiftEndTime,
        schedule.breakDurationMinutes
      );

      const updatedSchedule = {
        ...schedule,
       totalShiftHours: totalShiftHours, 
      };

      const teamRef = doc(db, "teams", teamId);

      // 3. Update Firestore
      await updateDoc(teamRef, {
        schedule: updatedSchedule,
        defaultAttendanceMode,
      });

      setSchedule(updatedSchedule);
      console.log("Schedule before save:", schedule);
      toast.success("Team settings saved!", {
        description: `Attendance and schedule settings updated. Net shift: ${totalShiftHours}h`,
      });
    } catch (error) {
      console.error("Error updating schedule:", error);
      toast.error("Failed to save schedule", {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 mb-4">
    <div className="flex items-center justify-between gap-3">
      <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" /> Back
      </button>
      <Button onClick={handleSave} disabled={loading}>
        <Save className="w-4 h-4" />
        {loading ? "Saving..." : "Save Settings"}
      </Button>
    </div>

<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Attendance Method */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-primary" /> Attendance Method
          </CardTitle>
          <CardDescription>Default method for members who do not have an individual override</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {[{ value: "self", title: "Self attendance", text: "Members punch in and out themselves." }, { value: "managed", title: "Managed attendance", text: "An admin or manager marks attendance." }].map((option) => (
            <button key={option.value} type="button" onClick={() => setDefaultAttendanceMode(option.value)}
              className={`rounded-xl border p-4 text-left transition ${defaultAttendanceMode === option.value ? "border-primary bg-primary/10" : "hover:bg-muted/50"}`}>
              <span className="block font-medium">{option.title}</span>
              <span className="mt-1 block text-xs text-muted-foreground">{option.text}</span>
            </button>
          ))}
        </CardContent>
      </Card>

      {/* Working Days */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-primary" />
            Working Days
          </CardTitle>
          <CardDescription>Select which days the team works</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            {DAYS.map((day, i) => (
              <button
                key={day}
                onClick={() => toggleDay(i)}
                className={`w-12 h-12 rounded-xl text-sm font-medium transition-all ${
                  schedule.workingDays.includes(i)
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "bg-muted text-muted-foreground hover:bg-accent"
                }`}
              >
                {day}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            {schedule.workingDays.length} working days ·{" "}
            {7 - schedule.workingDays.length} off days per week
          </p>
        </CardContent>
      </Card>

      {/* Shift Timing */}
      <Card>
        <CardHeader >
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            Shift Timing
          </CardTitle>
          <CardDescription>Define the work hours</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                Start Time
              </Label>
              <Input
                type="time"
                value={schedule.shiftStartTime}
                onChange={(e) =>
                  setSchedule((prev) => ({
                    ...prev,
                    shiftStartTime: e.target.value,
                  }))
                }
                className="text-center font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                End Time
              </Label>
              <Input
                type="time"
                value={schedule.shiftEndTime}
                onChange={(e) =>
                  setSchedule((prev) => ({
                    ...prev,
                    shiftEndTime: e.target.value,
                  }))
                }
                className="text-center font-mono"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <Timer className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Net working hours:{" "}
              <span className="font-semibold text-foreground">
                {shiftHours.toFixed(1)}h
              </span>{" "}
              / day
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Break & Grace */}
      <Card>
        <CardHeader >
          <CardTitle className="text-base flex items-center gap-2">
            <Coffee className="w-4 h-4 text-primary" />
            Break & Grace Period
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                Break (minutes)
              </Label>
              <Input
                type="number"
                min={0}
                value={schedule.breakDurationMinutes}
                onChange={(e) =>
                  setSchedule((prev) => ({
                    ...prev,
                    breakDurationMinutes: Number(e.target.value),
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                Grace Period (min)
              </Label>
              <Input
                type="number"
                min={0}
                value={schedule.graceMinutes}
                onChange={(e) =>
                  setSchedule((prev) => ({
                    ...prev,
                    graceMinutes: Number(e.target.value),
                  }))
                }
              />
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <Shield className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              Members arriving within {schedule.graceMinutes} min after shift
              start won&apos;t be flagged as late.
            </span>
          </div>
        </CardContent>
      </Card>

      </div>
    </div>
  );
};

export default Schedule;
