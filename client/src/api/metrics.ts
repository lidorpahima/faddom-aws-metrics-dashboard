/**
 * Metrics API – calls backend for real CloudWatch CPU data.
 */

/** CloudWatch 1h retention limit: oldest allowed start (ms ago). Use for date picker min. */
export const RETENTION_1H_MS = 455 * 24 * 60 * 60 * 1000

/** Max time range (in days) per interval – CloudWatch retention (each resolution has its own limit). */
export const INTERVAL_MAX_DAYS: Record<string, number> = {
  '1m': 15,
  '5m': 63,
  '15m': 63,
  '1h': 455,
}

/** Human-readable label per interval for UI. */
export const INTERVAL_LABELS: Record<string, string> = {
  '1m': '1 minute',
  '5m': '5 minutes',
  '15m': '15 minutes',
  '1h': '1 hour',
}

export interface CpuDataPoint {
  time: string
  cpu: number
  timestamp: number
}

export interface MetricsMetadata {
  actualStartTime: number
  instanceType: string
  state: string
  region: string
  availabilityZone: string
}

export interface CpuMetricsResponse {
  data: CpuDataPoint[]
  metadata?: MetricsMetadata
  hint?: string
  adjustedInterval?: string
  warning?: string
}

/**
 * Fetches CPU metrics for an EC2 instance from the backend (CloudWatch).
 * Returns { data, hint, adjustedInterval }. 
 * - If data is empty, hint may explain why (e.g. wrong region, use 5m interval).
 * - If adjustedInterval is set, the backend automatically adjusted the interval (e.g., 1m -> 5m).
 * 
 * @param instanceId - EC2 Instance ID or private IP
 * @param timePeriod - Optional preset: '1h'|'24h'|'7d' (relative to now)
 * @param interval - Sampling interval: '1m'|'5m'|'15m'|'1h'
 * @param startTime - Optional custom start timestamp in ms (Delta API)
 * @param endTime - Optional custom end timestamp in ms (Delta API)
 */
export async function fetchCpuMetrics(
  instanceId: string,
  timePeriod?: string,
  interval: string = '5m',
  startTime?: number,
  endTime?: number
): Promise<CpuMetricsResponse> {
  const params = new URLSearchParams({
    instanceId: instanceId.trim(),
    interval,
  })
  
  // Use custom range (Delta API) if provided, otherwise use preset
  if (startTime !== undefined && endTime !== undefined) {
    params.append('startTime', startTime.toString())
    params.append('endTime', endTime.toString())
  } else if (timePeriod) {
    params.append('timePeriod', timePeriod)
  }
  
  const res = await fetch(`/api/metrics/cpu?${params}`)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? `Request failed: ${res.status}`)
  }
  const json: CpuMetricsResponse = await res.json()
  return {
    data: json.data ?? [],
    metadata: json.metadata,
    hint: json.hint,
    adjustedInterval: json.adjustedInterval,
    warning: json.warning,
  }
}

/**
 * Fetches the termination protection status for an EC2 instance.
 */
export async function fetchTerminationProtection(instanceId: string): Promise<boolean> {
  const res = await fetch(`/api/metrics/termination-protection?instanceId=${encodeURIComponent(instanceId.trim())}`)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? `Request failed: ${res.status}`)
  }
  const json = await res.json()
  return !!json.enabled
}

/**
 * Updates the termination protection status for an EC2 instance.
 */
export async function updateTerminationProtection(instanceId: string, enabled: boolean): Promise<void> {
  const res = await fetch('/api/metrics/termination-protection', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ instanceId: instanceId.trim(), enabled }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? `Request failed: ${res.status}`)
  }
}
