"use client"

import { Area, AreaChart as RAreaChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"

type Props = {
  data: Array<{ name: string; value: number }>
  stroke?: string
  fill?: string
}

export function AreaChart({ data, stroke = "oklch(80% 0.08 220)", fill = "oklch(60% 0.12 220 / 0.18)" }: Props) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RAreaChart data={data}>
          <defs>
            <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={fill} />
              <stop offset="95%" stopColor="transparent" />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="color-mix(in oklch, canvas, transparent 92%)" vertical={false} />
          <XAxis dataKey="name" tickLine={false} axisLine={false} />
          <YAxis tickLine={false} axisLine={false} />
          <Tooltip />
          <Area type="monotone" dataKey="value" stroke={stroke} fill="url(#areaFill)" />
        </RAreaChart>
      </ResponsiveContainer>
    </div>
  )
}
