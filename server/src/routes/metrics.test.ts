import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import { app } from '../index.js'
import * as cloudwatch from '../aws/cloudwatch.js'
import * as ec2 from '../aws/ec2.js'

vi.mock('../aws/cloudwatch.js')
vi.mock('../aws/ec2.js')

const mockGetCpuMetrics = vi.mocked(cloudwatch.getCpuMetrics)
const mockGetInstanceIdByPrivateIp = vi.mocked(ec2.getInstanceIdByPrivateIp)
const mockGetInstanceDetails = vi.mocked(ec2.getInstanceDetails)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/metrics/cpu', () => {
  describe('validation - instanceId', () => {
    it('should return 400 when instanceId is missing', async () => {
      const res = await request(app)
        .get('/api/metrics/cpu')
        .query({ timePeriod: '1h' })

      expect(res.status).toBe(400)
      expect(res.body).toEqual({ error: 'Missing query parameter: instanceId' })
      expect(mockGetCpuMetrics).not.toHaveBeenCalled()
    })

    it('should return 400 when instanceId is empty string', async () => {
      const res = await request(app)
        .get('/api/metrics/cpu')
        .query({ instanceId: '', timePeriod: '1h' })

      expect(res.status).toBe(400)
      expect(res.body.error).toContain('instanceId')
    })

    it('should return 400 when instanceId is whitespace only', async () => {
      const res = await request(app)
        .get('/api/metrics/cpu')
        .query({ instanceId: '   ', timePeriod: '1h' })

      expect(res.status).toBe(400)
    })
  })

  describe('validation - interval', () => {
    it('should return 400 when interval is invalid', async () => {
      const res = await request(app)
        .get('/api/metrics/cpu')
        .query({ instanceId: 'i-xxx', timePeriod: '1h', interval: '2h' })

      expect(res.status).toBe(400)
      expect(res.body.error).toMatch(/Invalid interval/)
      expect(res.body.error).toContain('1m')
      expect(mockGetCpuMetrics).not.toHaveBeenCalled()
    })

    it('should accept valid intervals: 1m, 5m, 15m, 1h', async () => {
      mockGetCpuMetrics.mockResolvedValue({ data: [] })
      mockGetInstanceDetails.mockResolvedValue(undefined)

      for (const interval of ['1m', '5m', '15m', '1h']) {
        vi.clearAllMocks()
        mockGetCpuMetrics.mockResolvedValue({ data: [] })
        mockGetInstanceDetails.mockResolvedValue(undefined)

        const res = await request(app)
          .get('/api/metrics/cpu')
          .query({ instanceId: 'i-xxx', timePeriod: '1h', interval })

        expect(res.status).toBe(200)
        expect(mockGetCpuMetrics).toHaveBeenCalledWith(
          'i-xxx',
          expect.any(Date),
          expect.any(Date),
          interval
        )
      }
    })

    it('should default to 5m when interval is omitted', async () => {
      mockGetCpuMetrics.mockResolvedValue({ data: [] })
      mockGetInstanceDetails.mockResolvedValue(undefined)

      const res = await request(app)
        .get('/api/metrics/cpu')
        .query({ instanceId: 'i-xxx', timePeriod: '1h' })

      expect(res.status).toBe(200)
      expect(mockGetCpuMetrics).toHaveBeenCalledWith(
        'i-xxx',
        expect.any(Date),
        expect.any(Date),
        '5m'
      )
    })
  })

  describe('validation - time range (preset)', () => {
    it('should return 400 when timePeriod is invalid', async () => {
      const res = await request(app)
        .get('/api/metrics/cpu')
        .query({ instanceId: 'i-xxx', timePeriod: '30d' })

      expect(res.status).toBe(400)
      expect(res.body.error).toMatch(/Invalid timePeriod/)
      expect(res.body.error).toContain('1h')
    })

    it('should accept valid timePeriod: 1h, 24h, 7d', async () => {
      mockGetCpuMetrics.mockResolvedValue({ data: [] })
      mockGetInstanceDetails.mockResolvedValue(undefined)

      for (const timePeriod of ['1h', '24h', '7d']) {
        const res = await request(app)
          .get('/api/metrics/cpu')
          .query({ instanceId: 'i-xxx', timePeriod })

        expect(res.status).toBe(200)
      }
    })
  })

  describe('validation - time range (custom)', () => {
    it('should return 400 when startTime/endTime are missing', async () => {
      const res = await request(app)
        .get('/api/metrics/cpu')
        .query({ instanceId: 'i-xxx' })

      expect(res.status).toBe(400)
      expect(res.body.error).toMatch(/timePeriod|startTime|endTime/)
    })

    it('should return 400 when only startTime provided', async () => {
      const res = await request(app)
        .get('/api/metrics/cpu')
        .query({
          instanceId: 'i-xxx',
          startTime: Date.now() - 3600000,
        })

      expect(res.status).toBe(400)
    })

    it('should return 400 when startTime >= endTime', async () => {
      const base = Date.now()
      const res = await request(app)
        .get('/api/metrics/cpu')
        .query({
          instanceId: 'i-xxx',
          startTime: base,
          endTime: base,
        })

      expect(res.status).toBe(400)
      expect(res.body.error).toMatch(/startTime.*endTime/)
    })

    it('should return 400 when startTime/endTime are invalid (NaN)', async () => {
      const res = await request(app)
        .get('/api/metrics/cpu')
        .query({
          instanceId: 'i-xxx',
          startTime: 'not-a-number',
          endTime: '123',
        })

      expect(res.status).toBe(400)
      expect(res.body.error).toMatch(/Invalid|timestamp/)
    })

    it('should accept valid custom startTime and endTime', async () => {
      const end = Date.now()
      const start = end - 3600000
      mockGetCpuMetrics.mockResolvedValue({
        data: [{ time: '12:00', cpu: 50, timestamp: start }],
      })
      mockGetInstanceDetails.mockResolvedValue({
        instanceType: 't3.micro',
        state: 'running',
        availabilityZone: 'us-east-1a',
      })

      const res = await request(app)
        .get('/api/metrics/cpu')
        .query({
          instanceId: 'i-xxx',
          startTime: start,
          endTime: end,
        })

      expect(res.status).toBe(200)
      expect(res.body.data).toHaveLength(1)
      expect(mockGetCpuMetrics).toHaveBeenCalledWith(
        'i-xxx',
        new Date(start),
        new Date(end),
        expect.any(String)
      )
    })
  })

  describe('instance resolution', () => {
    it('should use instanceId directly when it starts with i-', async () => {
      mockGetCpuMetrics.mockResolvedValue({ data: [] })
      mockGetInstanceDetails.mockResolvedValue(undefined)

      const res = await request(app)
        .get('/api/metrics/cpu')
        .query({ instanceId: 'i-0123456789abcdef0', timePeriod: '1h' })

      expect(res.status).toBe(200)
      expect(mockGetInstanceIdByPrivateIp).not.toHaveBeenCalled()
      expect(mockGetCpuMetrics).toHaveBeenCalledWith(
        'i-0123456789abcdef0',
        expect.any(Date),
        expect.any(Date),
        expect.any(String)
      )
    })

    it('should resolve private IP to instance ID via getInstanceIdByPrivateIp', async () => {
      mockGetInstanceIdByPrivateIp.mockResolvedValue('i-resolved-id')
      mockGetCpuMetrics.mockResolvedValue({ data: [] })
      mockGetInstanceDetails.mockResolvedValue(undefined)

      const res = await request(app)
        .get('/api/metrics/cpu')
        .query({ instanceId: '10.0.1.50', timePeriod: '1h' })

      expect(res.status).toBe(200)
      expect(mockGetInstanceIdByPrivateIp).toHaveBeenCalledWith('10.0.1.50')
      expect(mockGetCpuMetrics).toHaveBeenCalledWith(
        'i-resolved-id',
        expect.any(Date),
        expect.any(Date),
        expect.any(String)
      )
    })

    it('should return 404 when private IP does not resolve to any instance', async () => {
      mockGetInstanceIdByPrivateIp.mockResolvedValue(undefined)

      const res = await request(app)
        .get('/api/metrics/cpu')
        .query({ instanceId: '10.0.99.99', timePeriod: '1h' })

      expect(res.status).toBe(404)
      expect(res.body.error).toMatch(/No EC2 instance found/)
      expect(res.body.error).toContain('10.0.99.99')
      expect(mockGetCpuMetrics).not.toHaveBeenCalled()
    })
  })

  describe('response shape', () => {
    it('should return data, metadata, and hint when no CloudWatch data', async () => {
      mockGetCpuMetrics.mockResolvedValue({ data: [] })
      mockGetInstanceDetails.mockResolvedValue(undefined)

      const res = await request(app)
        .get('/api/metrics/cpu')
        .query({ instanceId: 'i-xxx', timePeriod: '1h' })

      expect(res.status).toBe(200)
      expect(res.body.data).toEqual([])
      expect(res.body.hint).toMatch(/No CloudWatch data/)
      expect(res.body.metadata).toBeUndefined()
    })

    it('should return metadata when instance details and data exist', async () => {
      mockGetCpuMetrics.mockResolvedValue({
        data: [{ time: '12:00 PM', cpu: 45, timestamp: Date.now() }],
      })
      mockGetInstanceDetails.mockResolvedValue({
        instanceType: 't3.small',
        state: 'running',
        availabilityZone: 'us-east-1b',
      })

      const res = await request(app)
        .get('/api/metrics/cpu')
        .query({ instanceId: 'i-xxx', timePeriod: '1h' })

      expect(res.status).toBe(200)
      expect(res.body.data).toHaveLength(1)
      expect(res.body.metadata).toEqual(
        expect.objectContaining({
          instanceType: 't3.small',
          state: 'running',
          availabilityZone: 'us-east-1b',
          region: expect.any(String),
          actualStartTime: expect.any(Number),
        })
      )
    })

    it('should include adjustedInterval and hint when CloudWatch downgrades resolution', async () => {
      mockGetCpuMetrics.mockResolvedValue({
        data: [{ time: '12:00 PM', cpu: 50, timestamp: Date.now() }],
        adjustedInterval: '5m',
      })
      mockGetInstanceDetails.mockResolvedValue({
        instanceType: 't3.micro',
        state: 'running',
        availabilityZone: 'us-east-1a',
      })

      const res = await request(app)
        .get('/api/metrics/cpu')
        .query({ instanceId: 'i-xxx', timePeriod: '1h', interval: '1m' })

      expect(res.status).toBe(200)
      expect(res.body.adjustedInterval).toBe('5m')
      expect(res.body.hint).toMatch(/1-minute|5m|detailed/)
    })

    it('should use unknown for missing instance details', async () => {
      mockGetCpuMetrics.mockResolvedValue({
        data: [{ time: '12:00 PM', cpu: 50, timestamp: Date.now() }],
      })
      mockGetInstanceDetails.mockResolvedValue(undefined)

      const res = await request(app)
        .get('/api/metrics/cpu')
        .query({ instanceId: 'i-xxx', timePeriod: '1h' })

      expect(res.status).toBe(200)
      expect(res.body.metadata.instanceType).toBe('unknown')
      expect(res.body.metadata.state).toBe('unknown')
      expect(res.body.metadata.availabilityZone).toBe('unknown')
    })
  })

  describe('error handling', () => {
    it('should return 500 for generic errors', async () => {
      mockGetCpuMetrics.mockRejectedValue(new Error('Something went wrong'))
      mockGetInstanceDetails.mockRejectedValue(new Error('Something went wrong'))

      const res = await request(app)
        .get('/api/metrics/cpu')
        .query({ instanceId: 'i-xxx', timePeriod: '1h' })

      expect(res.status).toBe(500)
      expect(res.body.error).toBe('Something went wrong')
    })

    it('should return 502 for AWS/CloudWatch errors', async () => {
      mockGetCpuMetrics.mockRejectedValue(new Error('CloudWatch throttling'))
      mockGetInstanceDetails.mockRejectedValue(new Error('CloudWatch throttling'))

      const res = await request(app)
        .get('/api/metrics/cpu')
        .query({ instanceId: 'i-xxx', timePeriod: '1h' })

      expect(res.status).toBe(502)
      expect(res.body.error).toContain('CloudWatch')
    })

    it('should return 502 for CredentialsError', async () => {
      const credError = new Error('Invalid credentials')
      ;(credError as { name?: string }).name = 'CredentialsError'
      mockGetCpuMetrics.mockRejectedValue(credError)
      mockGetInstanceDetails.mockRejectedValue(credError)

      const res = await request(app)
        .get('/api/metrics/cpu')
        .query({ instanceId: 'i-xxx', timePeriod: '1h' })

      expect(res.status).toBe(502)
    })

    it('should return 502 when error message contains AWS', async () => {
      mockGetCpuMetrics.mockRejectedValue(new Error('AWS service unavailable'))

      const res = await request(app)
        .get('/api/metrics/cpu')
        .query({ instanceId: 'i-xxx', timePeriod: '1h' })

      expect(res.status).toBe(502)
    })
  })
})

describe('GET /api/health', () => {
  it('should return 200 with status ok and region', async () => {
    const res = await request(app).get('/api/health')

    expect(res.status).toBe(200)
    expect(res.body).toEqual(
      expect.objectContaining({
        status: 'ok',
        region: expect.any(String),
      })
    )
  })
})
