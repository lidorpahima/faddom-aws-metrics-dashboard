# Faddom Performance Dashboard

A professional AWS monitoring dashboard built with React, TypeScript, and Tailwind CSS. Designed for high-density data visualization with a modern macOS-inspired glass-morphism UI.

## Key Features (Assignment Requirements)

- **AWS Instance Resolution**: Support for both **EC2 Instance IDs** (i-xxx) and **Private IP Addresses**.
- **CPU Metrics Visualization**: Real-time fetching and display of CPU utilization from AWS CloudWatch.
- **Custom Time Ranges**: Support for preset periods (1h, 24h, 7d) and custom date ranges (Delta API).
- **Flexible Sampling**: Configurable intervals (1m, 5m, 15m, 1h) with automatic fallback logic.
- **Termination Protection Toggle**: Integrated UI control to view and modify the `DisableApiTermination` attribute.
- **Resilient UI**: Graceful handling of IAM permission errors (403 Forbidden) with automatic state recovery.

## Technical Highlights

- **Smart Fallback**: Automatically switches from 1m to 5m resolution if detailed monitoring is disabled.
- **Optimized Performance**: Debounced inputs and parallel API fetching for a snappy experience.
- **Data Integrity**: UI state reverts automatically if a backend update fails (e.g., due to restricted test credentials).
- **Modern Design**: Glass-morphism widgets with backdrop blur and vibrant status indicators.

## Design System

- **Background**: Vibrant gradient (rose → purple → blue → cyan)
- **Widgets**: White glass cards with 20px backdrop blur and soft shadows
- **Accents**: Colorful status indicators (green, blue, purple, pink)
- **Shadows**: Soft, elevated shadows on hover
- **Corners**: 20px border radius on all widgets

## Tech Stack

- React 18 with TypeScript
- Vite for fast development and optimized builds
- Tailwind CSS with custom gradient utilities
- Recharts for data visualization
- CSS backdrop-filter for glass-morphism

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
src/
  api/
    metrics.ts         # API client for backend communication
  components/
    Dashboard.tsx      # Main dashboard container & state management
    PerformanceWidget.tsx # Core widget containing controls and chart
    MetricsChart.tsx   # Recharts visualization component
    StatusBar.tsx      # Technical status bar (connection, region)
    ...                # Supporting UI components (KPI cards, etc.)
```

## Design Philosophy

The dashboard emphasizes:
- **Trust & Reliability**: Deep AWS blues convey stability
- **Data Focus**: Neutral backgrounds keep attention on metrics
- **Smooth Interactions**: Elegant animations enhance UX without distraction
- **Accessibility First**: Full keyboard navigation and screen reader support
