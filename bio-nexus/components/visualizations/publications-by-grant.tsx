"use client"

import { useState, useEffect } from 'react'
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis, ResponsiveContainer } from "recharts"
import { Loader2 } from 'lucide-react'

interface GrantData {
  grant: string
  count: number
}

export function PublicationsByGrant() {
  const [data, setData] = useState<GrantData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPublicationsByGrant()
  }, [])

  const fetchPublicationsByGrant = async () => {
    try {
      const response = await fetch('/api/papers')
      if (response.ok) {
        const result = await response.json()
        
        // Group papers by source (since we don't have specific grant data)
        // This could be enhanced to extract grant info from paper content
        const grantCounts: Record<string, number> = {}
        result.papers.forEach((paper: any) => {
          const source = paper.source || 'Unknown'
          grantCounts[source] = (grantCounts[source] || 0) + 1
        })

        // Convert to chart format
        const chartData = Object.entries(grantCounts)
          .map(([grant, count]) => ({ grant, count }))
          .sort((a, b) => b.count - a.count)

        setData(chartData)
      }
    } catch (error) {
      console.error('Error fetching publications by grant:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="h-[260px] w-full flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

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
