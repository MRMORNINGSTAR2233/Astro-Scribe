export function FeaturesGrid() {
  const features = [
    {
      title: "Adaptive Pipelines",
      desc: "Auto-configuring workflows optimized for your data volume and constraints.",
    },
    {
      title: "Mission Planner",
      desc: "Precision planning for objectives, constraints, and rendezvous—no guesswork.",
    },
    {
      title: "Operational Oversight",
      desc: "Manager View integrates health, throughput, and team capacity at a glance.",
    },
    {
      title: "Audit-First",
      desc: "Immutable logs, role controls, and comprehensive event trail by default.",
    },
    {
      title: "Realtime Telemetry",
      desc: "Live metrics, alerts, and anomaly detection where it matters most.",
    },
    {
      title: "Human-In-The-Loop",
      desc: "Review checkpoints with safety holds and collaborative approval steps.",
    },
  ]

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 md:py-20">
      <h2 className="text-2xl font-semibold text-foreground md:text-3xl">Designed for Clarity</h2>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground md:text-base">
        Fewer clicks. Stronger signal. A control surface that stays legible under mission load.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => (
          <div key={f.title} className="rounded-xl border border-border/60 bg-background/50 p-5 backdrop-blur">
            <div className="text-sm font-medium text-foreground">{f.title}</div>
            <div className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.desc}</div>
          </div>
        ))}
      </div>
    </section>
  )
}
