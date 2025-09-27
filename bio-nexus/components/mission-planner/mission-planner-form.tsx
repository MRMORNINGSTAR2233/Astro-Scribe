"use client"

import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { useState } from "react"

export function MissionPlannerForm({
  onSubmit,
  isSubmitting,
}: {
  onSubmit: (values: { durationDays: number; destination: string }) => void
  isSubmitting: boolean
}) {
  const [duration, setDuration] = useState(180)
  const [destination, setDestination] = useState("ISS")

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit({ durationDays: duration, destination })
      }}
    >
      <div className="space-y-2">
        <Label>Mission Duration (days)</Label>
        <Input type="number" min={1} value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
      </div>
      <div className="space-y-2">
        <Label>Destination</Label>
        <Select value={destination} onValueChange={setDestination}>
          <SelectTrigger>
            <SelectValue placeholder="Select destination" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ISS">ISS</SelectItem>
            <SelectItem value="Moon">Moon</SelectItem>
            <SelectItem value="Mars">Mars</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Forecasting..." : "Forecast Risk"}
      </Button>
    </form>
  )
}
