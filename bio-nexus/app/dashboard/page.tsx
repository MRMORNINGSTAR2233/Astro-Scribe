"use client"

import { useSearchStore } from "@/store/search-store"
import { useQuery } from "@tanstack/react-query"
import { Sidebar } from "@/components/dashboard/sidebar"
import { SearchBar } from "@/components/dashboard/search-bar"
import { ResultsDisplay } from "@/components/dashboard/results-display"

type ResultItem =
  | { type: "paper"; id: string; title: string; authors: string; year: number; source: string; consensusTag?: string }
  | { type: "hypothesis"; id: string; statement: string; confidence: number }

async function mockSearch(query: string, year: number | null, subject: string | null): Promise<ResultItem[]> {
  await new Promise((r) => setTimeout(r, 600))
  const base: ResultItem[] = [
    {
      type: "paper",
      id: "p1",
      title: "Microgravity Effects on Cell Growth",
      authors: "Nguyen et al.",
      year: 2019,
      source: "NASA",
      consensusTag: "High Consensus",
    },
    {
      type: "paper",
      id: "p2",
      title: "Radiation Tolerance Pathways",
      authors: "Chen et al.",
      year: 2022,
      source: "JPL",
    },
    {
      type: "hypothesis",
      id: "h1",
      statement: "Mitochondrial adaptation under prolonged microgravity increases ROS signaling",
      confidence: 0.78,
    },
  ]
  return base.filter((item) => {
    let ok = true
    if (query) {
      ok = JSON.stringify(item).toLowerCase().includes(query.toLowerCase())
    }
    if (ok && year && item.type === "paper") ok = item.year >= year
    if (ok && subject) ok = JSON.stringify(item).toLowerCase().includes(subject.toLowerCase())
    return ok
  })
}

export default function DashboardPage() {
  const { query, minYear, subject } = useSearchStore()
  const { data, isLoading, isError } = useQuery({
    queryKey: ["search", query, minYear, subject],
    queryFn: () => mockSearch(query, minYear, subject),
  })

  return (
    <>
      <main className="mx-auto grid max-w-6xl grid-cols-1 gap-6 p-6 md:grid-cols-[260px_1fr]">
        <aside className="md:sticky md:top-16">
          <Sidebar />
        </aside>
        <section>
          <SearchBar />
          <ResultsDisplay data={data ?? []} isLoading={isLoading} isError={isError} />
        </section>
      </main>
    </>
  )
}
