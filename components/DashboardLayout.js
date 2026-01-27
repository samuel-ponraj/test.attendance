'use client';

import { ThemeProvider } from "@/components/theme-provider";
import { UIProvider } from "../app/context/uiContext";
import { TeamsProvider } from "../app/context/TeamsContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Toaster } from "sonner";

export default function DashboardClient({ children }) {
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) router.replace("/login");
    });
    return () => unsub();
  }, [router]);

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <Toaster richColors position="top-center" />
      <UIProvider>
        <TeamsProvider>{children}</TeamsProvider>
      </UIProvider>
    </ThemeProvider>
  );
}
