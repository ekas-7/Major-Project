"use client"

import {
  Radar,
  RadarChart as RechartsRadar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { ComparisonData, ModelResult } from "@/lib/types"

interface Props {
  data: ComparisonData
}

function normalize(val: number | null, min: number, max: number, invert = false): number {
  if (val == null || max === min) return 0
  const n = (val - min) / (max - min)
  return invert ? 1 - n : n
}

function aggregate(results: ModelResult[], metric: keyof ModelResult): number {
  const vals = results.map((r) => r[metric] as number).filter((v) => v != null)
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0
}

const TOOLTIP_STYLE = {
  backgroundColor: "oklch(0.12 0 0)",
  border: "1px solid oklch(1 0 0 / 8%)",
  borderRadius: "6px",
  color: "oklch(0.95 0 0)",
  fontSize: "12px",
}

export function RadarChart({ data }: Props) {
  const rA = data.containerA?.results ?? []
  const rB = data.containerB?.results ?? []

  if (!rA.length && !rB.length) {
    return (
      <Card className="bg-card border-border">
        <CardHeader className="pt-4 pb-2 px-4">
          <CardTitle className="text-sm font-medium">Pipeline Radar Comparison</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-48 text-muted-foreground text-sm">
          Waiting for results...
        </CardContent>
      </Card>
    )
  }

  const metrics: { key: keyof ModelResult; label: string; invert: boolean }[] = [
    { key: "accuracy", label: "Accuracy", invert: false },
    { key: "recall", label: "Recall", invert: false },
    { key: "auc", label: "AUC", invert: false },
    { key: "inference_time_ms", label: "Speed", invert: true },
    { key: "cpu_util_pct", label: "Efficiency", invert: true },
  ]

  const all = [...rA, ...rB]
  const chartData = metrics.map(({ key, label, invert }) => {
    const allVals = all.map((r) => r[key] as number).filter((v) => v != null)
    const min = Math.min(...allVals)
    const max = Math.max(...allVals)
    const aVal = rA.length ? aggregate(rA, key) : 0
    const bVal = rB.length ? aggregate(rB, key) : 0
    return {
      metric: label,
      A: parseFloat((normalize(aVal, min, max, invert) * 100).toFixed(1)),
      B: parseFloat((normalize(bVal, min, max, invert) * 100).toFixed(1)),
    }
  })

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pt-4 pb-2 px-4">
        <CardTitle className="text-sm font-medium">Pipeline Radar Comparison</CardTitle>
        <p className="text-xs text-muted-foreground">Normalized scores (higher = better for all axes)</p>
      </CardHeader>
      <CardContent className="pb-4">
        <ResponsiveContainer width="100%" height={300}>
          <RechartsRadar data={chartData}>
            <PolarGrid stroke="oklch(1 0 0 / 8%)" />
            <PolarAngleAxis
              dataKey="metric"
              tick={{ fontSize: 11, fill: "oklch(0.65 0 0)" }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tick={{ fontSize: 9, fill: "oklch(0.45 0 0)" }}
              tickCount={4}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              formatter={(val) => [`${Number(val).toFixed(1)}`, ""]}
            />
            <Legend
              wrapperStyle={{ fontSize: "11px" }}
              formatter={(value) => (
                <span style={{ color: value === "A" ? "oklch(0.65 0.18 250)" : "oklch(0.60 0.20 290)" }}>
                  {value === "A" ? "Container A (Lightweight)" : "Container B (Advanced)"}
                </span>
              )}
            />
            <Radar
              name="A"
              dataKey="A"
              stroke="oklch(0.65 0.18 250)"
              fill="oklch(0.65 0.18 250)"
              fillOpacity={0.15}
              strokeWidth={2}
            />
            <Radar
              name="B"
              dataKey="B"
              stroke="oklch(0.60 0.20 290)"
              fill="oklch(0.60 0.20 290)"
              fillOpacity={0.15}
              strokeWidth={2}
            />
          </RechartsRadar>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
