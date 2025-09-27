"use client"

import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer } from "recharts"

type Props = {
  value: number // 0 - 100
  color?: string
}

export function RadialGauge({ value, color = "oklch(70% 0.14 220)" }: Props) {
  const data = [{ name: "value", uv: Math.max(0, Math.min(100, value)) }]
  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          cx="50%"
          cy="50%"
          innerRadius="70%"
          outerRadius="90%"
          barSize={14}
          startAngle={90}
          endAngle={-270}
          data={data}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
          <RadialBar background dataKey="uv" cornerRadius={8} fill={color} />
        </RadialBarChart>
      </ResponsiveContainer>
    </div>
  )
}
