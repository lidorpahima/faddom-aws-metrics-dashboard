interface MetricsWidgetProps {
  metrics: { current: number, average: number, peak: number }
}

function MetricsWidget({ metrics }: MetricsWidgetProps) {
  const getStatus = (value: number) => {
    if (value > 80) return { label: 'High', color: 'text-primary-accent', bgColor: 'bg-neutral-gray100', dotColor: 'bg-primary-accent' }
    if (value > 60) return { label: 'Medium', color: 'text-primary-blue', bgColor: 'bg-neutral-gray50', dotColor: 'bg-primary-blue' }
    return { label: 'Normal', color: 'text-primary-blue', bgColor: 'bg-neutral-gray50', dotColor: 'bg-primary-blue' }
  }

  const currentStatus = getStatus(metrics.current)

  return (
    <div className="feature-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-neutral-gray900">Live Metrics</h3>
        <span className="text-2xl">📈</span>
      </div>

      {/* Current CPU - Prominent */}
      <div className={`${currentStatus.bgColor} rounded-small-card p-4 mb-3 border border-neutral-gray200`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-neutral-gray800">Current CPU</span>
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${currentStatus.color} ${currentStatus.bgColor}`}>
            {currentStatus.label}
          </span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className={`text-4xl font-bold ${currentStatus.color}`}>
            {metrics.current.toFixed(1)}
          </span>
          <span className="text-xl text-neutral-gray600">%</span>
        </div>
        <div className="flex items-center gap-1 mt-2">
          <div className={`w-2 h-2 rounded-full ${currentStatus.dotColor} animate-pulse`}></div>
          <span className="text-xs text-neutral-gray600">Live</span>
        </div>
      </div>

      {/* Average & Peak */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-neutral-gray50 rounded-small-card p-3 border border-neutral-gray200">
          <p className="text-xs text-neutral-gray600 mb-1">Average</p>
          <p className="text-2xl font-bold text-neutral-gray900">{metrics.average.toFixed(1)}%</p>
        </div>
        <div className="bg-neutral-gray50 rounded-small-card p-3 border border-neutral-gray200">
          <p className="text-xs text-neutral-gray600 mb-1">Peak</p>
          <p className="text-2xl font-bold text-neutral-gray900">{metrics.peak.toFixed(1)}%</p>
        </div>
      </div>
    </div>
  )
}

export default MetricsWidget
