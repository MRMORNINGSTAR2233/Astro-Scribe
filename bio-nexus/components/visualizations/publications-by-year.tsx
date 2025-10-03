"use client"

import { useState, useEffect } from 'react'
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis, ResponsiveContainer } from "recharts"
import { Loader2 } from 'lucide-react'

interface YearData {
  year: string
  count: number
}

export function PublicationsByYear() {
  const [data, setData] = useState<YearData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPublicationsByYear()
  }, [])

  const fetchPublicationsByYear = async () => {
    try {
      const response = await fetch('/api/papers')
      if (response.ok) {
        const result = await response.json()
        
        // Group papers by year
        const yearCounts: Record<string, number> = {}
        result.papers.forEach((paper: any) => {
          const year = paper.publication_year?.toString() || 'Unknown'
          yearCounts[year] = (yearCounts[year] || 0) + 1
        })

        // Convert to chart format and sort by year
        const chartData = Object.entries(yearCounts)
          .map(([year, count]) => ({ year, count }))
          .sort((a, b) => a.year.localeCompare(b.year))

        setData(chartData)
      }
    } catch (error) {
      console.error('Error fetching publications by year:', error)
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
          <XAxis dataKey="year" stroke="hsl(var(--color-muted-foreground))" />
          <YAxis stroke="hsl(var(--color-muted-foreground))" />
          <Tooltip />
          <Bar dataKey="count" fill="hsl(var(--color-primary))" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
