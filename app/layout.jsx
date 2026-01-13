'use client'

import "./globals.css"
import Header from "../components/header/Header"
import { usePathname } from "next/navigation"


export default function RootLayout({ children }) {
  const pathname = usePathname()

  const isDashboard = pathname.startsWith('/dashboard')

  return (
    <html lang="en">
      <body>
          {!isDashboard && <Header />}
          {children}
      </body>
    </html>
  )
}
