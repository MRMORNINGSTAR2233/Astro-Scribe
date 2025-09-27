import { NextResponse } from "next/server"

export async function GET() {
  const res = {
    capacity: [
      { team: "Alpha", ops: 42, research: 22, overhead: 9 },
      { team: "Bravo", ops: 28, research: 34, overhead: 12 },
      { team: "Echo", ops: 36, research: 26, overhead: 10 },
      { team: "Foxtrot", ops: 25, research: 30, overhead: 14 },
    ],
    timeline: [
      { name: "T-5", completed: 10, scheduled: 12 },
      { name: "T-4", completed: 12, scheduled: 13 },
      { name: "T-3", completed: 13, scheduled: 15 },
      { name: "T-2", completed: 14, scheduled: 15 },
      { name: "T-1", completed: 16, scheduled: 17 },
      { name: "T-0", completed: 18, scheduled: 18 },
    ],
  }
  return NextResponse.json(res)
}
