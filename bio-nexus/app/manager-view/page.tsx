"use client"

import { PublicationsByYear } from "@/components/visualizations/publications-by-year"
import { PublicationsByGrant } from "@/components/visualizations/publications-by-grant"

export default function ManagerViewPage() {
  return (
    <main className="mx-auto max-w-6xl p-6">
      <h1 className="text-balance text-3xl font-bold text-foreground">Manager View</h1>
      <p className="mt-1 text-muted-foreground">Top-level trends and outputs across research programs.</p>

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-lg border border-border bg-background/40 p-4 backdrop-blur-sm">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Publications by Year</h2>
          <PublicationsByYear />
        </div>
        <div className="rounded-lg border border-border bg-background/40 p-4 backdrop-blur-sm">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Publications by Grant</h2>
          <PublicationsByGrant />
        </div>
      </div>
    </main>
  )
}
