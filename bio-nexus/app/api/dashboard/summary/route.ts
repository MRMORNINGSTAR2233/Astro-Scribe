import { NextResponse } from "next/server"

export async function GET() {
  const res = {
    stats: [
      { k: "Throughput", v: "234K reads/s" },
      { k: "Latency", v: "43 ms p95" },
      { k: "Queue", v: "12 tasks" },
      { k: "Health", v: "Nominal" },
    ],
    throughput: [
      { name: "T-5", value: 120 },
      { name: "T-4", value: 140 },
      { name: "T-3", value: 160 },
      { name: "T-2", value: 210 },
      { name: "T-1", value: 190 },
      { name: "T-0", value: 245 },
    ],
    health: 82,
  }
  return NextResponse.json(res)
}
