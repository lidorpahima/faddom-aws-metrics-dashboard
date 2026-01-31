import { Router, type Request, type Response } from 'express'
import { getCpuMetrics } from '../aws/cloudwatch.js'
import {
  getInstanceIdByPrivateIp,
  getInstanceDetails,
  getTerminationProtection,
  setTerminationProtection,
} from '../aws/ec2.js'
import { config } from '../config.js'

const router = Router()

const TIME_PERIODS = ['1h', '24h', '7d'] as const
const INTERVALS = ['1m', '5m', '15m', '1h'] as const

/**
 * Resolves an identifier (Instance ID or Private IP) to an Instance ID.
 */
async function resolveInstanceId(identifier: string): Promise<string | undefined> {
  const trimmed = identifier.trim()
  if (trimmed.startsWith('i-')) return trimmed
  return await getInstanceIdByPrivateIp(trimmed)
}

/** CloudWatch retention: 1-minute resolution data retained for 15 days */
const RETENTION_1M_MS = 15 * 24 * 60 * 60 * 1000
/** CloudWatch retention: 1-hour (and longer) resolution data retained for 455 days */
const RETENTION_1H_MS = 455 * 24 * 60 * 60 * 1000

/**
 * GET /api/metrics/cpu
 * Query params:
 *   - instanceId (required) – EC2 Instance ID (i-xxx) or private IP
 *   - timePeriod (optional) – Preset: '1h'|'24h'|'7d' (relative to now)
 *   - startTime (optional) – Custom start timestamp in ms
 *   - endTime (optional) – Custom end timestamp in ms
 *   - interval (optional) – '1m'|'5m'|'15m'|'1h' (default: '5m')
 * 
 * Logic:
 *   - If startTime & endTime provided: Use custom range (Delta API)
 *   - If timePeriod provided: Calculate range relative to Date.now() (Presets)
 *   - If range > 15 days and interval=1m: Auto-adjust to 1h
 * 
 * Returns: { data: { time, cpu, timestamp }[], hint?: string, adjustedInterval?: string }
 */
router.get('/cpu', async (req: Request, res: Response) => {
  const identifier = (req.query.instanceId as string)?.trim()
  const timePeriod = req.query.timePeriod as string | undefined
  const startTimeParam = req.query.startTime as string | undefined
  const endTimeParam = req.query.endTime as string | undefined
  let interval = (req.query.interval as string) || '5m'

  if (!identifier) {
    res.status(400).json({ error: 'Missing query parameter: instanceId' })
    return
  }

  // Validate interval
  if (!INTERVALS.includes(interval as (typeof INTERVALS)[number])) {
    res.status(400).json({
      error: `Invalid interval. Use one of: ${INTERVALS.join(', ')}`,
    })
    return
  }

  // Determine time range: Custom (startTime/endTime) vs Preset (timePeriod)
  let start: Date
  let end: Date

  let requestedStartMs: number | undefined
  if (startTimeParam && endTimeParam) {
    // Custom History (Delta API) - use exact timestamps
    const startMs = parseInt(startTimeParam, 10)
    const endMs = parseInt(endTimeParam, 10)
    
    if (isNaN(startMs) || isNaN(endMs) || startMs >= endMs) {
      res.status(400).json({
        error: 'Invalid startTime/endTime: must be valid timestamps in ms, startTime < endTime',
      })
      return
    }
    
    requestedStartMs = startMs
    start = new Date(startMs)
    end = new Date(endMs)
  } else if (timePeriod) {
    // Presets - calculate relative to now
    if (!TIME_PERIODS.includes(timePeriod as (typeof TIME_PERIODS)[number])) {
      res.status(400).json({
        error: `Invalid timePeriod. Use one of: ${TIME_PERIODS.join(', ')}`,
      })
      return
    }
    
    const RANGE_MS: Record<string, number> = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
    }
    
    const rangeMs = RANGE_MS[timePeriod] ?? RANGE_MS['24h']
    end = new Date(Date.now() - 5 * 60 * 1000) // 5 min in past for CloudWatch ingestion
    start = new Date(end.getTime() - rangeMs)
  } else {
    res.status(400).json({
      error: 'Must provide either timePeriod (preset) or both startTime and endTime (custom range)',
    })
    return
  }

  // Strict retention: clamp start to 455 days ago (1h retention limit)
  const nowMs = Date.now()
  const oldestAllowedStart = nowMs - RETENTION_1H_MS
  let warning: string | undefined
  if (start.getTime() < oldestAllowedStart) {
    start = new Date(oldestAllowedStart)
    warning = `Requested date was too old. Showing data from ${start.toISOString().slice(0, 10)} instead.`
  }
  // If start is older than 15 days, 1m resolution is not available → force 1h
  if (start.getTime() < nowMs - RETENTION_1M_MS && interval === '1m') {
    interval = '1h'
  }

  let instanceId: string
  if (identifier.startsWith('i-')) {
    instanceId = identifier
  } else {
    const resolved = await resolveInstanceId(identifier)
    if (!resolved) {
      res.status(404).json({
        error: `No EC2 instance found for IP ${identifier} in region ${config.aws.region}. Check IP and AWS_REGION.`,
      })
      return
    }
    instanceId = resolved
  }

  try {
    const [result, instanceDetails] = await Promise.all([
      getCpuMetrics(instanceId, start, end, interval as '1m' | '5m' | '15m' | '1h'),
      getInstanceDetails(instanceId),
    ])
    
    if (result.data.length === 0) {
      res.json({
        data: [],
        metadata: instanceDetails ? {
          actualStartTime: start.getTime(),
          instanceType: instanceDetails.instanceType,
          state: instanceDetails.state,
          region: config.aws.region,
          availabilityZone: instanceDetails.availabilityZone,
        } : undefined,
        hint: 'No CloudWatch data. Check: instance is running, AWS_REGION matches the instance region, and try interval 5m or 24h range (basic monitoring = 5 min).',
      })
      return
    }
    
    const actualStartTime = start.getTime()
    if (requestedStartMs !== undefined && requestedStartMs < actualStartTime && !warning) {
      warning = `Requested date was too old. Showing data from ${new Date(actualStartTime).toISOString().slice(0, 10)} instead.`
    }
    
    const response: {
      data: typeof result.data
      metadata: {
        actualStartTime: number
        instanceType: string
        state: string
        region: string
        availabilityZone: string
      }
      hint?: string
      adjustedInterval?: string
      warning?: string
    } = {
      data: result.data,
      metadata: {
        actualStartTime,
        instanceType: instanceDetails?.instanceType ?? 'unknown',
        state: instanceDetails?.state ?? 'unknown',
        region: config.aws.region,
        availabilityZone: instanceDetails?.availabilityZone ?? 'unknown',
      },
    }
    
    if (result.adjustedInterval) {
      response.adjustedInterval = result.adjustedInterval
      response.hint = `1-minute resolution requires detailed monitoring (paid). Showing ${result.adjustedInterval} data instead.`
    }
    if (warning) response.warning = warning
    
    res.json(response)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch metrics'
    const isAws = message.includes('AWS') || message.includes('CloudWatch') || (err as { name?: string })?.name === 'CredentialsError'
    res.status(isAws ? 502 : 500).json({ error: message })
  }
})

/**
 * GET /api/metrics/termination-protection
 * Query params:
 *   - instanceId (required) – EC2 Instance ID (i-xxx) or private IP
 */
router.get('/termination-protection', async (req: Request, res: Response) => {
  const identifier = (req.query.instanceId as string)?.trim()
  if (!identifier) {
    res.status(400).json({ error: 'Missing query parameter: instanceId' })
    return
  }

  const instanceId = await resolveInstanceId(identifier)
  if (!instanceId) {
    res.status(404).json({
      error: `No EC2 instance found for ${identifier} in region ${config.aws.region}.`,
    })
    return
  }

  try {
    const enabled = await getTerminationProtection(instanceId)
    res.json({ instanceId, enabled })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to read termination protection'
    res.status(502).json({ error: message })
  }
})

/**
 * PUT /api/metrics/termination-protection
 * Body:
 *   - instanceId (required) – EC2 Instance ID (i-xxx) or private IP
 *   - enabled (required) – boolean
 */
router.put('/termination-protection', async (req: Request, res: Response) => {
  const identifier = (req.body?.instanceId as string | undefined)?.trim()
  const enabled = req.body?.enabled as boolean | undefined

  if (!identifier) {
    res.status(400).json({ error: 'Missing body field: instanceId' })
    return
  }
  if (typeof enabled !== 'boolean') {
    res.status(400).json({ error: 'Missing/invalid body field: enabled (boolean)' })
    return
  }

  const instanceId = await resolveInstanceId(identifier)
  if (!instanceId) {
    res.status(404).json({
      error: `No EC2 instance found for ${identifier} in region ${config.aws.region}.`,
    })
    return
  }

  try {
    await setTerminationProtection(instanceId, enabled)
    res.json({ instanceId, enabled })
  } catch (err: any) {
    const status = err?.$metadata?.httpStatusCode
    const name = err?.name
    const code = err?.Code || err?.code

    const isForbidden =
      status === 403 ||
      name === 'UnauthorizedOperation' ||
      name === 'AccessDeniedException' ||
      code === 'UnauthorizedOperation' ||
      code === 'AccessDeniedException' ||
      String(err?.message || '').toLowerCase().includes('not authorized') ||
      String(err?.message || '').toLowerCase().includes('access denied')

    if (isForbidden) {
      res.status(403).json({
        error: 'This action is blocked in the test environment. The provided IAM user does not allow ec2:ModifyInstanceAttribute, so termination protection cannot be toggled.',
        requiredAction: 'ec2:ModifyInstanceAttribute',
        instanceId,
        enabledRequested: enabled,
      })
      return
    }

    const message = err instanceof Error ? err.message : 'Failed to update termination protection'
    res.status(502).json({ error: message })
  }
})

export default router
