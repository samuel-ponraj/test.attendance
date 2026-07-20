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
    const isBos = pathname.startsWith("/bos");
    const isPending = pathname.startsWith("/pending");
    const isAuthPage = pathname === "/";


    return (
        <html lang="en">
            <body className="layout">
                <AuthProvider>
                    {!isAdmin && !isBos && !isPending && !isMember && !isAuthPage && <Header />}
                    {isAuthPage ? children : <main className="content">{children}</main>}
                    <Toaster richColors position="top-center" />
                    {!isAdmin && !isBos && !isPending && !isMember && !isAuthPage && <Footer />}
                </AuthProvider>
                <Analytics />
            </body>
        </html>
    );
}
