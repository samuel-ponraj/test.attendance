'use client'

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  BarChart3,
  Settings,
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

const mainNavItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Teams", url: "/dashboard/teams", icon: Users },
  { title: "History", url: "/dashboard/history", icon: History },
  { title: "Analytics", url: "/dashboard/analytics", icon: BarChart3 },
]

const settingsNavItems = [
  { title: "Settings", url: "/settings", icon: Settings },
]

export function AppSidebar() {
  const { state } = useSidebar()
  const isCollapsed = state === "collapsed"
  const pathname = usePathname()

  const isActive = (url: string)  => {
  if (url === "/dashboard") {
    return pathname === "/dashboard"
  }

  return pathname === url || pathname.startsWith(url + "/")
}

const data = {
  user: {
    name: "Samuel Ponraj",
    email: "samuel@example.com",
  },}

  return (
    <Sidebar collapsible="icon">
      {/* ---------- Header ---------- */}
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-3 px-2 py-3">
          {isCollapsed ? (
            <Image
              src="/logo/logo.png"
              alt="KDS Small Logo"
              width={30}
              height={30}
            />
          ) : (
            <Image
              src="/logo/kds-transparent-white.png"
              alt="KDS Full Logo"
              width={150}
              height={40}
            />
          )}
        </div>
      </SidebarHeader>

      {/* ---------- Content ---------- */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                  >
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>System</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                  >
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
              <NavUser user={data.user} />
            </SidebarFooter>
    </Sidebar>
  )
}
