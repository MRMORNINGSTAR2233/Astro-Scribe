"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { PaperCard } from "./paper-card"
import { HypothesisCard } from "./hypothesis-card"

type PaperItem = {
  type: "paper"
  id: string
  title: string
  authors: string
  year: number
  source: string
  consensusTag?: string
}
type HypoItem = { type: "hypothesis"; id: string; statement: string; confidence: number }
type Props = { data: (PaperItem | HypoItem)[]; isLoading: boolean; isError: boolean }

export function ResultsDisplay({ data, isLoading, isError }: Props) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border p-4">
            <Skeleton className="mb-2 h-5 w-3/4" />
            <Skeleton className="mb-1 h-4 w-1/2" />
            <Skeleton className="h-20 w-full" />
          </div>
        ))}
      </div>
    )
  }

  if (isError) {
    return <p className="text-sm text-destructive">There was an error loading results.</p>
  }

  if (!data?.length) {
    return <p className="text-sm text-muted-foreground">No results yet. Try searching for a topic.</p>
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {data.map((item) =>
        item.type === "paper" ? <PaperCard key={item.id} item={item} /> : <HypothesisCard key={item.id} item={item} />,
      )}
    </div>
  )
}
