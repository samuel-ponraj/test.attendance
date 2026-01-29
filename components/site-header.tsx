'use client'

import { usePathname } from "next/navigation"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { ModeToggle } from "./modeToggle"
import { Button } from "./ui/button"
import { Plus } from "lucide-react"
import { useTeams } from "@/app/context/TeamsContext"
import { useState } from "react"
import AddTeamModal from "./dashboard/addTeamModal"


const ROUTE_TITLES = [
  {
    path: "/dashboard/teams",
    title: "Teams",
    description: "Manage your teams and members",
  },
  {
    path: "/dashboard/analytics",
    title: "Analytics",
    description: "Team-wise attendance insights",
  },
  {
    path: "/dashboard/history",
    title: "Attendance History",
    description: "View detailed attendance records",
  },
  {
    path: "/dashboard/account",
    title: "My Account",
    description: "Manage your account and preferences",
  },
  {
    path: "/dashboard",
    title: "Dashboard",
    description: "Manage teams and track attendance",
  }
] as const

const DEFAULT_ROUTE = {
  path: "/dashboard",
  title: "Dashboard",
  description: "Manage teams and track attendance",
}

export function SiteHeader() {
  const pathname = usePathname()

  const { addTeam } = useTeams();
  const [modalOpen, setModalOpen] = useState(false);

  const normalizedPath = pathname?.replace(/\/$/, "");

  const currentRoute =
    ROUTE_TITLES.find(
      (route) =>
        normalizedPath === route.path ||
        normalizedPath.startsWith(route.path + "/")
    ) ?? DEFAULT_ROUTE

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 py-3 lg:gap-2 lg:px-6 lg:py-4">
        <SidebarTrigger className="-ml-1" />

        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />

        <div className="flex flex-col leading-tight">
          <h1 className="text-base font-medium">
            {currentRoute.title}
          </h1>
          <p className="text-xs text-muted-foreground">
            {currentRoute.description}
          </p>
        </div>

        <div className="ml-auto flex items-center gap-4">
          <Button onClick={() => setModalOpen(true)}><Plus />Add Team</Button>
          <ModeToggle />

          <AddTeamModal open={modalOpen} onOpenChange={setModalOpen} addTeam={addTeam} />
        </div>
      </div>
    </header>
  )
}
