'use client'

import { useState, useEffect } from "react"
import { Bell, UserPlus, Handshake, ChevronRight, User  } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

import { db, auth } from "@/lib/firebase"
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  updateDoc,
  doc,
  limit,
  getDoc
} from "firebase/firestore"

import { useRouter, usePathname } from "next/navigation"

export default function Notifications() {

  const [notifications, setNotifications] = useState([])
  const [popoverOpen, setPopoverOpen] = useState(false)

  const router = useRouter()
  const pathname = usePathname()

  const role = pathname?.startsWith("/admin") ? "admin" : "member"

  useEffect(() => {

  const initNotifications = async () => {

    const user = auth.currentUser
    if (!user) return

    let q

    if (role === "admin") {

      q = query(
        collection(db, "notifications"),
        orderBy("createdAt", "desc"),
        limit(10)
      )

    } else {

    const memberRef = doc(db, "allMembers", user.email?.toLowerCase())
    const memberSnap = await getDoc(memberRef)

    if (!memberSnap.exists()) return

    const teamId = memberSnap.data().teamId

      q = query(
        collection(
          db,
          "teams",
          teamId,
          "members",
          user.uid,
          "notifications"
        ),
        orderBy("createdAt", "desc"),
        limit(10)
      )

    }

    const unsubscribe = onSnapshot(q, (snapshot) => {

      const list = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }))

      setNotifications(list)

    })

    return () => unsubscribe()

  }

  initNotifications()

}, [role])


  const getNotificationIcon = (type) => {

    switch (type) {

      case "welcome":
        return <Handshake className="h-5 w-5 text-green-500" />

      case "member_join":
        return <UserPlus className="h-5 w-5 text-blue-500" />
      case "profile_update_required":
      return <User className="h-5 w-5 text-orange-500" />
      default:
        return <UserPlus className="h-5 w-5 text-muted-foreground" />

    }

  }


  const unreadCount = notifications.filter(n => !n.read).length


const markNotificationAsRead = async (notification) => {
  if (notification.read) return

  if (role === "admin") {
    await updateDoc(
      doc(db, "notifications", notification.id),
      { read: true }
    )
    return
  }

  const user = auth.currentUser
  if (!user) return

  const memberRef = doc(db, "allMembers", user.email?.toLowerCase())
  const memberSnap = await getDoc(memberRef)

  if (!memberSnap.exists()) return

  const { teamId } = memberSnap.data()

  await updateDoc(
    doc(
      db,
      "teams",
      teamId,
      "members",
      user.uid,
      "notifications",
      notification.id
    ),
    { read: true }
  )
}


const handleMarkAsRead = async (event, notification) => {
  event.stopPropagation()

  try {
    await markNotificationAsRead(notification)
  } catch (error) {
    console.error("Mark as read failed:", error)
  }
}


const handleNotificationClick = async (notification) => {

  try {

    await markNotificationAsRead(notification)

    /* Navigation logic */

    if (notification.type === "member_join") {
      router.push(`/admin/teams/${notification.teamId}/invite`)
    }

    if (notification.type === "profile_update_required") {
      router.push(`/member/profile`)
    }

    // welcome → no navigation

    setPopoverOpen(false)

  } catch (error) {
    console.error("Notification update failed:", error)
  }
}


  return (

    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>

      <PopoverTrigger asChild>

        <div className="relative cursor-pointer">

          <Bell size={21} />

          {unreadCount > 0 && (
            <Badge
              className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-[10px]"
              variant="destructive"
            >
              {unreadCount}
            </Badge>
          )}

        </div>

      </PopoverTrigger>


      <PopoverContent className="w-80 p-0">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <span className="text-sm font-medium">Notifications</span>
        </div>


        {/* List */}
        <div className="max-h-72 overflow-y-auto">

          {notifications.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">
              No notifications
            </p>
          )}


          {notifications.map((n) => {
      // Define logic variables inside the map block
            const isStatic = n.type === "welcome";

            return (
              <div
                key={n.id}
                onClick={() => !isStatic && handleNotificationClick(n)}
                className={`flex items-center gap-3 px-4 py-3 border-b last:border-none transition-colors
                  ${isStatic ? "cursor-default" : "cursor-pointer hover:bg-muted/50"}
                  ${!n.read ? "bg-muted/40 font-medium" : ""}
                `}
              >
                <div className="shrink-0">
                  {getNotificationIcon(n.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{n.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {n.message}
                  </p>

                  {!n.read && (
                    <button
                      type="button"
                      onClick={(event) => handleMarkAsRead(event, n)}
                      className="mt-2 text-xs font-medium text-primary hover:underline"
                    >
                      Mark as Read
                    </button>
                  )}
                </div>

                {!isStatic && (
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
              </div>
            );
          })}
        </div>
        

      </PopoverContent>

    </Popover>

  )
}
