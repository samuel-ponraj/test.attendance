'use client'

import "./globals.css"
import Header from "../components/header/Header"
import Footer from "@/components/footer/Footer"
import { usePathname } from "next/navigation"
import { ClerkProvider } from "@clerk/nextjs"
import Image from "next/image"

export default function RootLayout({ children }) {
  const pathname = usePathname()
  const isDashboard = pathname.startsWith("/dashboard")
  const isMaintenance = process.env.NEXT_PUBLIC_MAINTENANCE === "true"

  if (isMaintenance) {
    return (
      <html lang="en">
        <body
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "radial-gradient(circle at center, #5a0000, #000)",
            color: "#fff",
            textAlign: "center",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <div>
            {/* Logo */}
            <Image
              src="/logo/KDA-logo-white.png"
              alt="KDS Logo"
              width={150}
              height={100}
              priority
            />

            {/* Spacing */}
            <div style={{ height: "24px" }} />

            {/* Coming Soon */}
            <h1
              style={{
                letterSpacing: "6px",
                fontSize: "28px",
                opacity: 0.9,
              }}
            >
              COMING SOON
            </h1>

            <p style={{ marginTop: "12px", opacity: 0.7 }}>
              We’re preparing something great
            </p>
          </div>
        </body>
      </html>
    )
  }

  return (
    <ClerkProvider>
      <html lang="en">
        <body>
          {!isDashboard && <Header />}
          {children}
          {!isDashboard && <Footer />}
        </body>
      </html>
    </ClerkProvider>
  )
}
