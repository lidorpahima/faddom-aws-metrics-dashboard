import { useState } from 'react'
import { MetricsChart } from './MetricsChart'
import { INTERVAL_LABELS, INTERVAL_MAX_DAYS } from '../api/metrics'

interface PerformanceWidgetProps {
  instanceId: string
  timePeriod?: string
  samplingInterval: string
  customStartTime?: number
  customEndTime?: number
  useCustomRange?: boolean
  /** Min allowed start date (ms) – e.g. now - 455 days for CloudWatch retention */
  datePickerMinMs?: number
  onInstanceIdChange: (value: string) => void
  onTimePeriodChange: (value: string) => void
  onIntervalChange: (value: string) => void
  onCustomDateRangeApply: (start: number, end: number) => void
  onRefresh: () => void
  onSubmit: (e: React.FormEvent) => void
  terminationProtection: boolean
  tpLoading: boolean
  tpError: string | null
  onTerminationProtectionChange: (enabled: boolean) => void
  chartData: Array<{ time: string; cpu: number; timestamp: number }>
  isLoading: boolean
  error: string | null
  /** Informational hint (e.g. fell back to basic 5m monitoring when 1m was requested) */
  infoHint?: string | null
}

function PerformanceWidget({
  instanceId,
  timePeriod,
  samplingInterval,
  customStartTime,
  customEndTime,
  useCustomRange = false,
  datePickerMinMs,
  onInstanceIdChange,
  onTimePeriodChange,
  onIntervalChange,
  onCustomDateRangeApply,
  onRefresh,
  onSubmit,
  terminationProtection,
  tpLoading,
  tpError,
  onTerminationProtectionChange,
  chartData,
  isLoading,
  error,
  infoHint,
}: PerformanceWidgetProps) {
  const [fullScreen, setFullScreen] = useState(false)
  const [snapToGrid, setSnapToGrid] = useState(false)
  const [useLogScale, setUseLogScale] = useState(false)
  const [showInfoTooltip, setShowInfoTooltip] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [localStartDate, setLocalStartDate] = useState('')
  const [localEndDate, setLocalEndDate] = useState('')

  const getStatusColor = () => {
    if (chartData.length === 0) return '#2B7DE9' // primary-blue
    const currentCpu = chartData[chartData.length - 1]?.cpu || 0
    if (currentCpu > 80) return '#FFA726' // primary-accent (orange)
    if (currentCpu > 60) return '#2B7DE9' // primary-blue
    return '#2B7DE9' // primary-blue
  }

  const statusColor = getStatusColor()

  // Format timestamps for datetime-local inputs
  const formatDateTimeLocal = (timestamp: number | undefined): string => {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }

  const datePickerMinStr = datePickerMinMs != null
    ? formatDateTimeLocal(datePickerMinMs)
    : undefined

  const handleDateRangeApply = () => {
    if (!localStartDate || !localEndDate) return
    const start = new Date(localStartDate).getTime()
    const end = new Date(localEndDate).getTime()
    if (start >= end) {
      alert('Start time must be before end time')
      return
    }
    onCustomDateRangeApply(start, end)
    setShowDatePicker(false)
  }

  return (
    <div className="glass-card p-5 md:p-6">
      {/* Monitoring controls - elevated, compact */}
      <form onSubmit={onSubmit} className="mb-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
          <input
            type="text"
            value={instanceId}
            onChange={(e) => onInstanceIdChange(e.target.value)}
            placeholder="EC2 Instance ID or private IP (e.g. i-0abc123, 172.31.88.161)"
            className="px-3 py-2 text-sm rounded-lg border font-mono transition-all duration-200"
            style={{
              borderColor: 'var(--border-default)',
              background: 'rgba(255, 255, 255, 0.05)',
              color: 'var(--text-primary)',
              backdropFilter: 'blur(10px)',
            }}
            aria-label="EC2 Instance ID or IP address"
            required
          />
          {/* Time period: glass tab group with Custom = date picker inside same tab area */}
          <div className="flex flex-col gap-2 min-w-0">
            <div className="glass-tab-group flex-1 min-w-0" role="tablist" aria-label="Time period">
              {[
                { value: '1h', label: '1h' },
                { value: '24h', label: '24h' },
                { value: '7d', label: '7d' },
                { value: 'custom', label: 'Custom' },
              ].map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={value === 'custom' ? showDatePicker : timePeriod === value && !useCustomRange}
                  onClick={() => {
                    if (value === 'custom') {
                      setShowDatePicker(true)
                      if (customStartTime && customEndTime) {
                        setLocalStartDate(formatDateTimeLocal(customStartTime))
                        setLocalEndDate(formatDateTimeLocal(customEndTime))
                      } else {
                        const now = new Date()
                        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
                        setLocalEndDate(formatDateTimeLocal(now.getTime()))
                        setLocalStartDate(formatDateTimeLocal(yesterday.getTime()))
                      }
                    } else {
                      setShowDatePicker(false)
                      onTimePeriodChange(value)
                    }
                  }}
                  className={value === 'custom' ? (showDatePicker ? 'glass-tab glass-tab-active' : 'glass-tab') : (timePeriod === value && !useCustomRange ? 'glass-tab glass-tab-active' : 'glass-tab')}
                >
                  {label}
                </button>
              ))}
            </div>
            {/* Date picker inline when Custom tab is selected */}
            {showDatePicker && (
              <div className="flex flex-wrap items-center gap-2 p-2 rounded border" style={{
                borderColor: 'var(--border-default)',
                background: 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(10px)',
              }}>
                <label className="text-xs font-mono shrink-0" style={{ color: 'var(--text-tertiary)' }}>From</label>
                <input
                  type="datetime-local"
                  value={localStartDate}
                  min={datePickerMinStr}
                  onChange={(e) => setLocalStartDate(e.target.value)}
                  className="px-2 py-1 text-xs rounded border font-mono min-w-[140px]"
                  style={{
                    borderColor: 'var(--border-default)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: 'var(--text-primary)',
                  }}
                  aria-describedby="date-range-hint"
                />
                <label className="text-xs font-mono shrink-0" style={{ color: 'var(--text-tertiary)' }}>To</label>
                <input
                  type="datetime-local"
                  value={localEndDate}
                  min={localStartDate || datePickerMinStr}
                  onChange={(e) => setLocalEndDate(e.target.value)}
                  className="px-2 py-1 text-xs rounded border font-mono min-w-[140px]"
                  style={{
                    borderColor: 'var(--border-default)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: 'var(--text-primary)',
                  }}
                  aria-describedby="date-range-hint"
                />
                <button
                  type="button"
                  onClick={handleDateRangeApply}
                  className="px-2 py-1 text-xs rounded border font-mono shrink-0"
                  style={{
                    borderColor: 'var(--accent-info)',
                    background: 'var(--accent-info)',
                    color: 'white',
                  }}
                >
                  Apply
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDatePicker(false)
                    if (!useCustomRange) {
                      setLocalStartDate('')
                      setLocalEndDate('')
                    }
                  }}
                  className="px-2 py-1 text-xs rounded border font-mono shrink-0"
                  style={{
                    borderColor: 'var(--border-default)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
          {/* Sampling interval: glass tab group */}
          <div className="glass-tab-group" role="tablist" aria-label="Sampling interval">
            {[
              { value: '1m', label: '1m' },
              { value: '5m', label: '5m' },
              { value: '15m', label: '15m' },
              { value: '1h', label: '1h' },
            ].map(({ value, label }) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={samplingInterval === value}
                onClick={() => onIntervalChange(value)}
                className={samplingInterval === value ? 'glass-tab glass-tab-active' : 'glass-tab'}
              >
                {label}
              </button>

            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={isLoading || !instanceId.trim()}
              className="btn-primary px-4 py-1.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none"
            >
              {isLoading ? 'Loading...' : 'Fetch'}
            </button>
            {chartData.length > 0 && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={isLoading || !instanceId.trim()}
                className="px-2 py-1.5 text-sm rounded border disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                style={{
                  borderColor: 'var(--border-default)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: 'var(--text-secondary)',
                }}
                title="Refresh data"
              >
                 
                 <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M12 20q-3.35 0-5.675-2.325T4 12t2.325-5.675T12 4q1.725 0 3.3.712T18 6.75V4h2v7h-7V9h4.2q-.8-1.4-2.187-2.2T12 6Q9.5 6 7.75 7.75T6 12t1.75 4.25T12 18q1.925 0 3.475-1.1T17.65 14h2.1q-.7 2.65-2.85 4.325T12 20"/></svg>
              </button>
            )}
          </div>
        </div>
        
        {/* Termination Protection Toggle */}
        <div className="mt-4 flex items-center gap-3 p-3 rounded-lg border" style={{
          borderColor: 'var(--border-default)',
          background: 'rgba(255, 255, 255, 0.02)',
        }}>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              className="sr-only peer"
              checked={terminationProtection}
              disabled={tpLoading || !instanceId.trim()}
              onChange={(e) => onTerminationProtectionChange(e.target.checked)}
            />
            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
          <div className="flex flex-col">
            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              Termination Protection
              {tpLoading && <span className="ml-2 text-xs animate-pulse" style={{ color: 'var(--text-muted)' }}>(updating...)</span>}
            </span>
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              {terminationProtection 
                ? 'Protected: Instance cannot be terminated via API/Console' 
                : 'Unprotected: Instance can be terminated'}
            </span>
          </div>
        </div>

        {/* Termination Protection Error */}
        {tpError && (
          <div className="mt-2 px-3 py-1.5 rounded border text-[11px] font-mono" style={{
            borderColor: 'var(--status-warning)',
            background: 'rgba(245, 158, 11, 0.05)',
            color: 'var(--text-primary)',
          }}>
            <span className="font-bold mr-1">Permission Error:</span> {tpError}
          </div>
        )}

        {/* Max time per resolution */}
        <p className="mt-2 text-xs font-mono" role="status" style={{ color: 'var(--text-muted)' }}>
          Max time per resolution: 1m → <strong style={{ color: 'var(--text-tertiary)' }}>15 days</strong>, 5m → <strong style={{ color: 'var(--text-tertiary)' }}>63 days</strong>, 15m → <strong style={{ color: 'var(--text-tertiary)' }}>63 days</strong>, 1h → <strong style={{ color: 'var(--text-tertiary)' }}>455 days</strong>
        </p>
        {/* Date range picker: full-width row so Apply/Cancel are always visible and clickable */}
      
      </form>

      {/* Error from API */}
      {error && (
        <div className="mb-4 px-3 py-2 rounded border text-sm font-mono" style={{
          borderColor: 'var(--status-warning)',
          background: 'rgba(245, 158, 11, 0.1)',
          color: 'var(--text-primary)',
        }}>
          {error}
        </div>
      )}

      {/* Chart: header with title + status, then graph */}
      {isLoading && chartData.length === 0 ? (
        // Premium skeleton loading – data-rich placeholder
        <div className="h-80 flex flex-col" role="status" aria-label="Loading metrics">
          <div className="flex items-center justify-between mb-4 pb-3 border-b" style={{ borderColor: 'var(--border-default)' }}>
            <div className="space-y-2">
              <div className="h-4 w-24 rounded bg-white/10 animate-pulse" />
              <div className="h-3 w-40 rounded bg-white/5 animate-pulse" style={{ animationDelay: '0.1s' }} />
            </div>
            <div className="h-8 w-20 rounded bg-white/10 animate-pulse" style={{ animationDelay: '0.2s' }} />
          </div>
          <div className="flex-1 flex flex-col justify-end gap-2 pb-2">
            {[0.3, 0.5, 0.7, 0.4, 0.6, 0.8, 0.5, 0.4, 0.7].map((h, i) => (
              <div key={i} className="h-6 rounded animate-pulse" style={{ width: `${h * 100}%`, background: 'rgba(255,255,255,0.06)' }} />
            ))}
          </div>
          <div className="flex items-center justify-center py-6 gap-2" style={{ color: 'var(--text-tertiary)' }}>
            <div className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-transparent" style={{ borderTopColor: 'currentColor' }} aria-hidden />
            <span className="text-xs font-mono">Fetching CPU data from CloudWatch...</span>
          </div>
        </div>
      ) : chartData.length === 0 && !error ? (
        // Premium empty state – clear CTA and context
        <div className="h-72 flex flex-col items-center justify-center rounded-xl border-2 border-dashed text-center px-6" style={{
          borderColor: 'var(--border-default)',
          background: 'rgba(255, 255, 255, 0.02)',
        }} role="status">
          <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-4" style={{
            background: 'rgba(59, 130, 246, 0.08)',
          }} aria-hidden>
            <svg className="w-7 h-7" fill="none" stroke="var(--accent-info)" viewBox="0 0 24 24" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>No metrics yet</h3>
          <p className="text-sm font-mono max-w-[280px] mb-4" style={{ color: 'var(--text-tertiary)' }}>
            Enter EC2 Instance ID or private IP above and click Fetch to load CPU utilization from CloudWatch.
          </p>
          <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
            Data source: AWS CloudWatch · CPUUtilization metric
          </p>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-3 pb-3 border-b" style={{ borderColor: 'var(--border-default)' }}>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>CPU Usage</h2>
              <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }} title={`Data points every ${INTERVAL_LABELS[samplingInterval] ?? samplingInterval}. Max range for this resolution: ${INTERVAL_MAX_DAYS[samplingInterval] ?? 455} days.`}>
              </span>
              {infoHint && (
                <span
                  className="relative inline-flex items-center"
                  onMouseEnter={() => setShowInfoTooltip(true)}
                  onMouseLeave={() => setShowInfoTooltip(false)}
                >
                  <span
                    className="inline-flex items-center justify-center w-4 h-4 rounded-full border text-[10px] font-mono cursor-help"
                    style={{
                      borderColor: 'var(--accent-primary)',
                      color: 'var(--accent-primary)',
                      background: 'rgba(251, 146, 60, 0.1)',
                    }}
                    aria-label={infoHint}
                  >
                    !
                  </span>
                  {showInfoTooltip && (
                    <div className="absolute left-1/2 -translate-x-1/2 top-5 z-20 w-64 px-3 py-2 rounded border text-[11px] font-mono" style={{
                      background: 'var(--bg-card)',
                      borderColor: 'var(--border-default)',
                      color: 'var(--text-primary)',
                      boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
                    }}>
                      <p className="leading-snug">{infoHint}</p>
                    </div>
                  )}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {useCustomRange && customStartTime && customEndTime && (
                <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                  {new Date(customStartTime).toLocaleDateString()} → {new Date(customEndTime).toLocaleDateString()}
                </span>
              )}
              <button
                type="button"
                onClick={() => setFullScreen(true)}
                className="text-xs font-mono px-2 py-1 rounded border transition-colors duration-300"
                style={{
                  borderColor: 'var(--border-default)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: 'var(--text-secondary)',
                }}
                title="Full-screen analysis"
              >
                Full screen
              </button>
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColor }} aria-hidden />
              <span className="text-xs font-mono" style={{ color: 'var(--text-primary)' }}>
                {chartData[chartData.length - 1]?.cpu < 0.01 && chartData[chartData.length - 1]?.cpu > 0
                  ? chartData[chartData.length - 1].cpu.toExponential(2)
                  : chartData[chartData.length - 1]?.cpu.toFixed(1)}
                %
              </span>
            </div>
          </div>
          <MetricsChart
            data={chartData}
            statusColor={statusColor}
            height={280}
            isLoading={isLoading}
            fullScreen={fullScreen}
            onCloseFullScreen={() => setFullScreen(false)}
            snapToGrid={snapToGrid}
            onSnapToGridChange={setSnapToGrid}
            useLogScale={useLogScale}
            onUseLogScaleChange={setUseLogScale}
          />
        </div>
      )}
    </div>
  )
}

export default PerformanceWidget
