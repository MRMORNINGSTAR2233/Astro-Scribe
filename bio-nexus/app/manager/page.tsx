"use client"

import useSWR from "swr"
import {
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function ManagerPage() {
  const { data } = useSWR("/api/manager/metrics", fetcher, { revalidateOnFocus: false })

  const capacity = data?.capacity ?? [
    { team: "Alpha", ops: 40, research: 20, overhead: 10 },
    { team: "Bravo", ops: 30, research: 30, overhead: 15 },
    { team: "Echo", ops: 35, research: 25, overhead: 10 },
  ]
  const timeline = data?.timeline ?? [
    { name: "T-5", completed: 10, scheduled: 12 },
    { name: "T-4", completed: 11, scheduled: 13 },
    { name: "T-3", completed: 13, scheduled: 14 },
    { name: "T-2", completed: 12, scheduled: 12 },
    { name: "T-1", completed: 15, scheduled: 16 },
    { name: "T-0", completed: 18, scheduled: 18 },
  ]

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <section className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-2xl font-semibold">Manager View</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Capacity, velocity, and schedule fidelity—configured for decisiveness.
        </p>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-border/60 bg-background/50 p-4 backdrop-blur">
            <div className="mb-2 text-sm font-medium">Team Capacity (Stacked)</div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={capacity}>
                  <CartesianGrid stroke="color-mix(in oklch, canvas, transparent 92%)" vertical={false} />
                  <XAxis dataKey="team" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Legend />
                  <Bar stackId="a" dataKey="ops" fill="var(--color-chart-1)" />
                  <Bar stackId="a" dataKey="research" fill="var(--color-chart-2)" />
                  <Bar stackId="a" dataKey="overhead" fill="var(--color-chart-3)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-xl border border-border/60 bg-background/50 p-4 backdrop-blur">
            <div className="mb-2 text-sm font-medium">Schedule Fidelity</div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeline}>
                  <CartesianGrid stroke="color-mix(in oklch, canvas, transparent 92%)" vertical={false} />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="completed" stroke="var(--color-chart-1)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="scheduled" stroke="var(--color-chart-3)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
