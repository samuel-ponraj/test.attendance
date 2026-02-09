'use client'
import TeamCardLayout from "@/components/dashboard/team-card"
import { useEffect, useState } from "react";
import {  useTeams }  from '../../context/TeamsContext'
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import AddTeamModal from "@/components/dashboard/addTeamModal";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Plus } from "lucide-react";

export default function Page() {

  const { teams, addTeam, deleteTeam, loading } = useTeams();
  const [modalOpen, setModalOpen] = useState(false);
  return (
    
     <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        {teams.length === 0 && !loading ? (
          <Card className="mx-6 py-0 lg:py-2">
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
          <TeamCardLayout teams={teams} deleteTeam={deleteTeam} />
        )}
      </div>
  )
}
