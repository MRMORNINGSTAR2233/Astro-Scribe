"use client"

import { MissionPlannerForm } from "@/components/mission-planner/mission-planner-form"
import { useMutation } from "@tanstack/react-query"
import { RiskProfileDisplay } from "@/components/mission-planner/risk-profile-display"
import { useState } from "react"

type Risk = { category: string; score: number }
type RiskProfile = { rankedRisks: Risk[]; knowledgeGaps: string[] }

async function mockRiskAPI(params: { durationDays: number; destination: string }): Promise<RiskProfile> {
  await new Promise((r) => setTimeout(r, 700))
  return {
    rankedRisks: [
      { category: "Radiation Exposure", score: params.destination === "Mars" ? 0.88 : 0.65 },
      { category: "Bone Density Loss", score: params.durationDays > 180 ? 0.74 : 0.5 },
      { category: "Immune Dysregulation", score: 0.42 },
    ],
    knowledgeGaps: ["Long-duration microbiome shifts", "Partial gravity countermeasures"],
  }
}

export default function MissionPlannerPage() {
  const [result, setResult] = useState<RiskProfile | null>(null)
  const { mutate, isPending } = useMutation({
    mutationFn: mockRiskAPI,
    onSuccess: (data) => setResult(data),
  })

  return (
    <>
      <main className="mx-auto max-w-5xl p-6">
        <h1 className="text-balance text-3xl font-bold text-foreground">Mission Risk Forecaster</h1>
        <p className="mt-1 text-muted-foreground">Estimate mission risks and identify knowledge gaps.</p>

        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="rounded-lg border border-border bg-background/40 p-4 backdrop-blur-sm">
            <MissionPlannerForm onSubmit={(values) => mutate(values)} isSubmitting={isPending} />
          </div>
          <div className="rounded-lg border border-border bg-background/40 p-4 backdrop-blur-sm">
            <RiskProfileDisplay profile={result} isLoading={isPending} />
          </div>
        </div>
      </main>
    </>
  )
}
