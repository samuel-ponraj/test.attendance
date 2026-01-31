"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  History,
  BarChart3,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { FooterUserNav } from "./FooterNavUser"

const footerItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Teams", url: "/dashboard/teams", icon: Users },
  { title: "History", url: "/dashboard/history", icon: History },
  { title: "Analytics", url: "/dashboard/analytics", icon: BarChart3 },
]

const FooterNav = () => {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 p-1 z-50 border-t bg-background md:hidden ">
      <div className="grid grid-cols-4">
        {footerItems.map((item) => {
          const isActive = pathname === item.url

          return (
            <Link
              key={item.title}
              href={item.url}
              className={cn(
                "flex flex-col items-center justify-center gap-1 py-2 text-xs text-muted-foreground transition-colors",
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
        {/* <FooterUserNav /> */}
      </div>
    </nav>
  )
}

export default FooterNav
