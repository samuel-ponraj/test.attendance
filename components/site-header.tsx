'use client'

import { usePathname } from "next/navigation"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { ModeToggle } from "./modeToggle"
import { Button } from "./ui/button"
import { Plus } from "lucide-react"
import { useTeams } from "@/app/context/TeamsContext"
import { useEffect, useState } from "react"
import AddTeamModal from "./admin/addTeamModal"
import AddFormModal from "./admin/forms/customForms/AddFormModal"
import Notifications from "@/lib/Notifications"
import { useMembers } from "@/app/context/MembersContext"
import { db } from "@/lib/firebase"
import { collection, doc, getDocs, onSnapshot } from "firebase/firestore"
import UpgradeDialog from "./admin/subscription/UpgradeDialog"


const ROUTE_CONFIG: Record<
  string,
  {
    path: string
    title: string
    description: string
    match?: (pathname: string) => boolean
  }[]
> = {
  admin: [
    {
      path: "/admin/teams/",
      title: "Payments",
      description: "Manage fees and member accounts",
      match: (pathname: string) =>
        /^\/admin\/teams\/[^/]+\/billing(\/.*)?$/.test(pathname),
    },
    {
      path: "/admin/teams/",
      title: "Member Profile",
      description: "View, edit, and manage member information",
      match: (pathname: string) =>
        /^\/admin\/teams\/[^/]+\/members\/[^/]+$/.test(pathname),
    },
    {
      path: "/admin/teams",
      title: "Teams",
      description: "Manage your teams and members",
    },
    {
      path: "/admin/custom-forms",
      title: "Custom Forms",
      description: "Design, preview, and assign to your team",
    },
    {
      path: "/admin/billing",
      title: "Payments",
      description: "Manage fees and member accounts",
    },
    {
      path: "/admin/transactions",
      title: "Transactions",
      description: "Review payments across all teams",
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
      path: "/member/payments",
      title: "Payments",
      description: "View receipts, manage billing, and make payments",
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

type TeamsContextValue = {
  addTeam: (team: {
    name: string
    description?: string
    ownerName: string
  }) => Promise<unknown>
  hasReachedTeamLimit: boolean
  planLimits: {
    customForms: number
  }
}


export function SiteHeader() {
  const pathname = usePathname()
  const normalizedPath = pathname?.replace(/\/$/, "")
  const { members } = useMembers()
  const [memberBillingType, setMemberBillingType] = useState("")

  // ✅ Define role FIRST
  const role = normalizedPath?.startsWith("/admin")
    ? "admin"
    : normalizedPath?.startsWith("/member")
    ? "member"
    : null

  const isAdmin = role === "admin"
  const memberTeamId = members?.[0]?.teamId

  useEffect(() => {
    if (role !== "member" || !memberTeamId) return

    const unsubscribe = onSnapshot(doc(db, "teams", memberTeamId), (snapshot) => {
      setMemberBillingType(snapshot.data()?.billingConfig?.billingType || "")
    })

    return () => unsubscribe()
  }, [memberTeamId, role])

  // Now it's safe to use role
  const routes = role ? ROUTE_CONFIG[role] : []

  const currentRouteBase =
    routes.find((route) => {
      if (route.match) {
        return route.match(normalizedPath);
      }

      return (
        normalizedPath === route.path ||
        normalizedPath?.startsWith(route.path + "/")
      );
    }) ?? DEFAULT_ROUTE;
  const currentRoute =
    role === "member" &&
    normalizedPath === "/member/payments" &&
    memberBillingType === "salary"
      ? {
          ...currentRouteBase,
          title: "Payroll",
          description: "View salary details and download payslips",
        }
      : currentRouteBase


  const { addTeam, hasReachedTeamLimit, planLimits  } =
    useTeams() as TeamsContextValue;
  const [modalOpen, setModalOpen] = useState(false);
  const [showLimitDialog, setShowLimitDialog] = useState(false);
  const [showCustomFormsDialog, setShowCustomFormsDialog] = useState(false);

  const openCreateForm = async () => {
    const formsSnapshot = await getDocs(collection(db, "customForms"));

    if (formsSnapshot.size >= planLimits.customForms) {
      setShowCustomFormsDialog(true);
      return;
    }

    setModalOpen(true);
  };


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
          <p className="hidden sm:block text-xs text-muted-foreground">
            {currentRoute.description}
          </p>
        </div>



        <div className="ml-auto flex items-center gap-4">
          {isAdmin &&
              (normalizedPath === "/admin" ||
                normalizedPath === "/admin/teams" ||
                normalizedPath === "/admin/custom-forms") && (
                <>
                  <Button
                    onClick={() => {
                      if (
                        normalizedPath === "/admin" ||
                        normalizedPath === "/admin/teams"
                      ) {
                        if (hasReachedTeamLimit) {
                          setShowLimitDialog(true);
                        } else {
                          setModalOpen(true);
                        }
                      }

                      if (normalizedPath === "/admin/custom-forms") {
                        openCreateForm();
                      }
                    }}
                  
                  >
                    <Plus />
                    {normalizedPath === "/admin/custom-forms"
                      ? "Create Form"
                      : "Add Team"}
                  </Button>

                  {normalizedPath === "/admin/custom-forms" ? (
                    <AddFormModal
                      open={modalOpen}
                      onOpenChange={setModalOpen}
                    />
                  ) : (
                    <AddTeamModal
                      open={modalOpen}
                      onOpenChange={setModalOpen}
                      addTeam={addTeam}
                      onUpgradeRequired={() => setShowLimitDialog(true)}
                    />
                  )}
                </>
)}

          
          <Notifications />

          <ModeToggle />


          <UpgradeDialog
            open={showLimitDialog}
            onOpenChange={setShowLimitDialog}
            title="Upgrade to add more teams"
            description="Your current plan has reached its team limit. Upgrade to Pro to create up to 5 teams."
          />

          <UpgradeDialog
            open={showCustomFormsDialog}
            onOpenChange={setShowCustomFormsDialog}
            title="Custom form limit reached"
            description={`Your current plan allows up to ${planLimits.customForms} custom forms. Upgrade to Pro to create up to 10 custom forms.`}
          />
        </div>
      </div>
    </header>
    
  )
}
