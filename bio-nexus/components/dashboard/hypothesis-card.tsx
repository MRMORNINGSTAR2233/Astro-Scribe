"use client"

import { GlowingEffect } from "@/components/ui/glowing-effect"

type HypoItem = { id: string; statement: string; confidence: number }

export function HypothesisCard({ item }: { item: HypoItem }) {
  return (
    <article className="relative rounded-lg border border-border bg-background/30 p-4 backdrop-blur-sm">
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
        <h4 className="text-sm font-semibold text-foreground">AI Hypothesis</h4>
        <p className="mt-1 text-sm text-muted-foreground">{item.statement}</p>
        <p className="mt-2 text-xs text-muted-foreground">Confidence: {(item.confidence * 100).toFixed(0)}%</p>
      </div>
    </article>
  )
}
