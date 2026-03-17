"use client"

import { Badge } from "@/components/ui/badge"
import type { ContainerMetrics } from "@/lib/types"

interface Props {
  label: string
  data: ContainerMetrics | null
}

export function ContainerStatusBadge({ label, data }: Props) {
  if (!data) {
    return (
      <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
        </span>
        <span className="text-xs text-muted-foreground">{label}</span>
        <Badge variant="outline" className="text-xs border-border text-muted-foreground">Pending</Badge>
      </div>
    )
  }

  const ts = new Date(data.completed_at)
  const relTime = Math.round((Date.now() - ts.getTime()) / 60000)
  const timeStr = relTime < 1 ? "just now" : relTime < 60 ? `${relTime}m ago` : `${Math.round(relTime / 60)}h ago`

  return (
    <div className="flex items-center gap-2">
      <span className="relative flex h-2 w-2">
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
      </span>
      <span className="text-xs text-muted-foreground">{label}</span>
      <Badge className="text-xs bg-emerald-500/15 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20">
        Complete
      </Badge>
      <span className="text-xs text-muted-foreground">{timeStr}</span>
    </div>
  )
}
