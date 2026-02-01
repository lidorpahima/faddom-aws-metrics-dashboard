import {
  CloudWatchClient,
  GetMetricDataCommand,
  type MetricDataResult,
} from '@aws-sdk/client-cloudwatch'
import { config } from '../config.js'

const client = new CloudWatchClient({
  region: config.aws.region,
  credentials: {
    accessKeyId: config.aws.accessKeyId,
    secretAccessKey: config.aws.secretAccessKey,
  },
})

/** CloudWatch period in seconds for each interval key */
const PERIOD_MAP: Record<string, number> = {
  '1m': 60,
  '5m': 300,
  '15m': 900,
  '1h': 3600,
}

/** Time range in ms for each timePeriod key */
const RANGE_MS: Record<string, number> = {
  '1h': 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
}

/** CloudWatch maximum datapoints per query */
const MAX_DATAPOINTS = 1440

/** Maximum concurrent requests to avoid throttling */
const MAX_CONCURRENT_REQUESTS = 5

/** Maximum number of retries for failed requests */
const MAX_RETRIES = 3

/** Base delay for exponential backoff (ms) */
const BASE_BACKOFF_MS = 200

export interface CpuDataPoint {
  time: string
  cpu: number
  timestamp: number
}

export interface MetricResponse {
  data: CpuDataPoint[]
  adjustedInterval?: string
}

/**
 * Sleep utility for delays between requests
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Calculates how many queries we need to split the request into.
 * If datapoints <= MAX_DATAPOINTS, returns 1 (no split needed).
 * Otherwise, calculates how many chunks to split into.
 */
function calculateQueryChunks(rangeMs: number, periodSeconds: number): number {
  const rangeSeconds = rangeMs / 1000
  const estimatedDatapoints = Math.ceil(rangeSeconds / periodSeconds)
  
  if (estimatedDatapoints <= MAX_DATAPOINTS) {
    return 1
  }
  
  // Split into multiple queries, each with max MAX_DATAPOINTS
  // Use Math.ceil to ensure we cover the entire range
  return Math.ceil(estimatedDatapoints / MAX_DATAPOINTS)
}

/**
 * Fetches a single chunk with retry logic and exponential backoff using GetMetricData.
 * GetMetricData is more efficient than GetMetricStatistics for production workloads.
 * Handles throttling errors gracefully.
 */
async function fetchChunkWithRetry(
  instanceId: string,
  chunkStart: Date,
  chunkEnd: Date,
  period: number,
  retryCount = 0
): Promise<MetricDataResult> {
  try {
    const command = new GetMetricDataCommand({
      StartTime: chunkStart,
      EndTime: chunkEnd,
      MetricDataQueries: [
        {
          Id: 'cpu_avg',
          MetricStat: {
            Metric: {
              Namespace: 'AWS/EC2',
              MetricName: 'CPUUtilization',
              Dimensions: [{ Name: 'InstanceId', Value: instanceId }],
            },
            Period: period,
            Stat: 'Average',
          },
        },
      ],
    })
    const response = await client.send(command)
    return response.MetricDataResults?.[0] ?? { Values: [], Timestamps: [] }
  } catch (error) {
    // Check if it's a throttling error (429 or rate limit error)
    const isThrottling = 
      (error as { statusCode?: number })?.statusCode === 429 ||
      (error as { name?: string })?.name === 'ThrottlingException' ||
      String(error).includes('throttl') ||
      String(error).includes('rate')
    
    if (isThrottling && retryCount < MAX_RETRIES) {
      // Exponential backoff: wait longer with each retry
      const backoffMs = BASE_BACKOFF_MS * Math.pow(2, retryCount)
      await sleep(backoffMs)
      return fetchChunkWithRetry(instanceId, chunkStart, chunkEnd, period, retryCount + 1)
    }
    
    // If not throttling or max retries reached, throw the error
    throw error
  }
}

/**
 * Processes concurrent requests with a limit to avoid overwhelming the API.
 * Returns results in the same order as the input chunks.
 */
async function fetchChunksConcurrently(
  instanceId: string,
  chunks: Array<{ start: Date; end: Date }>,
  period: number
): Promise<MetricDataResult[]> {
  const results: MetricDataResult[] = []
  
  // Process in batches of MAX_CONCURRENT_REQUESTS
  for (let i = 0; i < chunks.length; i += MAX_CONCURRENT_REQUESTS) {
    const batch = chunks.slice(i, i + MAX_CONCURRENT_REQUESTS)
    const batchResults = await Promise.all(
      batch.map(chunk => fetchChunkWithRetry(instanceId, chunk.start, chunk.end, period))
    )
    results.push(...batchResults)
  }
  
  return results
}

/**
 * Fetches EC2 CPU utilization from CloudWatch for the given instance.
 * Uses GetMetricData API (more efficient than GetMetricStatistics).
 *
 * Features:
 * - Automatically splits large time ranges into multiple queries to respect CloudWatch's 1440 datapoint limit
 * - Uses concurrent requests (up to 5 in parallel) for optimal performance while avoiding throttling
 * - Implements exponential backoff retry logic for throttling errors
 * - Automatic fallback: if 1-minute resolution returns no data (requires detailed monitoring), 
 *   automatically retries with 5-minute resolution and notifies user
 * - Accepts custom start/end dates for Delta API (custom history) or calculates from timePeriod presets
 */
export async function getCpuMetrics(
  instanceId: string,
  start: Date,
  end: Date,
  interval: keyof typeof PERIOD_MAP
): Promise<MetricResponse> {
  let period = PERIOD_MAP[interval] ?? 300
  const rangeMs = end.getTime() - start.getTime()
  let adjustedInterval: string | undefined
  
  // Try fetching with requested period first
  let metricResults = await fetchMetricsWithPeriod(instanceId, start, end, period, rangeMs)
  
  // Fallback: if 1-minute returns no data, automatically switch to 5-minute
  // Check if results contain actual data points (not just empty arrays)
  const hasData = metricResults.some(result => 
    (result.Values?.length ?? 0) > 0 || (result.Timestamps?.length ?? 0) > 0
  )
  
  if (!hasData && period === 60) {
    period = 300
    adjustedInterval = '5m'
    metricResults = await fetchMetricsWithPeriod(instanceId, start, end, period, rangeMs)
  }
  
  // Merge and process all metric results
  const allTimestamps: number[] = []
  const allValues: number[] = []
  
  // Collect all data points from all chunks
  for (const result of metricResults) {
    const timestamps = result.Timestamps ?? []
    const values = result.Values ?? []
    
    // Ensure we have matching arrays
    const length = Math.min(timestamps.length, values.length)
    for (let i = 0; i < length; i++) {
      const timestamp = timestamps[i]
      const value = values[i]
      
      // Only include valid timestamps within the requested range
      if (timestamp && timestamp.getTime && value !== undefined && value !== null) {
        const ts = timestamp.getTime()
        // Include all points within the requested range (with small buffer for rounding)
        if (ts >= start.getTime() - 1000 && ts <= end.getTime() + 1000) {
          allTimestamps.push(ts)
          allValues.push(value)
        }
      }
    }
  }
  
  // Create combined data points and sort by timestamp
  const dataPoints: Array<{ timestamp: number; cpu: number }> = []
  for (let i = 0; i < allTimestamps.length; i++) {
    dataPoints.push({ timestamp: allTimestamps[i], cpu: allValues[i] })
  }
  
  // Remove duplicates and sort by timestamp
  const seen = new Set<number>()
  const uniqueDataPoints = dataPoints
    .filter(dp => {
      // Use timestamp as unique key (round to nearest second to handle minor differences)
      const roundedTs = Math.round(dp.timestamp / 1000) * 1000
      if (seen.has(roundedTs)) return false
      seen.add(roundedTs)
      return true
    })
    .sort((a, b) => a.timestamp - b.timestamp)

  // Infer the *effective* resolution from the data itself.
  // This is important for cases where the user requested 1m, but the instance
  // only has 5m basic monitoring, so CloudWatch returns points ~5 minutes apart.
  if (!adjustedInterval && interval === '1m' && uniqueDataPoints.length > 1) {
    const gaps: number[] = []
    for (let i = 1; i < uniqueDataPoints.length; i++) {
      const deltaSec = (uniqueDataPoints[i].timestamp - uniqueDataPoints[i - 1].timestamp) / 1000
      if (deltaSec > 0) {
        gaps.push(deltaSec)
      }
    }
    if (gaps.length > 0) {
      const minGap = Math.min(...gaps)
      // If the minimum gap between points is closer to 5 minutes than 1 minute,
      // treat this as basic 5m monitoring and surface it back to the UI.
      if (minGap >= 240) {
        adjustedInterval = '5m'
      }
    }
  }
 
  // Format for frontend
  const formattedData = uniqueDataPoints.map((dp) => ({
    time: new Date(dp.timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    }),
    cpu: dp.cpu,
    timestamp: dp.timestamp,
  }))
  
  return {
    data: formattedData,
    adjustedInterval,
  }
}

/**
 * Fetches metrics for a given period, handling chunking and concurrent requests.
 */
async function fetchMetricsWithPeriod(
  instanceId: string,
  start: Date,
  end: Date,
  period: number,
  rangeMs: number
): Promise<MetricDataResult[]> {
  // Calculate if we need to split into multiple queries
  const numChunks = calculateQueryChunks(rangeMs, period)
  
  if (numChunks === 1) {
    // Single query - simple case
    const result = await fetchChunkWithRetry(instanceId, start, end, period)
    return [result]
  } else {
    // Multiple queries - split time range into chunks
    // Calculate chunk duration: MAX_DATAPOINTS points * period in seconds * 1000 for ms
    const chunkDurationMs = MAX_DATAPOINTS * period * 1000
    const chunks: Array<{ start: Date; end: Date }> = []
    
    const startTime = start.getTime()
    const endTime = end.getTime()
    let currentStart = startTime
    
    // Split the range into chunks, ensuring complete coverage
    while (currentStart < endTime) {
      const chunkEndTime = Math.min(currentStart + chunkDurationMs, endTime)
      
      // Only create chunk if it has valid duration
      if (chunkEndTime > currentStart) {
        chunks.push({ 
          start: new Date(currentStart), 
          end: new Date(chunkEndTime) 
        })
      }
      
      // Move to next chunk start (chunks can overlap slightly to ensure no gaps)
      // CloudWatch handles overlapping queries correctly
      currentStart = chunkEndTime
      
      // Safety check to prevent infinite loops
      if (chunkEndTime >= endTime) {
        break
      }
    }
    
    // Ensure we always have at least one chunk covering the full range
    if (chunks.length === 0) {
      chunks.push({ start, end })
    } else {
      // Ensure the last chunk covers exactly to the end time
      const lastChunk = chunks[chunks.length - 1]
      if (lastChunk.end.getTime() < endTime) {
        chunks[chunks.length - 1] = { start: lastChunk.start, end }
      }
    }
    
    // Fetch chunks concurrently with controlled parallelism
    return await fetchChunksConcurrently(instanceId, chunks, period)
  }
}
