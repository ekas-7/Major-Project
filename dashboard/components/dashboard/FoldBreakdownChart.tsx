"use client"

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
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

export function FoldBreakdownChart({ data }: Props) {
  const bResults = data.containerB?.results ?? []
  const modelsWithFolds = bResults.filter((r) => r.fold_details && r.fold_details.length > 0)

  if (!modelsWithFolds.length) {
    return (
      <Card className="bg-card border-border">
        <CardHeader className="pt-4 pb-2 px-4">
          <CardTitle className="text-sm font-medium">K-Fold Stability (Container B)</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-48 text-muted-foreground text-sm">
          Waiting for Container B results...
        </CardContent>
      </Card>
    )
  }

  const colors: Record<string, string> = {
    accuracy: "oklch(0.65 0.18 250)",
    auc: "oklch(0.60 0.20 290)",
    recall: "oklch(0.68 0.15 185)",
  }

  return (
    <div className="space-y-4">
      {modelsWithFolds.map((model) => {
        const chartData = (model.fold_details ?? []).map((f) => ({
          fold: `Fold ${f.fold}`,
          accuracy: f.accuracy,
          auc: f.auc,
          recall: f.recall,
        }))

        return (
          <Card key={model.model} className="bg-card border-border">
            <CardHeader className="pt-4 pb-2 px-4">
              <CardTitle className="text-sm font-medium">
                {model.model} — K-Fold Stability
              </CardTitle>
              <p className="text-xs text-muted-foreground">Per-fold metrics across 5 cross-validation splits</p>
            </CardHeader>
            <CardContent className="pb-4 px-2">
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 6%)" vertical={false} />
                  <XAxis
                    dataKey="fold"
                    tick={{ fontSize: 10, fill: "oklch(0.55 0 0)" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "oklch(0.55 0 0)" }}
                    tickLine={false}
                    axisLine={false}
                    domain={[0, 1]}
                    tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                    width={40}
                  />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(val) => [`${(Number(val) * 100).toFixed(1)}%`, ""]}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: "11px" }}
                    formatter={(v) => <span style={{ color: "oklch(0.65 0 0)" }}>{v}</span>}
                  />
                  <Line type="monotone" dataKey="accuracy" stroke={colors.accuracy} strokeWidth={2} dot={{ r: 3 }} name="Accuracy" />
                  <Line type="monotone" dataKey="auc" stroke={colors.auc} strokeWidth={2} dot={{ r: 3 }} name="AUC" />
                  <Line type="monotone" dataKey="recall" stroke={colors.recall} strokeWidth={2} dot={{ r: 3 }} name="Recall" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
