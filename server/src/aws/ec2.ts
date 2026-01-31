import {
  EC2Client,
  DescribeInstancesCommand,
  DescribeInstanceAttributeCommand,
  ModifyInstanceAttributeCommand,
} from '@aws-sdk/client-ec2'
import { config } from '../config.js'

const client = new EC2Client({
  region: config.aws.region,
  credentials: {
    accessKeyId: config.aws.accessKeyId,
    secretAccessKey: config.aws.secretAccessKey,
  },
})

export interface InstanceDetails {
  instanceType: string
  state: string
  availabilityZone: string
}

/**
 * Resolves a private IP address to an EC2 Instance ID in the configured region.
 * Returns undefined if no instance is found (wrong IP, wrong region, or no permission).
 */
export async function getInstanceIdByPrivateIp(ip: string): Promise<string | undefined> {
  const command = new DescribeInstancesCommand({
    Filters: [{ Name: 'private-ip-address', Values: [ip.trim()] }],
  })
  const response = await client.send(command)
  return response.Reservations?.[0]?.Instances?.[0]?.InstanceId
}

/**
 * Fetches instance details (type, state, AZ) for display in KPIs.
 * Returns undefined if instance not found or no permission.
 */
export async function getInstanceDetails(instanceId: string): Promise<InstanceDetails | undefined> {
  const command = new DescribeInstancesCommand({
    InstanceIds: [instanceId],
  })
  const response = await client.send(command)
  const instance = response.Reservations?.[0]?.Instances?.[0]
  if (!instance) return undefined
  return {
    instanceType: instance.InstanceType ?? 'unknown',
    state: instance.State?.Name ?? 'unknown',
    availabilityZone: instance.Placement?.AvailabilityZone ?? 'unknown',
  }
}

/**
 * Reads EC2 termination protection flag (DisableApiTermination).
 * true = termination protected (cannot terminate via API/console)
 */
export async function getTerminationProtection(instanceId: string): Promise<boolean> {
  const command = new DescribeInstanceAttributeCommand({
    InstanceId: instanceId,
    Attribute: 'disableApiTermination',
  })
  const response = await client.send(command)
  return response.DisableApiTermination?.Value === true
}

/**
 * Updates EC2 termination protection flag (DisableApiTermination).
 */
export async function setTerminationProtection(instanceId: string, enabled: boolean): Promise<void> {
  const command = new ModifyInstanceAttributeCommand({
    InstanceId: instanceId,
    DisableApiTermination: { Value: enabled },
  })
  await client.send(command)
}
