import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Check, X, Trash2 } from "lucide-react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Card,
  CardContent,
} from "@/components/ui/card";

// ✅ Utility: DD-MM-YYYY
const getDateKey = (date = new Date()) => {
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const y = date.getFullYear();
  return `${d}-${m}-${y}`;
};

const MemberRow = ({ 
  member,
  teamId,
  attendance = {},
  selectedDate = new Date(),
  onUpdateAttendance,
  onMemberRemoved,
}) => {
  const dateKey = getDateKey(selectedDate);

  // ✅ Read today’s status
  const todayStatus = attendance?.[dateKey]?.[member.id]?.status ?? null;

  const getInitials = (name) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const handleAttendance = async (status) => {
    if (!onUpdateAttendance) return;

    await onUpdateAttendance({
      teamId,
      dateKey,
      member,
      status,
    });
  };

  const handleRemove = async () => {
    if (!confirm(`Remove ${member.name} from the team?`)) return;

    try {
      const teamRef = doc(db, "teams", teamId);
      const teamSnap = await getDoc(teamRef);
      if (!teamSnap.exists()) return;

      const currentMembers = teamSnap.data().members || [];
      const updatedMembers = currentMembers.filter((m) => m.id !== member.id);

      await updateDoc(teamRef, {
        members: updatedMembers,
        total: updatedMembers.length,
      });

      onMemberRemoved?.(member.id);
    } catch (err) {
      console.error("Failed to remove member:", err);
    }
  };

  return (
    <Card>
  {/* 'relative' is needed for the mobile absolute positioning */}
  <CardContent className="relative flex flex-col sm:flex-row items-center justify-between rounded-lg bg-card shadow-card hover:shadow-soft transition-all duration-200 group text-left gap-4">
    
    {/* Avatar and Info */}
    <div className="flex items-center gap-4 w-full sm:w-auto">
      <Avatar className="w-10 h-10 shrink-0">
        <AvatarFallback className="bg-accent text-accent-foreground font-medium">
          {getInitials(member.name)}
        </AvatarFallback>
      </Avatar>

      <div className="flex flex-col gap-1">
        <p className="font-medium text-foreground leading-none">{member.name}</p>
        <p className="text-sm text-muted-foreground">{member.email}</p>
      </div>
    </div>

    {/* Buttons Container */}
    <div className="flex items-center justify-center sm:justify-end gap-2 w-full sm:w-auto">
      <div className="flex gap-2">
        <Button
          variant={todayStatus === "present" ? "default" : "outline"}
          size="sm"
          onClick={() => handleAttendance("present")}
          className={
            todayStatus === "present"
              ? "bg-success text-white hover:bg-success"
              : "hover:bg-success/10 hover:text-success hover:border-success"
          }
        >
          <Check className="w-4 h-4 mr-1" />
          Present
        </Button>

        <Button
          variant={todayStatus === "absent" ? "default" : "outline"}
          size="sm"
          onClick={() => handleAttendance("absent")}
          className={
            todayStatus === "absent"
              ? "bg-destructive text-white hover:bg-destructive"
              : "hover:bg-destructive/10 hover:text-destructive hover:border-destructive"
          }
        >
          <X className="w-4 h-4 mr-1" />
          Absent
        </Button>
      </div>

      {/* Responsive Delete Button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-0 right-2 sm:static text-muted-foreground hover:text-destructive"
        onClick={handleRemove}
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  </CardContent>
</Card>
  );
};

export default MemberRow;
