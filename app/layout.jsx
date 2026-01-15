'use client'

import "./globals.css"
import Header from "../components/header/Header"
import { usePathname } from "next/navigation"
import {  ClerkProvider} from '@clerk/nextjs'


export default function RootLayout({ children }) {
  const pathname = usePathname()

  const isDashboard = pathname.startsWith('/dashboard')

  return (
    <ClerkProvider>
    <html lang="en">
      <body>
          {!isDashboard && <Header />}
          {children}
      </body>
    </html>
    </ClerkProvider>
  )
}
