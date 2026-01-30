"use client";

import { useState } from "react";
import { Users, Trash2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const TeamCardLayout = ({ teams, deleteTeam }) => {
  const router = useRouter();

  const [deleteTeamId, setDeleteTeamId] = useState(null);
  const [loading, setLoading] = useState(false);

  if (!teams || teams.length === 0) return null;

  const sortedTeams = [...teams].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );

  const handleConfirmDelete = async () => {
    if (!deleteTeamId) return;

    try {
      setLoading(true);
      await deleteTeam(deleteTeamId);

      toast.success("Team deleted successfully", {
        description: "The team and its data were removed",
      });
    } catch (err) {
      toast.error("Failed to delete team");
    } finally {
      setLoading(false);
      setDeleteTeamId(null);
    }
  };

  return (
    <>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4 px-4 lg:px-6">
        {sortedTeams.map((team) => {
          const totalPresent = team.attendanceSummary?.present || 0;
          const totalAbsent = team.attendanceSummary?.absent || 0;

          return (
            <Card
              key={team.id}
              className="group bg-card shadow-xs hover:shadow-md transition-all duration-300 "
            >
              <CardHeader className="relative">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Users className="w-5 h-5 text-primary" />
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTeamId(team.id);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                <CardTitle className="text-lg font-semibold">
                  {team.name}
                </CardTitle>
                <CardDescription className="text-sm">
                  {team.description}
                </CardDescription>
              </CardHeader>

              <div className="px-6 pb-2 flex gap-4">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-success" />
                  <span className="text-sm text-muted-foreground">
                    {totalPresent} Present
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-destructive" />
                  <span className="text-sm text-muted-foreground">
                    {totalAbsent} Absent
                  </span>
                </div>
              </div>

              <CardFooter className="flex items-center justify-between border-t">
                <span className="text-sm text-muted-foreground">
                  {team.totalMembers} members
                </span>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    router.push(`/dashboard/teams/${team.id}`)
                  }
                >
                  View Team
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog
        open={!!deleteTeamId}
        onOpenChange={() => setDeleteTeamId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete this team?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. All members and attendance
              records for this team will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={loading}
            >
              {loading ? "Deleting..." : "Delete Team"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default TeamCardLayout;
