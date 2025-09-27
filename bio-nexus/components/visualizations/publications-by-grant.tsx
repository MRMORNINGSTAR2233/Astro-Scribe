"use client"

import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis, ResponsiveContainer } from "recharts"

const data = [
  { grant: "NNX-01", count: 120 },
  { grant: "NNX-12", count: 180 },
  { grant: "NNH-09", count: 95 },
  { grant: "NNH-18", count: 210 },
]

export function PublicationsByGrant() {
  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid stroke="hsl(var(--color-border))" strokeDasharray="3 3" />
          <XAxis dataKey="grant" stroke="hsl(var(--color-muted-foreground))" />
          <YAxis stroke="hsl(var(--color-muted-foreground))" />
          <Tooltip />
          <Bar dataKey="count" fill="hsl(var(--color-accent-foreground))" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
