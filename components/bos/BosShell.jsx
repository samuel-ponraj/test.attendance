"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  LogOut,
  Plus,
  Settings,
  Users,
} from "lucide-react";
import { useTheme } from "next-themes";
import { ModeToggle } from "@/components/modeToggle";
import ProtectedRoute from "@/components/ProtectedRoute";
import { ThemeProvider } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/app/context/AuthContext";

const navConfig = {
  main: [
    { title: "Overview", href: "/bos", icon: LayoutDashboard },
    { title: "Users", href: "/bos/users", icon: Users },
  ],
  settings: [{ title: "Settings", href: "/bos/settings", icon: Settings }],
};

const routeConfig = [
  {
    path: "/bos/companies",
    title: "Company Details",
    description: "View and manage company licence information",
  },
  {
    path: "/bos/create-company",
    title: "Create Company",
    description: "Set up a company and its company administrator",
  },
  {
    path: "/bos/users",
    title: "Users",
    description: "View customer accounts, teams, and members",
  },
  {
    path: "/bos/settings",
    title: "Settings",
    description: "Manage your BOS account security",
  },
  {
    path: "/bos",
    title: "Overview",
    description: "Monitor users, teams, members, and activity",
  },
];

function BosSidebar() {
  const pathname = usePathname();
  const { state, setOpenMobile } = useSidebar();
  const { theme } = useTheme();
  const isCollapsed = state === "collapsed";
  const isLight = theme === "light";

  const closeSidebar = () => setOpenMobile(false);
  const isActive = (href) =>
    href === "/bos" ? pathname === href : pathname.startsWith(href);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center justify-center gap-3 px-2 py-[3.5px]">
          <Link href="/bos" onClick={closeSidebar}>
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

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navConfig.main.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.href)}
                    tooltip={item.title}
                  >
                    <Link href={item.href} onClick={closeSidebar}>
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
          <SidebarGroupLabel>Settings</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navConfig.settings.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.href)}
                    tooltip={item.title}
                  >
                    <Link href={item.href} onClick={closeSidebar}>
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

      <SidebarFooter className="py-6">
        <BosLogoutButton />
      </SidebarFooter>
    </Sidebar>
  );
}

function BosLogoutButton() {
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    window.location.assign("/");
  };

  return (
    <Button variant="outline" className="mx-2 justify-start" onClick={handleLogout}>
      <LogOut className="h-4 w-4" />
      <span className="group-data-[collapsible=icon]:hidden">Logout</span>
    </Button>
  );
}

function BosHeader() {
  const pathname = usePathname();
  const normalizedPath = pathname?.replace(/\/$/, "") || "/bos";
  const currentRoute =
    routeConfig.find(
      (route) =>
        normalizedPath === route.path ||
        (route.path !== "/bos" && normalizedPath.startsWith(route.path)),
    ) || routeConfig[routeConfig.length - 1];

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 py-3 lg:gap-2 lg:px-6 lg:py-4">
        <SidebarTrigger className="-ml-1" />

        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />

        <div className="flex flex-col leading-tight">
          <h1 className="text-base font-medium">{currentRoute.title}</h1>
          <p className="hidden text-xs text-muted-foreground sm:block">
            {currentRoute.description}
          </p>
        </div>

        <div className="ml-auto flex items-center gap-4">
          {!pathname.startsWith("/bos/create-company") && (
            <Button asChild size="sm">
              <Link href="/bos/create-company">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Add Company</span>
              </Link>
            </Button>
          )}
          <ModeToggle />
        </div>
      </div>
    </header>
  );
}

function BosContent({ children }) {
  return (
    <SidebarProvider
      style={{
        "--sidebar-width": "calc(var(--spacing) * 72)",
        "--header-height": "calc(var(--spacing) * 16)",
      }}
    >
      <BosSidebar />

      <SidebarInset>
        <div className="sticky top-0 z-50 bg-background">
          <BosHeader />
        </div>

        <div className="flex flex-1 flex-col pt-0 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex-1 p-4 md:p-6">{children}</div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default function BosShell({ children }) {
  return (
    <ProtectedRoute allowedRole="bos">
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <BosContent>{children}</BosContent>
      </ThemeProvider>
    </ProtectedRoute>
  );
}
