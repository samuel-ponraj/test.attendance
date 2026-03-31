'use client'

import { usePathname } from "next/navigation"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { ModeToggle } from "./modeToggle"
import { Button } from "./ui/button"
import { Bell, Plus } from "lucide-react"
import { useTeams } from "@/app/context/TeamsContext"
import { useState, useEffect } from "react"
import AddTeamModal from "./admin/addTeamModal"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
} from "@/components/ui/alert-dialog"
import Link from "next/link"
import { UserPlus, Handshake } from "lucide-react"
import { db } from "@/lib/firebase"
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  updateDoc,
  doc, limit
} from "firebase/firestore"
import { useRouter } from "next/navigation"
import Notifications from "@/lib/Notifications"


const ROUTE_CONFIG = {
  admin: [
    {
      path: "/admin/teams",
      title: "Teams",
      description: "Manage your teams and members",
    },
    {
      path: "/admin/analytics",
      title: "Analytics",
      description: "Team-wise attendance insights",
    },
    {
      path: "/admin/invite",
      title: "Invite Members",
      description: "Send email invitations to join your teams",
    },
    {
      path: "/admin/history",
      title: "Attendance History",
      description: "View detailed attendance records",
    },
    {
      path: "/admin/account",
      title: "My Account",
      description: "Manage your account and preferences",
    },
    {
      path: "/admin",
      title: "Dashboard",
      description: "Manage teams and track attendance",
    },
  ],

  member: [
    {
      path: "/member/attendance",
      title: "My Attendance",
      description: "View your attendance history",
    },
    {
      path: "/member/profile",
      title: "Profile",
      description: "Manage your profile",
    },
    {
      path: "/member/account",
      title: "My Account",
      description: "Manage your account settings",
    },
    {
      path: "/member",
      title: "Overview",
      description: "Mark attendance and view your attendance overview",
    },
  ],
}

const DEFAULT_ROUTE = {
  path: "/admin",
  title: "Dashboard",
  description: "Manage teams and track attendance",
}



export function SiteHeader() {
  const pathname = usePathname()
  const normalizedPath = pathname?.replace(/\/$/, "")
  const router = useRouter()

  // ✅ Define role FIRST
  const role = normalizedPath?.startsWith("/admin")
    ? "admin"
    : normalizedPath?.startsWith("/member")
    ? "member"
    : null

  const isAdmin = role === "admin"

  // Now it's safe to use role
  const routes = role ? ROUTE_CONFIG[role] : []

  const currentRoute =
    routes.find(
      (route) =>
        normalizedPath === route.path ||
        normalizedPath?.startsWith(route.path + "/")
    ) ?? DEFAULT_ROUTE


  const { addTeam, hasReachedTeamLimit  } = useTeams();
  const [modalOpen, setModalOpen] = useState(false);
  const [showLimitDialog, setShowLimitDialog] = useState(false);


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
          {isAdmin &&
            (normalizedPath === "/admin" ||
              normalizedPath === "/admin/teams") && (
              <Button
                onClick={() => {
                  if (hasReachedTeamLimit) {
                    setShowLimitDialog(true);
                  } else {
                    setModalOpen(true);
                  }
                }}
              >
                <Plus />
                Add Team
              </Button>
            )}
          
          <Notifications />

          <ModeToggle />

          <AddTeamModal open={modalOpen} onOpenChange={setModalOpen} addTeam={addTeam} />
          <AlertDialog open={showLimitDialog} onOpenChange={setShowLimitDialog}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Team Limit Reached</AlertDialogTitle>
                  <AlertDialogDescription>
                    You have reached the maximum limit of <strong>2 teams</strong> in the free plan.
                    <br /><br />
                    Please contact <Link href='https://kingzdigitalsolutions.in' target="_blank" rel="noopener noreferrer"><strong>Kingz Digital Solutions</strong></Link> to upgrade your plan.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogAction onClick={() => setShowLimitDialog(false)}>
                    OK
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
        </div>
      </div>
    </header>
    
  )
}
