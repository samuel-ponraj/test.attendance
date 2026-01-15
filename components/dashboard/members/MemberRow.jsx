import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Check, X, Trash2 } from "lucide-react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Card,
  CardContent,
} from "@/components/ui/card";

const MemberRow = ({ member, teamId, onMemberRemoved }) => {
  const todayStatus = null; // placeholder, attendance not implemented

  const getInitials = (name) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
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

      // Update UI
      if (onMemberRemoved) onMemberRemoved(member.id);
    } catch (err) {
      console.error("Failed to remove member:", err);
    }
  };

  return (
    <Card>
    <CardContent className="flex items-center justify-between rounded-lg bg-card shadow-card hover:shadow-soft transition-all duration-200 group text-left" >
      <div className="flex items-center gap-4">
        <Avatar className="w-10 h-10">
          <AvatarFallback className="bg-accent text-accent-foreground font-medium">
            {getInitials(member.name)}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium text-foreground">{member.name}</p>
          <p className="text-sm text-muted-foreground">{member.email}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Check className="w-4 h-4 mr-1" />
            Present
          </Button>

          <Button variant="outline" size="sm">
            <X className="w-4 h-4 mr-1" />
            Absent
          </Button>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className=" text-muted-foreground hover:text-destructive"
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
