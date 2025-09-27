"use client"

import { cn } from "@/lib/utils"

type StatusTickerProps = {
  className?: string
}

export function StatusTicker({ className }: StatusTickerProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn("w-full border-b border-border/60 bg-background/60 backdrop-blur", className)}
    >
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-2 text-xs md:text-sm">
        <span className="inline-flex items-center gap-2 text-foreground">
          <span className="relative inline-flex h-2.5 w-2.5 items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/70 opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
          </span>
          Live Telemetry
        </span>

        <span className="hidden h-4 w-px bg-border/70 md:inline-block" aria-hidden="true" />

        <ul className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground">
          <li className="inline-flex items-center gap-1">
            <span className="rounded-full bg-secondary/60 px-2 py-0.5 text-secondary-foreground/80">Kp Index</span>
            <span className="text-foreground">3.2</span>
          </li>
          <li className="inline-flex items-center gap-1">
            <span className="rounded-full bg-secondary/60 px-2 py-0.5 text-secondary-foreground/80">Radiation</span>
            <span className="text-foreground">Low</span>
          </li>
          <li className="inline-flex items-center gap-1">
            <span className="rounded-full bg-secondary/60 px-2 py-0.5 text-secondary-foreground/80">Datasets</span>
            <span className="text-foreground">120,412</span>
          </li>
          <li className="inline-flex items-center gap-1">
            <span className="rounded-full bg-secondary/60 px-2 py-0.5 text-secondary-foreground/80">Missions</span>
            <span className="text-foreground">87</span>
          </li>
        </ul>
      </div>
    </div>
  )
}
