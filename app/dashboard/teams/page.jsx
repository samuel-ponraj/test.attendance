'use client'
import TeamCardLayout from "@/components/dashboard/team-card"
import { useState } from "react";
import {  useTeams }  from '../../context/TeamsContext'
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import AddTeamModal from "@/components/dashboard/addTeamModal";

export default function Page() {

  const { teams, addTeam, deleteTeam, loading } = useTeams();
  const [modalOpen, setModalOpen] = useState(false);
  return (
    
     <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">

        {teams.length === 0 && !loading ? (
          <div className="bg-card rounded-xl p-12 text-center shadow-card mx-6">
            <div className="w-16 h-16 gradient-hero rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-primary-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">No teams yet</h3>
            <p className="text-muted-foreground mb-6">Create your first team to start tracking attendance</p>
            <Button onClick={() => setModalOpen(true)}>Add Team</Button>

            <AddTeamModal open={modalOpen} onOpenChange={setModalOpen} addTeam={addTeam} />
          </div>
        ) : (
          <TeamCardLayout teams={teams} deleteTeam={deleteTeam} />
        )}
      </div>
  )
}
