"use client";

import { Users, Trash2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { useRouter } from "next/navigation";

import { getDateKey } from "@/lib/DateKey"; // helper to format date keys

const TeamCardLayout = ({ teams, deleteTeam }) => {
  const router = useRouter();

  const todayKey = getDateKey(new Date());

  const handleDelete = async (e, teamId) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this team?")) return;
    await deleteTeam(teamId);
  };

  if (!teams || teams.length === 0) return null;

  const sortedTeams = [...teams].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4 px-4 lg:px-6">
      {sortedTeams.map((team) => {
        const members = team.members || [];
        const attendanceToday = team.attendance?.[todayKey] || {};

        let presentCount = 0;
        let absentCount = 0;

        members.forEach((member) => {
          const record = attendanceToday[member.id];
          if (!record) return;
          if (record.status === "present") presentCount++;
          if (record.status === "absent") absentCount++;
        });

        return (
          <Card
            key={team.id}
            className="group bg-card shadow-xs hover:shadow-md transition-all duration-300"
          >
            <CardHeader className="relative">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:bg-destructive/10"
                  onClick={(e) => handleDelete(e, team.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              <CardTitle className="text-lg font-semibold">{team.name}</CardTitle>
              <CardDescription className="text-sm">{team.description}</CardDescription>
            </CardHeader>

            <div className="px-6 pb-4 flex gap-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-success" />
                <span className="text-sm text-muted-foreground">{presentCount} Present</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-destructive" />
                <span className="text-sm text-muted-foreground">{absentCount} Absent</span>
              </div>
            </div>

            <CardFooter className="flex items-center justify-between border-t">
              <span className="text-sm text-muted-foreground">{members.length} members</span>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push(`/dashboard/teams/${team.id}`)}
              >
                View Team
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
};

export default TeamCardLayout;
