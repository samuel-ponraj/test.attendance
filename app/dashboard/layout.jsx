'use client'
export const runtime = "nodejs";

import AddTeamModal from "../../components/dashboard/addTeamModal";
import { ThemeProvider } from "@/components/theme-provider";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { UIProvider, useUI } from "../context/uiContext";
import { TeamsProvider } from "../context/TeamsContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth"
import {  auth } from "@/lib/firebase"
import { Toaster } from "sonner";

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
  const router = useRouter();
  useEffect(() => {
		const unsub = onAuthStateChanged(auth, (user) => {
			if (!user) router.replace("/login");
		});
		return () => unsub();
	}, [router]);
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <Toaster richColors position="top-center" />
      <UIProvider>
        <TeamsProvider>
          <DashboardContent>{children}</DashboardContent>
        </TeamsProvider>
      </UIProvider>
    </ThemeProvider>
  );
}
