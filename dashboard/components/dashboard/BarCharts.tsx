"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { ComparisonData } from "@/lib/types"

interface Props {
  data: ComparisonData
}

const TOOLTIP_STYLE = {
  backgroundColor: "oklch(0.12 0 0)",
  border: "1px solid oklch(1 0 0 / 8%)",
  borderRadius: "6px",
  color: "oklch(0.95 0 0)",
  fontSize: "12px",
}

function buildChartData(data: ComparisonData, metric: string) {
  const allModels = new Set<string>()
  for (const r of [...(data.containerA?.results ?? []), ...(data.containerB?.results ?? [])]) {
    allModels.add(r.model)
  }
  return Array.from(allModels).map((model) => {
    const a = data.containerA?.results.find((r) => r.model === model)
    const b = data.containerB?.results.find((r) => r.model === model)
    return {
      model: model.replace("_", " "),
      "Container A": a ? Number((a as unknown as Record<string, unknown>)[metric]) : null,
      "Container B": b ? Number((b as unknown as Record<string, unknown>)[metric]) : null,
    }
  })
}

function PercentFormatter(value: number) {
  return `${(value * 100).toFixed(1)}%`
}

function MsFormatter(value: number) {
  return `${value.toFixed(1)}ms`
}

function CpuFormatter(value: number) {
  return `${value.toFixed(1)}%`
}

export function BarCharts({ data }: Props) {
  const charts = [
    {
      title: "Accuracy",
      metric: "accuracy",
      formatter: PercentFormatter,
      domain: [0, 1] as [number, number],
      refLine: 0.8,
      refLabel: "80% target",
    },
    {
      title: "Recall (Sensitivity)",
      metric: "recall",
      formatter: PercentFormatter,
      domain: [0, 1] as [number, number],
      refLine: 0.8,
      refLabel: "80% target",
    },
    {
      title: "Inference Time (ms/img)",
      metric: "inference_time_ms",
      formatter: MsFormatter,
      domain: undefined,
    },
    {
      title: "CPU Utilization (%)",
      metric: "cpu_util_pct",
      formatter: CpuFormatter,
      domain: [0, 100] as [number, number],
    },
  ]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {charts.map(({ title, metric, formatter, domain, refLine, refLabel }) => {
        const chartData = buildChartData(data, metric)
        return (
          <Card key={metric} className="bg-card border-border">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-medium text-foreground">{title}</CardTitle>
            </CardHeader>
            <CardContent className="px-2 pb-4">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 6%)" vertical={false} />
                  <XAxis
                    dataKey="model"
                    tick={{ fontSize: 10, fill: "oklch(0.55 0 0)" }}
                    tickLine={false}
                    axisLine={false}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                    height={40}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "oklch(0.55 0 0)" }}
                    tickLine={false}
                    axisLine={false}
                    domain={domain}
                    tickFormatter={formatter}
                    width={55}
                  />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(val) => [formatter(Number(val)), ""]}
                    cursor={{ fill: "oklch(1 0 0 / 4%)" }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                    formatter={(value) => <span style={{ color: "oklch(0.65 0 0)" }}>{value}</span>}
                  />
                  {refLine != null && (
                    <ReferenceLine
                      y={refLine}
                      stroke="oklch(0.65 0.18 250 / 40%)"
                      strokeDasharray="4 4"
                      label={{ value: refLabel, fill: "oklch(0.65 0.18 250)", fontSize: 9, position: "insideTopRight" }}
                    />
                  )}
                  <Bar dataKey="Container A" fill="oklch(0.65 0.18 250)" radius={[2, 2, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="Container B" fill="oklch(0.60 0.20 290)" radius={[2, 2, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
