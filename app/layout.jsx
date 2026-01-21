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
            className="min-h-screen flex items-center justify-center text-center text-white"
            style={{
              background: "radial-gradient(circle at center, #5a0000 0%, #3a0000 18%, #000 45%)",
              fontFamily: "system-ui, sans-serif",
            }}
          >
            <div className="flex flex-col items-center justify-center w-full px-4">
              <Image
                src="/logo/KDA-logo-white.png"
                alt="KDS Logo"
                width={250}
                height={100}
                className="mx-auto w-[180px] sm:w-[220px] md:w-[250px]"
                priority
              />

              <div className="h-6" />

              <h1 className="tracking-[6px] text-[32px] sm:text-[48px] md:text-[60px] opacity-90 text-white">
                COMING SOON
              </h1>

              <p className="mt-3 opacity-70 text-sm sm:text-base text-white">
                We’re preparing something great !!!
              </p>
            </div>
          </body>

      </html>
    )
  }

  return (
    <ClerkProvider>
      <html lang="en">
        <body className="layout">
          {!isDashboard && <Header />}

          <main className="content">
            {children}
          </main>

          {!isDashboard && <Footer />}
        </body>
      </html>
    </ClerkProvider>
  )
}
