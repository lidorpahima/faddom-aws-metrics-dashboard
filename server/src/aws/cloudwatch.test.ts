import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getCpuMetrics } from './cloudwatch.js'

const mockSend = vi.hoisted(() => vi.fn())

vi.mock('@aws-sdk/client-cloudwatch', () => ({
  CloudWatchClient: vi.fn(() => ({ send: mockSend })),
  GetMetricDataCommand: vi.fn((input: object) => ({ input })),
}))

beforeEach(() => {
  mockSend.mockReset()
})

describe('getCpuMetrics', () => {
  it('should return formatted CPU data when CloudWatch returns valid results', async () => {
    const now = new Date()
    const ts1 = new Date(now.getTime() - 300000)
    const ts2 = new Date(now.getTime() - 600000)
    mockSend.mockResolvedValue({
      MetricDataResults: [
        {
          Timestamps: [ts1, ts2],
          Values: [45.5, 62.3],
        },
      ],
    })

    const result = await getCpuMetrics(
      'i-0123456789abcdef0',
      new Date(now.getTime() - 3600000),
      now,
      '5m'
    )

    expect(result.data).toHaveLength(2)
    expect(result.data[0]).toMatchObject({
      cpu: 62.3,
      timestamp: ts2.getTime(),
    })
    expect(result.data[1]).toMatchObject({
      cpu: 45.5,
      timestamp: ts1.getTime(),
    })
    expect(result.data[0].time).toMatch(/\d{1,2}:\d{2}\s*(AM|PM)/)
  })

  it('should sort data points by timestamp ascending', async () => {
    const base = Date.now()
    const timestamps = [
      new Date(base + 600000),
      new Date(base),
      new Date(base + 300000),
    ]
    mockSend.mockResolvedValue({
      MetricDataResults: [
        {
          Timestamps: timestamps,
          Values: [10, 20, 30],
        },
      ],
    })

    const result = await getCpuMetrics(
      'i-xxx',
      new Date(base - 3600000),
      new Date(base + 7200000),
      '5m'
    )

    expect(result.data.map((d) => d.timestamp)).toEqual([base, base + 300000, base + 600000])
    expect(result.data.map((d) => d.cpu)).toEqual([20, 30, 10])
  })

  it('should remove duplicate timestamps', async () => {
    const ts = new Date()
    mockSend.mockResolvedValue({
      MetricDataResults: [
        {
          Timestamps: [ts, ts, ts],
          Values: [10, 20, 30],
        },
      ],
    })

    const result = await getCpuMetrics('i-xxx', new Date(ts.getTime() - 60000), new Date(ts.getTime() + 60000), '1m')

    expect(result.data).toHaveLength(1)
    expect(result.data[0].cpu).toBe(10)
  })

  it('should skip data points with invalid timestamp (0)', async () => {
    mockSend.mockResolvedValue({
      MetricDataResults: [
        {
          Timestamps: [new Date(0), new Date(1000)],
          Values: [99, 50],
        },
      ],
    })

    const result = await getCpuMetrics('i-xxx', new Date(0), new Date(2000), '1m')

    expect(result.data).toHaveLength(1)
    expect(result.data[0].timestamp).toBe(1000)
  })

  it('should fallback to 5m interval when 1m returns no data', async () => {
    mockSend
      .mockResolvedValueOnce({
        MetricDataResults: [{ Timestamps: [], Values: [] }],
      })
      .mockResolvedValueOnce({
        MetricDataResults: [
          {
            Timestamps: [new Date(1000)],
            Values: [75],
          },
        ],
      })

    const result = await getCpuMetrics('i-xxx', new Date(0), new Date(60000), '1m')

    expect(result.data).toHaveLength(1)
    expect(result.data[0].cpu).toBe(75)
    expect(result.adjustedInterval).toBe('5m')
    expect(mockSend).toHaveBeenCalledTimes(2)
  })

  it('should detect basic 5m monitoring and set adjustedInterval when 1m requested', async () => {
    const base = Date.now()
    const fiveMin = 5 * 60 * 1000
    mockSend.mockResolvedValue({
      MetricDataResults: [
        {
          Timestamps: [
            new Date(base),
            new Date(base + fiveMin),
            new Date(base + 2 * fiveMin),
          ],
          Values: [10, 20, 30],
        },
      ],
    })

    const result = await getCpuMetrics(
      'i-xxx',
      new Date(base - 3600000),
      new Date(base + 7200000),
      '1m'
    )

    expect(result.adjustedInterval).toBe('5m')
  })

  it('should use 5m period for unknown interval key', async () => {
    mockSend.mockResolvedValue({
      MetricDataResults: [
        { Timestamps: [new Date(1000)], Values: [50] },
      ],
    })

    const result = await getCpuMetrics('i-xxx', new Date(0), new Date(10000), 'invalid' as '1m')

    expect(result.data).toHaveLength(1)
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          MetricDataQueries: expect.arrayContaining([
            expect.objectContaining({
              MetricStat: expect.objectContaining({
                Period: 300,
              }),
            }),
          ]),
        }),
      })
    )
  })

  it('should handle empty MetricDataResults', async () => {
    mockSend.mockResolvedValue({ MetricDataResults: [] })

    const result = await getCpuMetrics('i-xxx', new Date(0), new Date(60000), '5m')

    expect(result.data).toEqual([])
    expect(result.adjustedInterval).toBeUndefined()
  })

  it('should handle null Timestamps/Values in result', async () => {
    mockSend.mockResolvedValue({
      MetricDataResults: [{ Timestamps: null, Values: null }],
    })

    const result = await getCpuMetrics('i-xxx', new Date(0), new Date(60000), '5m')

    expect(result.data).toEqual([])
  })

  it('should retry on throttling error with exponential backoff', async () => {
    const throttlingError = Object.assign(new Error('Rate exceeded'), {
      statusCode: 429,
      name: 'ThrottlingException',
    })
    mockSend
      .mockRejectedValueOnce(throttlingError)
      .mockResolvedValueOnce({
        MetricDataResults: [{ Timestamps: [new Date(1000)], Values: [42] }],
      })

    const result = await getCpuMetrics('i-xxx', new Date(0), new Date(60000), '5m')

    expect(result.data).toHaveLength(1)
    expect(mockSend).toHaveBeenCalledTimes(2)
  })

  it('should throw after max retries on throttling', async () => {
    const throttlingError = Object.assign(new Error('Rate exceeded'), {
      statusCode: 429,
    })
    mockSend.mockRejectedValue(throttlingError)

    await expect(
      getCpuMetrics('i-xxx', new Date(0), new Date(60000), '5m')
    ).rejects.toThrow('Rate exceeded')

    expect(mockSend).toHaveBeenCalledTimes(4)
  })

  it('should propagate non-throttling errors immediately', async () => {
    mockSend.mockRejectedValue(new Error('Invalid instance ID'))

    await expect(
      getCpuMetrics('i-invalid', new Date(0), new Date(60000), '5m')
    ).rejects.toThrow('Invalid instance ID')

    expect(mockSend).toHaveBeenCalledTimes(1)
  })
})
