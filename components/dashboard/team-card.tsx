"use client"

import React from "react"
import { Users, Trash2, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card"

const TeamCardLayout: React.FC = () => {
  const teamName = "Team Alpha"
  const teamDescription = "This is a placeholder description for the team."
  const presentCount = 5
  const absentCount = 2
  const totalMembers = 7

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    alert("Delete action placeholder")
  }

  const handleView = () => {
    alert("Navigate to team placeholder")
  }

  return (
    <div
  className="
    grid
    grid-cols-[repeat(auto-fit,minmax(280px,1fr))]
    gap-4
    px-4
    lg:px-6
    *:data-[slot=card]:bg-card
    *:data-[slot=card]:from-primary/5
    *:data-[slot=card]:to-card
    dark:*:data-[slot=card]:bg-card
    *:data-[slot=card]:shadow-xs
  "
>
    <Card
      data-slot="card"
      className="
        group
        bg-card
        shadow-xs
        hover:shadow-md
        transition-all
        duration-300
      "
    >
      <CardHeader className="relative">
        {/* Icon + Delete */}
        <div className="flex items-start justify-between mb-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-primary" />
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:bg-destructive/10"
            onClick={handleDelete}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>

        <CardTitle className="text-lg font-semibold">
          {teamName}
        </CardTitle>
        <CardDescription className="text-sm">
          {teamDescription}
        </CardDescription>
      </CardHeader>

      {/* Attendance */}
      <div className="px-6 pb-4 flex gap-4">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-success" />
          <span className="text-sm text-muted-foreground">
            {presentCount} Present
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-destructive" />
          <span className="text-sm text-muted-foreground">
            {absentCount} Absent
          </span>
        </div>
      </div>

      <CardFooter className="flex items-center justify-between border-t">
        <span className="text-sm text-muted-foreground">
          {totalMembers} members
        </span>

        <Button variant="ghost" size="sm" onClick={handleView}>
          View Team
          <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </CardFooter>
    </Card>
    </div>
  )
}

export default TeamCardLayout
