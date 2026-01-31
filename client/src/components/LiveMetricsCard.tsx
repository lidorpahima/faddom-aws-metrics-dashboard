interface LiveMetricsCardProps {
  metrics: { current: number, average: number, peak: number }
}

function LiveMetricsCard({ metrics }: LiveMetricsCardProps) {
  // Determine status based on current CPU usage - using only primary colors
  const getStatus = (value: number) => {
    if (value > 80) return { 
      label: 'High', 
      color: 'text-primary-accent', 
      bgColor: 'bg-neutral-gray100', 
      borderColor: '#FFA726',
      accent: 'metallic-dark' 
    }
    if (value > 60) return { 
      label: 'Medium', 
      color: 'text-primary-blue', 
      bgColor: 'bg-neutral-gray50', 
      borderColor: '#2B7DE9',
      accent: 'metallic' 
    }
    return { 
      label: 'Normal', 
      color: 'text-primary-blue', 
      bgColor: 'bg-neutral-gray50', 
      borderColor: '#2B7DE9',
      accent: 'metallic-light' 
    }
  }

  const currentStatus = getStatus(metrics.current)

  return (
    <div className="feature-card animate-fade-in dark:bg-dark-surface/80 dark:border-white/10">
      <h3 className="text-xl font-semibold text-neutral-gray900 dark:text-dark-text mb-4">Live Metrics</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Current CPU Usage - Primary metric with pulse animation */}
        <div className={`${currentStatus.bgColor} dark:bg-dark-surfaceSecondary rounded-small-card p-4 border border-neutral-gray200 dark:border-white/10`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-neutral-gray600 dark:text-dark-textSecondary">Current CPU</span>
            <span className={`text-xs font-medium px-2 py-1 rounded ${currentStatus.color} ${currentStatus.bgColor} dark:bg-white/10 dark:text-dark-text`}>
              {currentStatus.label}
            </span>
          </div>
          <div className="flex items-baseline">
            <span 
              className={`text-3xl font-bold ${currentStatus.color} dark:text-dark-text animate-pulse-slow`}
              aria-live="polite"
              aria-atomic="true"
            >
              {metrics.current.toFixed(1)}
            </span>
            <span className="text-lg text-neutral-gray600 dark:text-dark-textTertiary ml-1">%</span>
          </div>
        </div>

        {/* Average CPU Usage */}
        <div className="bg-neutral-gray50 dark:bg-dark-surfaceSecondary rounded-small-card p-4 border border-neutral-gray200 dark:border-white/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-neutral-gray600 dark:text-dark-textSecondary">Average</span>
          </div>
          <div className="flex items-baseline">
            <span className="text-3xl font-bold text-neutral-gray900 dark:text-dark-text">
              {metrics.average.toFixed(1)}
            </span>
            <span className="text-lg text-neutral-gray600 dark:text-dark-textTertiary ml-1">%</span>
          </div>
        </div>

        {/* Peak CPU Usage */}
        <div className="bg-neutral-gray50 dark:bg-dark-surfaceSecondary rounded-small-card p-4 border border-neutral-gray200 dark:border-white/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-neutral-gray600 dark:text-dark-textSecondary">Peak</span>
          </div>
          <div className="flex items-baseline">
            <span className="text-3xl font-bold text-neutral-gray900 dark:text-dark-text">
              {metrics.peak.toFixed(1)}
            </span>
            <span className="text-lg text-neutral-gray600 dark:text-dark-textTertiary ml-1">%</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LiveMetricsCard
