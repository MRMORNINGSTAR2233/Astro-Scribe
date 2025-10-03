import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const { 
    objective = "", 
    constraints = "", 
    rendezvous = "", 
    destination = "",
    durationDays = 0 
  } = await req.json()

  // If this is a risk analysis request (contains destination and duration)
  if (destination && durationDays) {
    const rankedRisks = [
      { 
        category: "Radiation Exposure", 
        score: destination.toLowerCase().includes("mars") ? 0.88 : 0.65 
      },
      { 
        category: "Bone Density Loss", 
        score: durationDays > 180 ? 0.74 : 0.5 
      },
      { 
        category: "Immune Dysregulation", 
        score: 0.42 
      },
      {
        category: "Cardiovascular Deconditioning",
        score: durationDays > 90 ? 0.67 : 0.35
      }
    ]

    const knowledgeGaps = [
      "Long-duration microbiome shifts",
      "Partial gravity countermeasures",
      "Psychological adaptation mechanisms",
      "Radiation protection efficacy"
    ]

    return NextResponse.json({ rankedRisks, knowledgeGaps })
  }

  // Original mission planning functionality
  const steps = [
    `Ingest samples · Validate integrity · Configure pipeline for: ${objective || "defined objective"}`,
    `Select compute class based on constraints: ${constraints || "default"} · Allocate buffers`,
    `Dry-run with 1% subset · Verify latency and error bounds`,
    `Execute full pipeline · Stream metrics to Command Deck`,
    `Rendezvous and handoff: ${rendezvous || "N/A"} · Archive and audit`,
  ]

  const risk = constraints.toLowerCase().includes("budget") ? "Low-Moderate (cost focus)" : "Low"
  const eta = constraints.toLowerCase().includes("4-hour") ? "3h 40m" : "~4h"

  return NextResponse.json({ steps, risk, eta })
}
