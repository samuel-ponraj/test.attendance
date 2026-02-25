import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Check, X, Trash2 } from "lucide-react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import Image from "next/image";
import { cn } from '@/lib/utils';

// ✅ Utility: DD-MM-YYYY
const getDateKey = (date = new Date()) => {
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const y = date.getFullYear();
  return `${y}-${m}-${d}`;
};

const MemberRow = ({ 
  member,
  teamId,
  attendance = {},
  selectedDate = new Date(),
  onUpdateAttendance,
  // onRemove,
}) => {

  const dateKey = getDateKey(selectedDate);
  const memberId = member?.id;

  const todayStatus = memberId
    ? attendance?.[memberId]?.status ?? null
    : null;

  const handleAttendance = async (status) => {
    if (!member || !onUpdateAttendance) return;

    await onUpdateAttendance({
      teamId,
      dateKey,
      member,
      status,
    });
  };


//  const handleRemove = () => {
//   onRemove?.(member.id);
// };

const getInitials = (name) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  return (
    <Card>
  {/* 'relative' is needed for the mobile absolute positioning */}
  <CardContent className="relative flex flex-col sm:flex-row items-center justify-between rounded-lg bg-card shadow-card hover:shadow-soft transition-all duration-200 group text-left gap-4">
    
    {/* Avatar and Info */}
    <div className="flex items-center gap-4 w-full sm:w-auto">
      <Avatar className="w-10 h-10 shrink-0">
        <AvatarFallback className="bg-accent text-accent-foreground font-medium">
        {member.profileImage ? (
          <Image src={member.profileImage} width={80} height={80} alt="Member Profile Image"/>
        ):(
          <>
          {member.firstName || member.lastName 
        ? getInitials(`${member.firstName || ''} ${member.lastName || ''}`)
        : ''}
        </>
        )}
        </AvatarFallback>
      </Avatar>

      <div className="flex flex-col gap-1">
        <p className="font-medium text-foreground leading-none">
          {`${member.firstName || ''} ${member.lastName || ''}`}
        </p>
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
            <Check className="w-4 h-4 " />
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
            <X className="w-4 h-4" />
            Absent
          </Button>

          <Button
            variant={todayStatus === "halfday" ? "default" : "outline"}
            size="sm"
            onClick={() => handleAttendance("halfday")}
            // We use style for the specific hex colors when active
            style={
              todayStatus === "halfday" 
                ? { backgroundColor: '#F59E0B', color: 'white', borderColor: '#F59E0B' } 
                : {}
            }
            className={cn(
              "flex items-center gap-2",
              todayStatus !== "halfday" && "hover:bg-[#F59E0B1A] hover:text-[#F59E0B] hover:border-[#F59E0B]"
            )}
          >
            <X className="w-4 h-4" />
            Halfday
          </Button>
        </div>

      {/* Responsive Delete Button
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-0 right-2 sm:static text-muted-foreground hover:text-destructive"
        onClick={handleRemove}
      >
        <Trash2 className="w-4 h-4" />
      </Button> */}
    </div>
  </CardContent>
</Card>
  );
};

export default MemberRow;
