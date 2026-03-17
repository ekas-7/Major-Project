import useSWR from "swr"
import type { ComparisonData } from "@/lib/types"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function useMetrics() {
  const { data, error, isLoading } = useSWR<ComparisonData>(
    "/api/metrics",
    fetcher,
    { refreshInterval: 5000 }
  )
  return { data, error, isLoading }
}
