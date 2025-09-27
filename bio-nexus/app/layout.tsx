import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { Suspense } from "react"
import { Providers } from "@/components/providers"
import { Navbar } from "@/components/navbar"
import { StatusTicker } from "@/components/status-ticker"

export const metadata: Metadata = {
  title: "Project Bio-Nexus",
  description: "NASA Bioscience Explorer",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`dark antialiased font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:border focus:border-border focus:bg-background focus:px-3 focus:py-2 focus:text-foreground"
        >
          Skip to content
        </a>
        <Providers>
          <Navbar />
          <StatusTicker />
          <Suspense>
            <main id="main-content">{children}</main>
            <Analytics />
          </Suspense>
        </Providers>
      </body>
    </html>
  )
}
