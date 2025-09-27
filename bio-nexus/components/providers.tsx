"use client"

import { ThemeProvider } from "@/components/theme-provider"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type React from "react"

let queryClient: QueryClient | null = null
function getQueryClient() {
  if (!queryClient) {
    queryClient = new QueryClient()
  }
  return queryClient
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" disableTransitionOnChange>
      <QueryClientProvider client={getQueryClient()}>{children}</QueryClientProvider>
    </ThemeProvider>
  )
}
