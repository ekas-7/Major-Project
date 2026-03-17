"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { ContainerStatusBadge } from "@/components/dashboard/ContainerStatusBadge"
import { MetricCards } from "@/components/dashboard/MetricCards"
import { ModelComparisonTable } from "@/components/dashboard/ModelComparisonTable"
import { BarCharts } from "@/components/dashboard/BarCharts"
import { RadarChart } from "@/components/dashboard/RadarChart"
import { FoldBreakdownChart } from "@/components/dashboard/FoldBreakdownChart"
import { PipelineConfig } from "@/components/dashboard/PipelineConfig"
import { useMetrics } from "@/hooks/useMetrics"
import type { ComparisonData } from "@/lib/types"
import { Activity, RefreshCw } from "lucide-react"

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-white/5 ${className}`} />
}

function WinnerCallout({ data }: { data: ComparisonData }) {
  const metricsA = data.containerA!.results
  const metricsB = data.containerB!.results

  const avgA = (k: "accuracy" | "auc" | "recall") => {
    const vals = metricsA.map((r) => r[k]).filter((v) => v != null) as number[]
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0
  }
  const avgB = (k: "accuracy" | "auc" | "recall") => {
    const vals = metricsB.map((r) => r[k]).filter((v) => v != null) as number[]
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0
  }

  const wins = { A: [] as string[], B: [] as string[] }

  if (avgA("accuracy") > avgB("accuracy")) wins.A.push("Accuracy")
  else wins.B.push("Accuracy")

  if (avgA("auc") > avgB("auc")) wins.A.push("AUC")
  else wins.B.push("AUC")

  if (avgA("recall") > avgB("recall")) wins.A.push("Recall")
  else wins.B.push("Recall")

  const avgInfA = metricsA.reduce((s, r) => s + r.inference_time_ms, 0) / metricsA.length
  const avgInfB = metricsB.reduce((s, r) => s + r.inference_time_ms, 0) / metricsB.length
  if (avgInfA < avgInfB) wins.A.push("Speed")
  else wins.B.push("Speed")

  return (
    <div className="grid grid-cols-2 gap-3">
      {(["A", "B"] as const).map((c) => (
        <div
          key={c}
          className={`rounded-md border px-4 py-3 ${
            c === "A"
              ? "border-blue-500/25 bg-blue-500/5"
              : "border-violet-500/25 bg-violet-500/5"
          }`}
        >
          <p className={`text-xs font-medium mb-1 ${c === "A" ? "text-blue-400" : "text-violet-400"}`}>
            Container {c} — {c === "A" ? "Lightweight" : "Advanced"}
          </p>
          <p className="text-xs text-muted-foreground">
            Wins on:{" "}
            <span className="text-foreground">
              {wins[c].length ? wins[c].join(", ") : "no categories"}
            </span>
          </p>
        </div>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const { data, isLoading } = useMetrics()

  const lastFetched = data?.lastFetched
    ? new Date(data.lastFetched).toLocaleTimeString()
    : null

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity className="h-4 w-4 text-primary" />
            <span className="font-medium text-sm tracking-tight">Anemia Detection</span>
            <Separator orientation="vertical" className="h-4" />
            <span className="text-xs text-muted-foreground">Container Comparison</span>
          </div>
          <div className="flex items-center gap-4">
            <ContainerStatusBadge label="Container A" data={data?.containerA ?? null} />
            <ContainerStatusBadge label="Container B" data={data?.containerB ?? null} />
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <RefreshCw className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`} />
              {lastFetched && <span>{lastFetched}</span>}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* KPI Cards */}
        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
          </div>
        ) : data ? (
          <MetricCards data={data} />
        ) : null}

        <Tabs defaultValue="overview">
          <TabsList className="bg-card border border-border h-8">
            <TabsTrigger value="overview" className="text-xs h-6">Overview</TabsTrigger>
            <TabsTrigger value="charts" className="text-xs h-6">Charts</TabsTrigger>
            <TabsTrigger value="radar" className="text-xs h-6">Radar</TabsTrigger>
            <TabsTrigger value="folds" className="text-xs h-6">K-Fold Breakdown</TabsTrigger>
            <TabsTrigger value="config" className="text-xs h-6">Pipeline Config</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-4 space-y-4">
            <div>
              <h2 className="text-sm font-medium mb-1">All Models — Side by Side</h2>
              <p className="text-xs text-muted-foreground mb-3">
                Green highlights mark the best value per metric. Left border color indicates pipeline.
              </p>
              {isLoading ? (
                <Skeleton className="h-48 rounded-md" />
              ) : data ? (
                <ModelComparisonTable data={data} />
              ) : null}
            </div>

            {data?.containerA && data?.containerB && (
              <WinnerCallout data={data} />
            )}
          </TabsContent>

          {/* Charts Tab */}
          <TabsContent value="charts" className="mt-4">
            {isLoading ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-64 rounded-lg" />)}
              </div>
            ) : data ? (
              <BarCharts data={data} />
            ) : null}
          </TabsContent>

          {/* Radar Tab */}
          <TabsContent value="radar" className="mt-4">
            {isLoading ? (
              <Skeleton className="h-80 rounded-lg" />
            ) : data ? (
              <div className="max-w-2xl">
                <RadarChart data={data} />
              </div>
            ) : null}
          </TabsContent>

          {/* K-Fold Tab */}
          <TabsContent value="folds" className="mt-4">
            <p className="text-xs text-muted-foreground mb-4">
              Per-fold metrics from Container B&apos;s 5-Fold Cross-Validation. Shows training stability across splits.
            </p>
            {isLoading ? (
              <Skeleton className="h-64 rounded-lg" />
            ) : data ? (
              <FoldBreakdownChart data={data} />
            ) : null}
          </TabsContent>

          {/* Config Tab */}
          <TabsContent value="config" className="mt-4">
            <div className="max-w-2xl">
              {isLoading ? (
                <Skeleton className="h-72 rounded-lg" />
              ) : (
                <PipelineConfig
                  containerA={data?.containerA ?? null}
                  containerB={data?.containerB ?? null}
                />
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
