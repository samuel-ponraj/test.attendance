'use client'

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  BarChart3,
  UsersRound,
  History
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { NavUser } from "./nav-user"
import { useTheme } from "next-themes"
import { useTeams } from '@/app/context/TeamsContext'


const mainNavItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Teams", url: "/dashboard/teams", icon: Users },
  { title: "History", url: "/dashboard/history", icon: History },
  { title: "Analytics", url: "/dashboard/analytics", icon: BarChart3 },
]

export function AppSidebar() {

  const { teams } = useTeams()
  const { state, setOpenMobile } = useSidebar()
  const isCollapsed = state === "collapsed"
  const pathname = usePathname()

  const { theme } = useTheme()
  const isLight = theme === "light"

  const isActive = (url) => {
    if (url === "/dashboard") {
      return pathname === "/dashboard"
    }
    return pathname === url || pathname.startsWith(url + "/")
  }

  const closeSidebar = () => {
    setOpenMobile(false)
  }

  const isTeamsRoute = pathname.startsWith("/dashboard/teams")

  return (
    <Sidebar collapsible="icon">
      {/* ---------- Header ---------- */}
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center justify-center gap-3 px-2 py-3">
          <Link href='/' onClick={closeSidebar}>
            {isCollapsed ? (
              <Image
                src="/logo/logo.png"
                alt="KDS Small Logo"
                width={30}
                height={30}
              />
            ) : (
              <Image
                src={
                  isLight
                    ? "/logo/KDA-logo-black.png"
                    : "/logo/KDA-logo-white.png"
                }
                alt="KDS Full Logo"
                width={150}
                height={40}
              />
            )}
          </Link>
        </div>
      </SidebarHeader>

      {/* ---------- Content ---------- */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => {
                const active = isActive(item.url)

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.title}
                    >
                      <Link href={item.url} onClick={closeSidebar}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>

                    {/* ---------- Teams Sub Menu ---------- */}
                    {item.title === "Teams" && isTeamsRoute && !isCollapsed && (
                      <div className="ml-7 mt-1 space-y-1">
                        {teams?.length > 0 ? (
                          teams.map((team) => (
                            <Link
                              key={team.id}
                              href={`/dashboard/teams/${team.id}`}
                              onClick={closeSidebar}
                              className={`flex items-center gap-2 truncate rounded-md px-3 py-1.5 text-sm transition
                                ${
                                  pathname === `/dashboard/teams/${team.id}`
                                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                                    : "text-muted-foreground hover:bg-sidebar-accent/60"
                                }
                              `}
                            >
                              <UsersRound className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">{team.name}</span>
                            </Link>

                          ))
                        ) : (
                          <span className="px-3 py-1.5 text-sm text-muted-foreground">
                            No teams
                          </span>
                        )}
                      </div>
                    )}
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="py-6">
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}
