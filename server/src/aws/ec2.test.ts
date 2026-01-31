import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getInstanceIdByPrivateIp, getInstanceDetails, type InstanceDetails } from './ec2.js'

// Hoist mock so it's available in the mock factory (vi.mock is hoisted)
const mockSend = vi.hoisted(() => vi.fn())

// Mock the entire EC2 client module - no real AWS calls
vi.mock('@aws-sdk/client-ec2', () => ({
  EC2Client: vi.fn(() => ({ send: mockSend })),
  DescribeInstancesCommand: vi.fn((input: object) => ({ input })),
}))

beforeEach(() => {
  mockSend.mockReset()
})

describe('getInstanceIdByPrivateIp', () => {
  it('should return instance ID when instance is found for private IP', async () => {
    mockSend.mockResolvedValue({
      Reservations: [
        {
          Instances: [{ InstanceId: 'i-0123456789abcdef0' }],
        },
      ],
    })

    const result = await getInstanceIdByPrivateIp('10.0.1.50')

    expect(result).toBe('i-0123456789abcdef0')
    expect(mockSend).toHaveBeenCalledTimes(1)
  })

  it('should trim IP before querying', async () => {
    mockSend.mockResolvedValue({
      Reservations: [{ Instances: [{ InstanceId: 'i-trimmed' }] }],
    })

    const result = await getInstanceIdByPrivateIp('  10.0.1.1  ')

    expect(result).toBe('i-trimmed')
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          Filters: [{ Name: 'private-ip-address', Values: ['10.0.1.1'] }],
        }),
      })
    )
  })

  it('should return undefined when no reservations', async () => {
    mockSend.mockResolvedValue({ Reservations: [] })

    const result = await getInstanceIdByPrivateIp('10.0.1.99')

    expect(result).toBeUndefined()
  })

  it('should return undefined when reservations exist but no instances', async () => {
    mockSend.mockResolvedValue({
      Reservations: [{ Instances: [] }],
    })

    const result = await getInstanceIdByPrivateIp('10.0.1.99')

    expect(result).toBeUndefined()
  })

  it('should return undefined when response is null/undefined', async () => {
    mockSend.mockResolvedValue({ Reservations: undefined })

    const result = await getInstanceIdByPrivateIp('10.0.1.99')

    expect(result).toBeUndefined()
  })

  it('should propagate AWS SDK errors', async () => {
    const awsError = new Error('Access Denied')
    mockSend.mockRejectedValue(awsError)

    await expect(getInstanceIdByPrivateIp('10.0.1.1')).rejects.toThrow('Access Denied')
  })
})

describe('getInstanceDetails', () => {
  it('should return full instance details when instance is found', async () => {
    mockSend.mockResolvedValue({
      Reservations: [
        {
          Instances: [
            {
              InstanceType: 't3.micro',
              State: { Name: 'running' },
              Placement: { AvailabilityZone: 'us-east-1a' },
            },
          ],
        },
      ],
    })

    const result = await getInstanceDetails('i-0123456789abcdef0')

    expect(result).toEqual<InstanceDetails>({
      instanceType: 't3.micro',
      state: 'running',
      availabilityZone: 'us-east-1a',
    })
  })

  it('should return undefined when instance not found', async () => {
    mockSend.mockResolvedValue({ Reservations: [] })

    const result = await getInstanceDetails('i-nonexistent')

    expect(result).toBeUndefined()
  })

  it('should use "unknown" for missing optional fields', async () => {
    mockSend.mockResolvedValue({
      Reservations: [
        {
          Instances: [{}],
        },
      ],
    })

    const result = await getInstanceDetails('i-partial')

    expect(result).toEqual({
      instanceType: 'unknown',
      state: 'unknown',
      availabilityZone: 'unknown',
    })
  })

  it('should pass instance ID in DescribeInstancesCommand', async () => {
    mockSend.mockResolvedValue({
      Reservations: [{ Instances: [{ InstanceType: 't2.small', State: { Name: 'stopped' }, Placement: {} }] }],
    })

    await getInstanceDetails('i-specific-id')

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        input: { InstanceIds: ['i-specific-id'] },
      })
    )
  })
})
