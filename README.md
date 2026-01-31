# AWS EC2 Performance Monitoring Dashboard

A full-stack application for real-time monitoring of AWS EC2 instances. This project features a high-performance Node.js backend and a modern, macOS-inspired glass-morphism React dashboard.

## 🚀 Key Features

- **Smart Instance Resolution**: Support for both **EC2 Instance IDs** (e.g., `i-0abc123`) and **Private IP Addresses** (e.g., `172.31.88.161`).
- **Real-time CPU Metrics**: Fetches and visualizes CPU utilization directly from AWS CloudWatch.
- **Termination Protection Control**: Integrated toggle to view and modify the `DisableApiTermination` attribute.
- **Advanced Time Filtering**: Support for presets (1h, 24h, 7d) and custom date ranges (Delta API).
- **Intelligent Fallback**: Automatically switches sampling intervals (e.g., 1m to 5m) based on CloudWatch data availability.
- **Enterprise-Grade Error Handling**: Graceful handling of IAM permission restrictions (403 Forbidden) and AWS service limits.

## 🛠 Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Recharts.
- **Backend**: Node.js, Express, AWS SDK v3 (@aws-sdk/client-ec2, @aws-sdk/client-cloudwatch).
- **Design**: Glass-morphism UI with backdrop blur, vibrant gradients, and responsive layouts.

## 📂 Project Structure

```text
.
├── client/                # React Frontend (Vite)
│   ├── src/api/           # API communication layer
│   └── src/components/    # UI Components (Dashboard, Charts, Widgets)
├── server/                # Node.js Backend (Express)
│   ├── src/aws/           # AWS SDK Integration (EC2, CloudWatch)
│   └── src/routes/        # API Endpoints
└── README.md              # Project overview
```

## ⚙️ Setup & Installation

### 1. Prerequisites
- Node.js (v18+)
- AWS IAM Credentials with permissions for:
  - `cloudwatch:GetMetricData`
  - `ec2:DescribeInstances`
  - `ec2:DescribeInstanceAttribute`
  - `ec2:ModifyInstanceAttribute`

### 2. Backend Setup
```bash
cd server
cp .env.example .env
# Edit .env with your AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_REGION
npm install
npm run dev
```

### 3. Frontend Setup
```bash
cd client
npm install
npm run dev
```

The dashboard will be available at `http://localhost:5173`.

## 📝 Important Notes for Reviewers

- **IP Resolution**: The backend automatically resolves private IPs to Instance IDs using the configured `AWS_REGION`. Ensure your region matches the instance location.
- **Permissions**: If the provided AWS credentials lack `ModifyInstanceAttribute` permissions, the application will display a clear "Permission Error" in the UI and safely revert the toggle state.
- **Data Resolution**: 1-minute resolution requires "Detailed Monitoring" in AWS. If disabled, the app automatically falls back to 5-minute "Basic Monitoring" and notifies the user via an info hint.
