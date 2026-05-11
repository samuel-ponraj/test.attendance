"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  History,
  Calendar,
  UsersRound,
  ReceiptIndianRupee,
} from "lucide-react"
import { cn } from "@/lib/utils"

const admin = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
  { title: "Teams", url: "/admin/teams", icon: Users },
  { title: "Logs", url: "/admin/history", icon: History },
  { title: "Payments", url: "/admin/billing", icon: ReceiptIndianRupee },
]

const member = [
  { title: "Dashboard", url: "/member", icon: LayoutDashboard },
  { title: "Attendance", url: "/member/attendance", icon: Calendar },
  { title: "Profile", url: "/member/profile", icon: UsersRound },
]

const FooterNav = () => {
  const pathname = usePathname()

  const getRoleFromPath = (path) => {
    if (path.startsWith("/admin")) return "admin"
    if (path.startsWith("/member")) return "member"
    return null
  }

  const role = getRoleFromPath(pathname)
  if (!role) return null

  const footerItems = role === "admin" ? admin : member

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background md:hidden">
      <div className="flex items-center justify-between">
        {footerItems.map((item) => {
          const isActive = pathname === item.url

          return (
            <Link
              key={item.title}
              href={item.url}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium text-muted-foreground transition-colors",
                isActive && "text-primary"
              )}
            >
              <item.icon
                className={cn(
                  "h-5 w-5",
                  isActive && "text-primary"
                )}
              />
              <span>{item.title}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

export default FooterNav
