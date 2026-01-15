'use client'

import AddTeamModal from "../../components/dashboard/addTeamModal";
import { ThemeProvider } from "@/components/theme-provider";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { UIProvider, useUI } from "../context/uiContext";
import { AttendanceProvider } from "../context/AttendanceContext";

function DashboardContent({ children }) {
  const { isAddTeamOpen, setAddTeamOpen } = useUI();

  return (
    <>
      <AddTeamModal
        open={isAddTeamOpen}
        onOpenChange={setAddTeamOpen}
      />

      <SidebarProvider
        style={{
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 16)",
        }}
      >
        <AppSidebar variant="inset" />

        <SidebarInset>
          <SiteHeader />

          <div className="flex flex-1 flex-col">
            <div className="@container/main flex flex-1 flex-col gap-2">
              {children}
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </>
  );
}

export default function DashboardLayout({ children }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <UIProvider>
        <AttendanceProvider>
          <DashboardContent>{children}</DashboardContent>
        </AttendanceProvider>
      </UIProvider>
    </ThemeProvider>
  );
}
