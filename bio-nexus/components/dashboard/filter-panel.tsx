"use client"

import { useSearchStore } from "@/store/search-store"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"

export function FilterPanel() {
  const { minYear, setMinYear, subject, setSubject } = useSearchStore()

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label className="text-sm text-muted-foreground">Publication Year (min)</Label>
        <Slider value={[minYear ?? 2015]} min={1990} max={2025} step={1} onValueChange={(v) => setMinYear(v[0])} />
        <div className="text-xs text-muted-foreground">From: {minYear ?? 2015}</div>
      </div>

      <div className="space-y-2">
        <Label className="text-sm text-muted-foreground">Research Subject</Label>
        <Select value={subject ?? ""} onValueChange={(v) => setSubject(v || null)}>
          <SelectTrigger>
            <SelectValue placeholder="Select subject" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="microgravity">Microgravity</SelectItem>
            <SelectItem value="radiation">Radiation</SelectItem>
            <SelectItem value="genomics">Genomics</SelectItem>
            <SelectItem value="clear">Clear</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
