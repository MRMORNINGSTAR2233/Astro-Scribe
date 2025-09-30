"use client"

import { GlowingEffect } from "@/components/ui/glowing-effect"

type PaperItem = { id: string; title: string; authors: string; year: number; source: string; consensusTag?: string }

export function PaperCard({ item }: { item: PaperItem }) {
  return (
    <article className="relative rounded-lg border border-border bg-background/40 p-4 backdrop-blur-sm">
      <GlowingEffect
        spread={28}
        glow={true}
        disabled={false}
        proximity={45}
        inactiveZone={0.15}
        borderWidth={1.5}
        movementDuration={1.1}
      />
      <div className="relative">
        <header className="mb-2">
          <h3 className="text-base font-semibold text-foreground">{item.title}</h3>
          <p className="text-xs text-muted-foreground">
            {item.authors} • {item.year} • {item.source}
          </p>
        </header>
        {item.consensusTag ? (
          <span className="inline-flex rounded-full border border-border px-2 py-0.5 text-[10px] text-primary">
            {item.consensusTag}
          </span>
        ) : null}
      </div>
    </article>
  )
}
