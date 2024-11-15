import React from 'react'
import { MIMetrics as MIMetricsType } from "@/types"

interface MIMetricsProps {
  metrics: MIMetricsType;
}

export function MIMetrics({ metrics }: MIMetricsProps) {
  return (
    <div>
      <h2>MI Metrics</h2>
      <pre>{JSON.stringify(metrics, null, 2)}</pre>
    </div>
  )
}