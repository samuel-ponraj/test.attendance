"use client";

export const runtime = "nodejs";

import "./globals.css";
import Header from "../components/header/Header";
import Footer from "@/components/footer/Footer";
import { usePathname } from "next/navigation";
import { AuthProvider } from "../app/context/AuthContext";
import { Toaster } from "sonner";
import { Analytics } from "@vercel/analytics/next";

export default function RootLayout({ children }) {
    const pathname = usePathname();
    const isDashboard = pathname.startsWith("/dashboard");
    const isAuthPage = pathname === "/login" || pathname === "/signup";

    return (
        <html lang="en">
            <body className="layout">
                <AuthProvider>
                    {!isDashboard && !isAuthPage && <Header />}
                    <main className="content">{children}</main>
                    <Toaster richColors position="top-center" />
                    {!isDashboard && !isAuthPage && <Footer />}
                </AuthProvider>
                <Analytics />
            </body>
        </html>
    );
}