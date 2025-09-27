"use client"

import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis, ResponsiveContainer } from "recharts"

const data = [
  { year: "2018", count: 320 },
  { year: "2019", count: 355 },
  { year: "2020", count: 290 },
  { year: "2021", count: 410 },
  { year: "2022", count: 468 },
  { year: "2023", count: 505 },
]

export function PublicationsByYear() {
  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid stroke="hsl(var(--color-border))" strokeDasharray="3 3" />
          <XAxis dataKey="year" stroke="hsl(var(--color-muted-foreground))" />
          <YAxis stroke="hsl(var(--color-muted-foreground))" />
          <Tooltip />
          <Bar dataKey="count" fill="hsl(var(--color-primary))" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
