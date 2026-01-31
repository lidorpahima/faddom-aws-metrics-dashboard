import { useState } from 'react'
import InputsPanel from './InputsPanel'
import ChartArea from './ChartArea'
import LiveMetricsCard from './LiveMetricsCard'

interface OverviewSectionProps {
  ipAddress: string
  timePeriod: string
  samplingInterval: string
  onIpChange: (value: string) => void
  onTimePeriodChange: (value: string) => void
  onIntervalChange: (value: string) => void
  onSubmit: (e: React.FormEvent) => void
  chartData: Array<{time: string, cpu: number, timestamp: number}>
  isLoading: boolean
  liveMetrics: { current: number, average: number, peak: number }
  darkMode?: boolean
}

function OverviewSection({
  ipAddress,
  timePeriod,
  samplingInterval,
  onIpChange,
  onTimePeriodChange,
  onIntervalChange,
  onSubmit,
  chartData,
  isLoading,
  liveMetrics,
  darkMode = false
}: OverviewSectionProps) {
  const [showDetails, setShowDetails] = useState(false)

  return (
    <section 
      id="overview" 
      className="glass-backdrop max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 rounded-lg dark:bg-dark-bg/50"
      aria-label="Overview section"
    >
      {/* Inputs Panel - Primary focus */}
      <InputsPanel
        ipAddress={ipAddress}
        timePeriod={timePeriod}
        samplingInterval={samplingInterval}
        onIpChange={onIpChange}
        onTimePeriodChange={onTimePeriodChange}
        onIntervalChange={onIntervalChange}
        onSubmit={onSubmit}
        isLoading={isLoading}
      />

      {/* Chart Area - Dominates vertical space */}
      <div className="chart-wrapper">
        <ChartArea data={chartData} isLoading={isLoading} darkMode={darkMode} />
      </div>

      {/* Live Metrics Card - Optional, collapsible on mobile */}
      <div className="md:hidden">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="w-full text-left px-4 py-2 glass-mid text-aws-blue-900 dark:text-dark-text rounded-lg border border-luminosity-subtle dark:border-white/10 hover:bg-aws-blue-50/50 dark:hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-aws-blue-500 focus:ring-offset-2 dark:focus:ring-offset-dark-bg"
          aria-expanded={showDetails}
          aria-controls="mobile-metrics"
        >
          {showDetails ? 'Hide' : 'Show'} Live Metrics
        </button>
        {showDetails && (
          <div id="mobile-metrics" className="mt-4">
            <LiveMetricsCard metrics={liveMetrics} />
          </div>
        )}
      </div>
      <div className="hidden md:block">
        <LiveMetricsCard metrics={liveMetrics} />
      </div>
    </section>
  )
}

export default OverviewSection
