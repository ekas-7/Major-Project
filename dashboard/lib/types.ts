export interface FoldDetail {
  fold: number
  accuracy: number
  auc: number
  recall: number
  inference_time_ms: number
  cpu_util_pct: number
}

export interface ModelResult {
  model: string
  accuracy: number
  auc: number | null
  recall: number
  inference_time_ms: number
  cpu_util_pct: number
  fold_details?: FoldDetail[]
}

export interface ContainerMetrics {
  container: string
  pipeline: "lightweight" | "advanced"
  preprocessing: {
    clahe: boolean
    colorspace: "RGB" | "CIELAB"
    se_blocks: boolean
  }
  training: {
    strategy: "train_test_split" | "kfold"
    k?: number
    test_size?: number
    epochs: number
    early_stopping: boolean
  }
  completed_at: string
  dataset: {
    total_images: number
    anemic: number
    healthy: number
  }
  results: ModelResult[]
}

export interface ComparisonData {
  containerA: ContainerMetrics | null
  containerB: ContainerMetrics | null
  lastFetched: string
}
