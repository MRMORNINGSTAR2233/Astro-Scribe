import Link from "next/link"
import WebGLShaderBackground from "@/components/ui/web-gl-shader"
import { LiquidGlassButton } from "@/components/ui/liquid-glass-button"
import { CTASection } from "@/components/sections/cta"
import { GlowingEffect } from "@/components/ui/glowing-effect"

export default function LandingPage() {
  return (
    <div className="relative flex min-h-[calc(100vh-56px)] w-full flex-col items-center justify-center overflow-hidden">
      <WebGLShaderBackground />
      <div className="relative mx-auto w-full max-w-5xl rounded-lg border border-border bg-background/30 p-2 backdrop-blur-sm">
        <main className="relative overflow-hidden rounded-md border border-border py-10">
          <h1 className="mb-3 text-balance text-center text-5xl font-extrabold tracking-tighter text-foreground md:text-[clamp(2rem,8vw,7rem)]">
            Project Bio-Nexus
          </h1>
          <p className="mx-auto max-w-2xl px-6 text-pretty text-center text-sm text-muted-foreground md:text-base lg:text-lg">
            Unlocking decades of NASA bioscience research to fuel the next era of space exploration.
          </p>

          <div className="my-6 flex items-center justify-center gap-2">
            <span className="relative flex h-3 w-3 items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/70 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            <p className="text-xs text-primary">Online & Ready for Analysis</p>
          </div>

          {/* Highlights */}
          <section className="mx-auto grid max-w-4xl grid-cols-1 gap-4 px-6 md:grid-cols-3">
            <div className="relative rounded-lg border border-border/80 bg-background/40 p-4 backdrop-blur-sm">
              <GlowingEffect
                spread={25}
                glow={true}
                disabled={false}
                proximity={40}
                inactiveZone={0.2}
                borderWidth={1.5}
                movementDuration={1}
              />
              <div className="relative">
                <p className="text-sm text-muted-foreground">Datasets</p>
                <p className="text-2xl font-semibold text-foreground">120k+</p>
                <p className="mt-1 text-xs text-muted-foreground">Curated bioscience records</p>
              </div>
            </div>
            <div className="relative rounded-lg border border-border/80 bg-background/40 p-4 backdrop-blur-sm">
              <GlowingEffect
                spread={25}
                glow={true}
                disabled={false}
                proximity={40}
                inactiveZone={0.2}
                borderWidth={1.5}
                movementDuration={1}
              />
              <div className="relative">
                <p className="text-sm text-muted-foreground">Publications</p>
                <p className="text-2xl font-semibold text-foreground">48k+</p>
                <p className="mt-1 text-xs text-muted-foreground">Cross-mission insights</p>
              </div>
            </div>
            <div className="relative rounded-lg border border-border/80 bg-background/40 p-4 backdrop-blur-sm">
              <GlowingEffect
                spread={25}
                glow={true}
                disabled={false}
                proximity={40}
                inactiveZone={0.2}
                borderWidth={1.5}
                movementDuration={1}
              />
              <div className="relative">
                <p className="text-sm text-muted-foreground">Hypotheses</p>
                <p className="text-2xl font-semibold text-foreground">AI-assisted</p>
                <p className="mt-1 text-xs text-muted-foreground">Rigorous, explainable outputs</p>
              </div>
            </div>
          </section>

          {/* CTAs */}
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/dashboard" aria-label="Enter Bio-Nexus Dashboard">
              <LiquidGlassButton className="rounded-full border border-border px-8 py-3 text-foreground" size="xl">
                Enter Dashboard
              </LiquidGlassButton>
            </Link>
            <Link
              href="/mission-planner"
              className="rounded-full border border-border/70 px-6 py-2 text-sm text-muted-foreground hover:text-foreground"
              aria-label="Open Mission Planner"
            >
              Read the Mission Brief
            </Link>
          </div>
        </main>
      </div>
      <CTASection />
    </div>
  )
}
