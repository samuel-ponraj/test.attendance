"use client"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { IconLogout, IconUserCircle } from "@tabler/icons-react"
import { signOut } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { useAuth } from "@/app/context/AuthContext"
import { useRouter } from "next/navigation"
import Link from "next/link"

export function FooterUserNav() {
  const { user } = useAuth()
  const router = useRouter()

  if (!user) return null

  const initials =
    user.displayName
      ?.split(" ")
      .map(n => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U"

  const handleLogout = async () => {
    try {
      await signOut(auth)
      router.push("/")
    } catch (err) {
      console.error("Logout failed:", err)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex flex-col items-center justify-center gap-1 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground">
          <Avatar className="h-6 w-6">
            <AvatarImage src={user.photoURL || ""} alt={user.displayName || "User"} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <span>Account</span>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        side="top"
        sideOffset={8}
        className="w-48"
      >
        <DropdownMenuItem asChild>
          <Link
            href="/dashboard/account"
            className="flex items-center gap-2"
          >
            <IconUserCircle size={16} />
            Account
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={handleLogout}
          className="flex items-center gap-2 text-destructive"
        >
          <IconLogout size={16} />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
