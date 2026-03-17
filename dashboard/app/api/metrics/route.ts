import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"

const METRICS_DIR = process.env.METRICS_DIR ?? path.join(process.cwd(), "..", "metrics")

function readJSON(filename: string) {
  const fp = path.join(METRICS_DIR, filename)
  if (!fs.existsSync(fp)) return null
  try {
    return JSON.parse(fs.readFileSync(fp, "utf-8"))
  } catch {
    return null
  }
}

export async function GET() {
  return NextResponse.json({
    containerA: readJSON("container_a_results.json"),
    containerB: readJSON("container_b_results.json"),
    lastFetched: new Date().toISOString(),
  })
}
