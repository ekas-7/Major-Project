"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { ComparisonData, ModelResult } from "@/lib/types"
import { TrendingUp, Target, Zap, Cpu } from "lucide-react"

interface Props {
  data: ComparisonData
}

function bestModel(data: ComparisonData, metric: keyof ModelResult, higher = true): { value: number; model: string; container: string } | null {
  const all: { value: number; model: string; container: string }[] = []
  for (const r of data.containerA?.results ?? []) {
    if (r[metric] != null) all.push({ value: r[metric] as number, model: r.model, container: "A" })
  }
  for (const r of data.containerB?.results ?? []) {
    if (r[metric] != null) all.push({ value: r[metric] as number, model: r.model, container: "B" })
  }
  if (!all.length) return null
  return all.reduce((best, cur) => (higher ? cur.value > best.value : cur.value < best.value) ? cur : best)
}

export function MetricCards({ data }: Props) {
  const bestAcc = bestModel(data, "accuracy", true)
  const bestRecall = bestModel(data, "recall", true)
  const bestInf = bestModel(data, "inference_time_ms", false)
  const bestCpu = bestModel(data, "cpu_util_pct", false)

  const containerColor = (c: string) => c === "A"
    ? "bg-blue-500/15 text-blue-400 border-blue-500/20"
    : "bg-violet-500/15 text-violet-400 border-violet-500/20"

  const cards = [
    { icon: TrendingUp, label: "Best Accuracy", best: bestAcc, fmt: (v: number) => `${(v * 100).toFixed(1)}%`, color: "text-blue-400" },
    { icon: Target, label: "Best Recall", best: bestRecall, fmt: (v: number) => `${(v * 100).toFixed(1)}%`, color: "text-violet-400" },
    { icon: Zap, label: "Fastest Inference", best: bestInf, fmt: (v: number) => `${v.toFixed(1)} ms/img`, color: "text-teal-400" },
    { icon: Cpu, label: "Lowest CPU Usage", best: bestCpu, fmt: (v: number) => `${v.toFixed(1)}%`, color: "text-amber-400" },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map(({ icon: Icon, label, best, fmt, color }) => (
        <Card key={label} className="bg-card border-border">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <Icon className={`h-3.5 w-3.5 ${color}`} />
              {label}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {best ? (
              <>
                <p className={`text-2xl font-semibold tabular-nums ${color}`}>{fmt(best.value)}</p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <Badge variant="outline" className={`text-xs px-1.5 py-0 ${containerColor(best.container)}`}>
                    {best.container === "A" ? "Lightweight" : "Advanced"}
                  </Badge>
                  <span className="text-xs text-muted-foreground truncate">{best.model}</span>
                </div>
              </>
            ) : (
              <p className="text-2xl font-semibold text-muted-foreground">—</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
