"use client";

import { SectionCards } from "@/components/admin/section-cards";
import TeamCardLayout from "@/components/admin/team-card";
import AddTeamModal from "@/components/admin/addTeamModal";
import { Button } from "@/components/ui/button";
import { Plus, Users } from "lucide-react";
import { useEffect, useState } from "react";
import {  useTeams }  from '../context/TeamsContext'
import {
  Card,
  CardContent,
  CardTitle,
} from "@/components/ui/card";
import { resetAttendanceSummaryIfNeeded } from "@/lib/resetAttendanceSummaryIfNeeded";
import { Toaster } from "sonner";
import { Spinner } from "@/components/ui/spinner";



export default function DashboardPage() {


  const { addTeam, sendDeleteOtp, deleteTeamWithOtp, loading, teams } = useTeams()

  const [modalOpen, setModalOpen] = useState(false);
  const [summaryReady, setSummaryReady] = useState(false);

  useEffect(() => {
    document.title = "Dashboard | Kingz Digital Attendance";
  }, []);

      useEffect(() => {
      if (!teams) return;

      const runReset = async () => {
        if (teams.length > 0) {
          for (const team of teams) {
            await resetAttendanceSummaryIfNeeded(team.id);
          }
        }
        setSummaryReady(true);
      };

      runReset();
    }, [teams]);



    if (!summaryReady) {
      return (
        <div className="flex min-h-[60vh] items-center justify-center">
          <Spinner className="size-8" />
        </div>
      );
    }


  return (
    <>
      <Toaster richColors position="top-center" />
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <SectionCards teams={teams}/>
      </div>

      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <h2 className="px-6">Your Teams</h2>

        {teams.length === 0 && !loading ? (
          <Card className="mx-6 py-0 lg:py-2 ">
            <CardContent className="flex flex-col items-center justify-center p-12 text-center">
              <div className="w-16 h-16 gradient-hero rounded-full flex items-center justify-center mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Users className="h-6 w-6" />
                </div>
              </div>

              <CardTitle className="text-lg font-medium mb-2">
                No teams yet
              </CardTitle>

              <p className="text-muted-foreground mb-6 max-w-sm">
                Create your first team to start tracking attendance
              </p>

              <Button onClick={() => setModalOpen(true)}>
                <Plus  />
                Add Team
              </Button>

              <AddTeamModal
                open={modalOpen}
                onOpenChange={setModalOpen}
                addTeam={addTeam}
              />
            </CardContent>
          </Card>
        ) : (
          <TeamCardLayout teams={teams} sendDeleteOtp={sendDeleteOtp} deleteTeamWithOtp={deleteTeamWithOtp}/>
)}

      </div>
    </>
  );
}
