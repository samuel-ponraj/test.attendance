"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Users,
  UsersRound,
  History,
  Settings,
  Calendar,
  Form, 
  ReceiptIndianRupee
} from "lucide-react";

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
} from "@/components/ui/sidebar";

import { NavUserAdmin } from "./nav-user-admin";
import { NavUserMember } from "./nav-user-member";
import { useTheme } from "next-themes";
import { useMembers } from "@/app/context/MembersContext";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";

/* ---------------- NAV CONFIG ---------------- */

const navConfig = {
  admin: {
    main: [
      { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
      { title: "Teams", url: "/admin/teams", icon: Users },
      { title: "Activity Logs", url: "/admin/history", icon: History },
      { title: "Custom Forms", url: "/admin/custom-forms", icon: Form  },
      { title: "Payments", url: "/admin/billing", icon: ReceiptIndianRupee },
    ],
    settings: [{ title: "Account", url: "/admin/account", icon: Settings }],
  },

  member: {
    main: [
      { title: "Overview", url: "/member", icon: LayoutDashboard },
      { title: "Attendance", url: "/member/attendance", icon: Calendar },
      { title: "Profile", url: "/member/profile", icon: UsersRound },
      { title: "Payments", url: "/member/payments", icon: ReceiptIndianRupee },
    ],
    settings: [{ title: "Account", url: "/member/account", icon: Settings }],
  },
};

/* ---------------- COMPONENT ---------------- */

export function AppSidebar() {
  const pathname = usePathname();
  const { state, setOpenMobile } = useSidebar();
  const { theme } = useTheme();
  const { members } = useMembers();
  const [memberBillingType, setMemberBillingType] = useState("");

  const isCollapsed = state === "collapsed";
  const isLight = theme === "light";

  /* ---------- ROLE FROM ROUTE ---------- */
  const getRoleFromPath = (path) => {
    if (path.startsWith("/admin")) return "admin";
    if (path.startsWith("/member")) return "member";
    return null;
  };

  const role = getRoleFromPath(pathname);

  const memberTeamId = members?.[0]?.teamId;

  useEffect(() => {
    if (role !== "member" || !memberTeamId) return;

    const unsubscribe = onSnapshot(doc(db, "teams", memberTeamId), (snapshot) => {
      setMemberBillingType(snapshot.data()?.billingConfig?.billingType || "");
    });

    return () => unsubscribe();
  }, [memberTeamId, role]);

  if (!role) return null;

  const mainNavItems = navConfig[role].main.map((item) =>
    role === "member" &&
    item.url === "/member/payments" &&
    memberBillingType === "salary"
      ? { ...item, title: "Payroll" }
      : item,
  );
  const settingsItems = navConfig[role].settings;

  /* ---------- ACTIVE CHECK ---------- */
  const isActive = (url) => {
    if (url === `/${role}`) {
      return pathname === url;
    }
    return pathname.startsWith(url);
  };

  const closeSidebar = () => {
    setOpenMobile(false);
  };

  return (
    <Sidebar collapsible="icon">
      {/* ---------- Header ---------- */}
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center justify-center gap-3 px-2 py-[3.5px]">
          <Link href="/" onClick={closeSidebar}>
            {isCollapsed ? (
              <Image
                src="/logo/logo.png"
                alt="KDS Small Logo"
                width={30}
                height={30}
                className="py-[12.5px]"
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
        {/* -------- MAIN -------- */}
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => {
                const active = isActive(item.url);

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

                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* -------- SETTINGS -------- */}
        <SidebarGroup>
          <SidebarGroupLabel>Settings</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                  >
                    <Link href={item.url} onClick={closeSidebar}>
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

      {/* ---------- Footer ---------- */}
      <SidebarFooter className="py-6">
        {role == 'admin' ? <NavUserAdmin/> : <NavUserMember /> }
      </SidebarFooter>
    </Sidebar>
  );
}
