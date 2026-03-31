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
    const isAdmin = pathname.startsWith("/admin");
    const isMember = pathname.startsWith("/member");
    const isPending = pathname.startsWith("/pending");
    const isAuthPage = pathname === "/login" || pathname === "/signup";
    const isApplicationSubmittedPage = pathname === "/application-submitted"


    return (
        <html lang="en">
            <body className="layout">
                <AuthProvider>
                    {!isAdmin && !isPending && !isApplicationSubmittedPage && !isMember && !isAuthPage && <Header />}
                    <main className="content">{children}</main>
                    <Toaster richColors position="top-center" />
                    {!isAdmin && !isPending && !isApplicationSubmittedPage && !isMember && !isAuthPage && <Footer />}
                </AuthProvider>
                <Analytics />
            </body>
        </html>
    );
}