"use client"

import { FilterPanel } from "./filter-panel"
import { GlowingEffect } from "@/components/ui/glowing-effect"

export function Sidebar() {
  return (
    <div className="relative rounded-lg border border-border bg-background/40 p-4 backdrop-blur-sm">
      <GlowingEffect
        spread={30}
        glow={true}
        disabled={false}
        proximity={48}
        inactiveZone={0.18}
        borderWidth={1.5}
        movementDuration={1.2}
      />
      <div className="relative">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Filters</h2>
        <FilterPanel />
      </div>
    </div>
  )
}
