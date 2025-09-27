"use client"

import { FilterPanel } from "./filter-panel"

export function Sidebar() {
  return (
    <div className="rounded-lg border border-border bg-background/40 p-4 backdrop-blur-sm">
      <h2 className="mb-3 text-sm font-semibold text-foreground">Filters</h2>
      <FilterPanel />
    </div>
  )
}
