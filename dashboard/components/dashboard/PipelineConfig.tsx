"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { ContainerMetrics } from "@/lib/types"
import { CheckCircle2, XCircle } from "lucide-react"

interface Props {
  containerA: ContainerMetrics | null
  containerB: ContainerMetrics | null
}

const BoolIcon = ({ val }: { val: boolean }) =>
  val ? (
    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
  ) : (
    <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
  )

function ConfigRow({ label, a, b }: { label: string; a: React.ReactNode; b: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 py-2 border-b border-border last:border-0 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="flex items-center gap-1.5">{a}</span>
      <span className="flex items-center gap-1.5">{b}</span>
    </div>
  )
}

export function PipelineConfig({ containerA, containerB }: Props) {
  return (
    <Card className="bg-card border-border">
      <CardHeader className="pt-4 pb-2 px-4">
        <CardTitle className="text-sm font-medium">Pipeline Configuration</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="grid grid-cols-3 pb-2 border-b border-border mb-1 text-xs font-medium">
          <span className="text-muted-foreground">Setting</span>
          <Badge variant="outline" className="text-xs w-fit bg-blue-500/10 text-blue-400 border-blue-500/20">Container A</Badge>
          <Badge variant="outline" className="text-xs w-fit bg-violet-500/10 text-violet-400 border-violet-500/20">Container B</Badge>
        </div>
        <ConfigRow
          label="Color Space"
          a={<span className="text-foreground">{containerA?.preprocessing.colorspace ?? "—"}</span>}
          b={<span className="text-foreground">{containerB?.preprocessing.colorspace ?? "—"}</span>}
        />
        <ConfigRow
          label="CLAHE Enhancement"
          a={containerA ? <BoolIcon val={containerA.preprocessing.clahe} /> : <span className="text-muted-foreground">—</span>}
          b={containerB ? <BoolIcon val={containerB.preprocessing.clahe} /> : <span className="text-muted-foreground">—</span>}
        />
        <ConfigRow
          label="SE Blocks"
          a={containerA ? <BoolIcon val={containerA.preprocessing.se_blocks ?? false} /> : <span className="text-muted-foreground">—</span>}
          b={containerB ? <BoolIcon val={containerB.preprocessing.se_blocks ?? false} /> : <span className="text-muted-foreground">—</span>}
        />
        <ConfigRow
          label="Training Strategy"
          a={<span className="text-foreground capitalize">{containerA?.training.strategy?.replace("_", " ") ?? "—"}</span>}
          b={<span className="text-foreground capitalize">{containerB?.training.strategy?.replace("_", " ") ?? "—"}</span>}
        />
        <ConfigRow
          label="Epochs"
          a={<span className="text-foreground">{containerA?.training.epochs ?? "—"}</span>}
          b={<span className="text-foreground">{containerB?.training.epochs ?? "—"}</span>}
        />
        <ConfigRow
          label="Early Stopping"
          a={containerA ? <BoolIcon val={containerA.training.early_stopping} /> : <span className="text-muted-foreground">—</span>}
          b={containerB ? <BoolIcon val={containerB.training.early_stopping} /> : <span className="text-muted-foreground">—</span>}
        />
        <ConfigRow
          label="K-Folds"
          a={<span className="text-muted-foreground">N/A</span>}
          b={<span className="text-foreground">{containerB?.training.k ?? "—"}</span>}
        />
        <ConfigRow
          label="Dataset Size"
          a={<span className="text-foreground">{containerA?.dataset.total_images ?? "—"} imgs</span>}
          b={<span className="text-foreground">{containerB?.dataset.total_images ?? "—"} imgs</span>}
        />
      </CardContent>
    </Card>
  )
}
