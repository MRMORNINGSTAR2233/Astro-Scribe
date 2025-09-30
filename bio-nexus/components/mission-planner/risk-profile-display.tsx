"use client"

import { GlowingEffect } from "@/components/ui/glowing-effect"

export function RiskProfileDisplay({
  profile,
  isLoading,
}: {
  profile: { rankedRisks: { category: string; score: number }[]; knowledgeGaps: string[] } | null
  isLoading: boolean
}) {
  if (isLoading) return <p className="text-sm text-muted-foreground">Analyzing mission parameters...</p>
  if (!profile) return <p className="text-sm text-muted-foreground">Submit parameters to view the risk profile.</p>

  return (
    <div className="grid grid-cols-1 gap-4">
      <section>
        <h3 className="mb-2 text-sm font-semibold text-foreground">Ranked Risks</h3>
        <ul className="space-y-2">
          {profile.rankedRisks.map((r) => (
            <li
              key={r.category}
              className="relative flex items-center justify-between rounded-md border border-border/80 px-3 py-2"
            >
              <GlowingEffect
                spread={20}
                glow={true}
                disabled={false}
                proximity={35}
                inactiveZone={0.25}
                borderWidth={1}
                movementDuration={0.8}
              />
              <div className="relative flex items-center justify-between w-full">
                <span className="text-sm text-foreground">{r.category}</span>
                <span className="text-xs text-muted-foreground">{Math.round(r.score * 100)}%</span>
              </div>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h3 className="mb-2 text-sm font-semibold text-foreground">Knowledge Gaps</h3>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          {profile.knowledgeGaps.map((g) => (
            <li key={g}>{g}</li>
          ))}
        </ul>
      </section>
    </div>
  )
}
