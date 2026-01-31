# Faddom API (Node.js backend)

Backend that fetches real EC2 CPU metrics from AWS CloudWatch and serves them to the dashboard.

## Setup

1. **Copy env template and fill in AWS credentials**

   ```bash
   cp .env.example .env
   ```

   Edit `.env` and set:

   - `AWS_ACCESS_KEY_ID` – IAM access key ID
   - `AWS_SECRET_ACCESS_KEY` – IAM secret access key
   - `AWS_REGION` – Region where your EC2 instances run (e.g. `us-east-1`)

2. **Install and run**

   ```bash
   npm install
   npm run dev
   ```

   Server runs at `http://localhost:3000`. The client (Vite) proxies `/api` to this port.

## API

- `GET /api/health` – Health check; returns `{ status, region }`.
- `GET /api/metrics/cpu?instanceId=...&timePeriod=24h&interval=5m` – CPU utilization from CloudWatch.
  - `instanceId` (required) – EC2 instance ID (e.g. `i-0abc123`) or **private IP** (e.g. `172.31.88.161`). If IP is given, the server resolves it to Instance ID via EC2 DescribeInstances in the configured region.
  - `timePeriod` – `1h` | `24h` | `7d`.
  - `interval` – `1m` | `5m` | `15m` | `1h` (CloudWatch period).
- `GET /api/metrics/termination-protection?instanceId=...` – Reads the `DisableApiTermination` attribute.
- `PUT /api/metrics/termination-protection` – Updates the `DisableApiTermination` attribute (body: `{ instanceId, enabled }`).

## IAM permissions

The credentials in `.env` must have:

- `cloudwatch:GetMetricData` – to read EC2 CPU metrics (optimized for production).
- `ec2:DescribeInstances` – to resolve a private IP to an Instance ID.
- `ec2:DescribeInstanceAttribute` – to read termination protection status.
- `ec2:ModifyInstanceAttribute` – to toggle termination protection.

> **Note on Test Environments:** If the provided IAM user lacks `ec2:ModifyInstanceAttribute` permissions, the application handles `403 Forbidden` errors gracefully. The UI will notify the user of the missing permission and revert the toggle state to maintain data integrity.

**AWS_REGION** must match the region where your EC2 instances run (e.g. `us-east-1`). Wrong region yields no instance for IP or no CloudWatch data.

## Scripts

- `npm run dev` – Start with tsx watch (restart on file change).
- `npm run build` – Compile TypeScript to `dist/`.
- `npm run start` – Run compiled `dist/index.js`.
