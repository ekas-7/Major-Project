"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import type { ComparisonData, ModelResult } from "@/lib/types"

interface Props {
  data: ComparisonData
}

interface Row extends ModelResult {
  container: "A" | "B"
  pipelineLabel: string
}

function bestValues(rows: Row[]) {
  const best: Partial<Record<keyof ModelResult, number>> = {}
  const higher: (keyof ModelResult)[] = ["accuracy", "auc", "recall"]
  const lower: (keyof ModelResult)[] = ["inference_time_ms", "cpu_util_pct"]
  for (const k of higher) {
    const vals = rows.map((r) => r[k] as number).filter((v) => v != null)
    if (vals.length) best[k] = Math.max(...vals)
  }
  for (const k of lower) {
    const vals = rows.map((r) => r[k] as number).filter((v) => v != null)
    if (vals.length) best[k] = Math.min(...vals)
  }
  return best
}

export function ModelComparisonTable({ data }: Props) {
  const rows: Row[] = [
    ...(data.containerA?.results ?? []).map((r) => ({ ...r, container: "A" as const, pipelineLabel: "Lightweight" })),
    ...(data.containerB?.results ?? []).map((r) => ({ ...r, container: "B" as const, pipelineLabel: "Advanced" })),
  ]

  if (!rows.length) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
        Waiting for container results...
      </div>
    )
  }

  const best = bestValues(rows)

  const isBest = (key: keyof ModelResult, val: number | null) => {
    if (val == null || best[key] == null) return false
    return Math.abs((val as number) - (best[key] as number)) < 0.0001
  }

  const fmt = (v: number | null, pct = false) =>
    v == null ? <span className="text-muted-foreground">—</span> : pct ? `${(v * 100).toFixed(1)}%` : v.toFixed(4)

  return (
    <div className="rounded-md border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-border hover:bg-transparent">
            <TableHead className="text-muted-foreground text-xs w-36">Model</TableHead>
            <TableHead className="text-muted-foreground text-xs">Pipeline</TableHead>
            <TableHead className="text-muted-foreground text-xs text-right">Accuracy</TableHead>
            <TableHead className="text-muted-foreground text-xs text-right">AUC</TableHead>
            <TableHead className="text-muted-foreground text-xs text-right">Recall</TableHead>
            <TableHead className="text-muted-foreground text-xs text-right">Inf. (ms/img)</TableHead>
            <TableHead className="text-muted-foreground text-xs text-right">CPU %</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const borderColor = row.container === "A" ? "border-l-blue-500" : "border-l-violet-500"
            return (
              <TableRow
                key={`${row.container}-${row.model}`}
                className={`border-border border-l-2 ${borderColor} hover:bg-white/[0.02]`}
              >
                <TableCell className="font-mono text-xs py-3">{row.model}</TableCell>
                <TableCell className="py-3">
                  <Badge
                    variant="outline"
                    className={`text-xs px-1.5 py-0 ${
                      row.container === "A"
                        ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                        : "bg-violet-500/10 text-violet-400 border-violet-500/20"
                    }`}
                  >
                    {row.pipelineLabel}
                  </Badge>
                </TableCell>
                <TableCell className={`text-right text-xs tabular-nums py-3 ${isBest("accuracy", row.accuracy) ? "text-emerald-400 font-semibold" : ""}`}>
                  {fmt(row.accuracy, true)}
                </TableCell>
                <TableCell className={`text-right text-xs tabular-nums py-3 ${isBest("auc", row.auc) ? "text-emerald-400 font-semibold" : ""}`}>
                  {fmt(row.auc)}
                </TableCell>
                <TableCell className={`text-right text-xs tabular-nums py-3 ${isBest("recall", row.recall) ? "text-emerald-400 font-semibold" : ""}`}>
                  {fmt(row.recall, true)}
                </TableCell>
                <TableCell className={`text-right text-xs tabular-nums py-3 ${isBest("inference_time_ms", row.inference_time_ms) ? "text-emerald-400 font-semibold" : ""}`}>
                  {row.inference_time_ms?.toFixed(2) ?? "—"}
                </TableCell>
                <TableCell className={`text-right text-xs tabular-nums py-3 ${isBest("cpu_util_pct", row.cpu_util_pct) ? "text-emerald-400 font-semibold" : ""}`}>
                  {row.cpu_util_pct?.toFixed(1) ?? "—"}%
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
