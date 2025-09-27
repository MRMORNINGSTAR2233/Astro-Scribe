"use client"

import { useSearchStore } from "@/store/search-store"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search } from "lucide-react"

export function SearchBar() {
  const { query, setQuery } = useSearchStore()

  return (
    <div className="mb-4 flex items-center gap-2">
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search bioscience knowledge..."
        aria-label="Search"
      />
      <Button
        type="button"
        variant="default"
        onClick={() => {
          /* query auto-triggers by state change */
        }}
      >
        <Search className="mr-2 size-4" />
        Search
      </Button>
    </div>
  )
}
