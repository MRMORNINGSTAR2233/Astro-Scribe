"use client"

import WebGLShaderBackground from "@/components/ui/web-gl-shader"
import { LiquidGlassButton } from "@/components/ui/liquid-glass-button"
import Link from "next/link"

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <WebGLShaderBackground className="absolute inset-0" opacity={0.9} />
      <div className="relative mx-auto flex max-w-6xl flex-col items-center px-4 py-20 text-center md:py-28">
        <span className="rounded-full border border-border/60 bg-background/50 px-3 py-1 text-[11px] text-muted-foreground backdrop-blur">
          Bioinformatics Command Console
        </span>

        <h1 className="mt-5 text-balance text-3xl font-semibold tracking-tight text-foreground md:text-5xl">
          Orchestrate Space-Grade Bioinformatics with Surgical Precision
        </h1>

        <p className="mt-4 max-w-2xl text-pretty text-sm leading-relaxed text-muted-foreground md:text-base">
          Bio-Nexus fuses high-performance analysis, mission planning, and operational oversight into one instrument
          panel. Engineered for clarity under pressure, built for teams that can’t afford ambiguity.
        </p>

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
          <Link href="/dashboard">
            <LiquidGlassButton className="min-w-40">Open Command Deck</LiquidGlassButton>
          </Link>
          <Link href="/mission-planner">
            <LiquidGlassButton className="min-w-40">Plan a Mission</LiquidGlassButton>
          </Link>
        </div>

        <div className="mt-12 grid w-full grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { k: "Throughput", v: "250K+ reads/s" },
            { k: "Latency", v: "< 50ms" },
            { k: "Uptime", v: "99.99%" },
            { k: "Audits", v: "SOC 2, ISO" },
          ].map((i) => (
            <div key={i.k} className="rounded-lg border border-border/60 bg-background/40 p-4 text-left backdrop-blur">
              <div className="text-[11px] text-muted-foreground">{i.k}</div>
              <div className="mt-1 text-sm font-medium text-foreground">{i.v}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
