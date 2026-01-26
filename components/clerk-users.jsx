import { SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import Link from "next/link";
import { SiClerk } from "react-icons/si";

const items = [
    {
      title: "User Accounts",
      url: "https://dashboard.clerk.com/apps/app_2zsJiO69yY1r8AyCCm1nFzPgoXJ/instances/ins_2zsJiUEWzU1b2LiUP92GYK4cWHb/users",
      icon: SiClerk,
    },
  ]

export function ClerkUsers() {
  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2 mt-[5px]">
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title} >
              {item.url ? (
                <Link href={item.url} target="_blank" rel="noopener noreferrer"> 
                  <SidebarMenuButton tooltip={item.title} className="cursor-pointer">
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </Link>
              ) : (
                <SidebarMenuButton tooltip={item.title}>
                  {item.icon && <item.icon />}
                  <span>{item.title}</span>
                </SidebarMenuButton>
              )}
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
