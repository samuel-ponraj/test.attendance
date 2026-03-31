'use client'
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Clock, Coffee, Timer, Shield, Save, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { db } from "@/lib/firebase"; 
import { doc, updateDoc, onSnapshot } from "firebase/firestore";
import { useParams, useRouter } from "next/navigation";

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
  const [loading, setLoading] = useState(false);
  const router = useRouter()

  if (!schedule) {
  return <div className="p-4">Loading schedule...</div>;
}

useEffect(() => {
  if (!teamId) return;

  const teamRef = doc(db, "teams", teamId);

  const unsubscribe = onSnapshot(teamRef, (snap) => {
    if (snap.exists()) {
      const data = snap.data().schedule;

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

      const { totalHrs, ...cleanSchedule } = schedule;

      const updatedSchedule = {
        ...cleanSchedule,
       totalShiftHours: totalShiftHours, 
      };

      const teamRef = doc(db, "teams", teamId);

      // 3. Update Firestore
      await updateDoc(teamRef, {
        schedule: updatedSchedule,
      });

      setSchedule(updatedSchedule);
      console.log("Schedule before save:", schedule);
      toast.success("Schedule synced!", {
        description: `Team settings updated. Net shift: ${totalShiftHours}h`,
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
    <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
            <h2 className="text-lg font-semibold">
              Schedule
            </h2>

<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Summary & Save */}

      
<Card className="border-primary/20 bg-primary/5 flex  justify-center ">
  <CardHeader >
    <CardTitle className="text-base text-center font-bold">Quick summary of the configured schedule</CardTitle>
  </CardHeader>

  <CardContent className="pt-0 pb-0 flex flex-col items-center justify-center">
  <div className="flex flex-wrap gap-2 mb-6">
    <Badge variant="outline">
      {schedule.workingDays.length} work days
    </Badge>

    <Badge variant="outline">
      {schedule.shiftStartTime} - {schedule.shiftEndTime}
    </Badge>

    <Badge variant="outline">
      {shiftHours.toFixed(1)}h net/day
    </Badge>

    <Badge variant="outline">
      {schedule.breakDurationMinutes}min break
    </Badge>
  </div>

  <Button onClick={handleSave} className="" disabled={loading}>
    <Save className="w-4 h-4" />
    {loading ? "Saving..." : "Save Schedule"}
  </Button>
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
              start won't be flagged as late.
            </span>
          </div>
        </CardContent>
      </Card>

      </div>
    </div>
  );
};

export default Schedule;