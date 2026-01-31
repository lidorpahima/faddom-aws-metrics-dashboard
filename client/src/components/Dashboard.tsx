import { useState, useCallback, useMemo } from 'react'
import StatusBar from './StatusBar'
import PerformanceWidget from './PerformanceWidget'
import { fetchCpuMetrics, fetchTerminationProtection, updateTerminationProtection, RETENTION_1H_MS, type MetricsMetadata } from '../api/metrics'

// =============================================================================
// Dashboard - main dashboard component
// =============================================================================

function Dashboard() {
  // --- State: form and query config ---
  const [instanceId, setInstanceId] = useState('')
  const [timePeriod, setTimePeriod] = useState<string | undefined>('24h')
  const [samplingInterval, setSamplingInterval] = useState('5m')
  
  // --- State: termination protection ---
  const [terminationProtection, setTerminationProtectionState] = useState<boolean>(false)
  const [tpLoading, setTpLoading] = useState(false)
  const [tpError, setTpError] = useState<string | null>(null)

  // --- State: custom date range (Delta API) ---
  const [customStartTime, setCustomStartTime] = useState<number | undefined>(undefined)
  const [customEndTime, setCustomEndTime] = useState<number | undefined>(undefined)
  const [useCustomRange, setUseCustomRange] = useState(false)

  // --- State: chart data and errors ---
  const [chartData, setChartData] = useState<
    Array<{ time: string; cpu: number; timestamp: number }>
  >([])
  const [metadata, setMetadata] = useState<MetricsMetadata | null>(null)
  const [warning, setWarning] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [infoHint, setInfoHint] = useState<string | null>(null)

  // --- Debounce: prevents multiple API calls when interval changes ---
  const debounce = useCallback(
    <T,>(fn: (arg: T) => void, wait: number) => {
      let timeout: ReturnType<typeof setTimeout>
      return (arg: T) => {
        clearTimeout(timeout)
        timeout = setTimeout(() => fn(arg), wait)
      }
    },
    []
  )

  // --- Fetch function (reusable for submit and refresh) ---
  const loadTerminationProtection = useCallback(async (identifier: string) => {
    if (!identifier.trim()) return
    setTpLoading(true)
    try {
      const enabled = await fetchTerminationProtection(identifier)
      setTerminationProtectionState(enabled)
    } catch (err) {
      console.error('Failed to load termination protection:', err)
    } finally {
      setTpLoading(false)
    }
  }, [])

  const handleToggleTerminationProtection = useCallback(async (enabled: boolean) => {
    if (!instanceId.trim()) return
    setTpLoading(true)
    setTpError(null)
    try {
      await updateTerminationProtection(instanceId, enabled)
      setTerminationProtectionState(enabled)
    } catch (err: any) {
      // Revert UI state on failure
      setTerminationProtectionState(!enabled)
      
      const isForbidden = err?.message?.includes('403')
      const msg = isForbidden
        ? 'No permission to change termination protection in this test environment.'
        : (err instanceof Error ? err.message : 'Failed to update termination protection')
      
      setTpError(msg)
    } finally {
      setTpLoading(false)
    }
  }, [instanceId])

  const fetchMetrics = useCallback(async () => {
    if (!instanceId.trim()) return

    setError(null)
    setInfoHint(null)
    setWarning(null)
    setIsLoading(true)
    
    // Also load termination protection status
    loadTerminationProtection(instanceId)

    try {
      const res = useCustomRange && customStartTime && customEndTime
        ? await fetchCpuMetrics(instanceId, undefined, samplingInterval, customStartTime, customEndTime)
        : await fetchCpuMetrics(instanceId, timePeriod, samplingInterval)
      
      const { data, hint, adjustedInterval, metadata: meta, warning: warn } = res
      setChartData(data)
      setMetadata(meta ?? null)
      setWarning(warn ?? null)

      // If no data – treat as error; if interval was adjusted – show informational hint
      if (data.length === 0 && hint) {
        setError(hint)
        setInfoHint(null)
      } else if (adjustedInterval && hint) {
        setError(null)
        setInfoHint(hint)
      } else {
        setError(null)
        setInfoHint(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch metrics')
      setInfoHint(null)
      setWarning(null)
      setChartData([])
      setMetadata(null)
    } finally {
      setIsLoading(false)
    }
  }, [instanceId, timePeriod, samplingInterval, useCustomRange, customStartTime, customEndTime])

  // --- Form submit: fetch real CPU metrics from backend (CloudWatch) ---
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      await fetchMetrics()
    },
    [fetchMetrics]
  )

  // --- Refresh button handler ---
  const handleRefresh = useCallback(() => {
    if (!instanceId.trim() || chartData.length === 0) return
    fetchMetrics()
  }, [instanceId, chartData.length, fetchMetrics])

  // --- Interval change with debounce (refetches from API after 300ms) ---
  const debouncedIntervalChange = useMemo(
    () =>
      debounce<string>(async (interval) => {
        if (!instanceId.trim() || chartData.length === 0) return
        setIsLoading(true)
        setError(null)
        setInfoHint(null)
        setWarning(null)
        try {
          const res = useCustomRange && customStartTime && customEndTime
            ? await fetchCpuMetrics(instanceId, undefined, interval, customStartTime, customEndTime)
            : await fetchCpuMetrics(instanceId, timePeriod, interval)
          const { data, hint, adjustedInterval, metadata: meta, warning: warn } = res
          setChartData(data)
          setMetadata(meta ?? null)
          setWarning(warn ?? null)

          if (data.length === 0 && hint) {
            setError(hint)
            setInfoHint(null)
          } else if (adjustedInterval && hint) {
            setError(null)
            setInfoHint(hint)
          } else {
            setError(null)
            setInfoHint(null)
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to fetch metrics')
          setInfoHint(null)
          setWarning(null)
          setMetadata(null)
        } finally {
          setIsLoading(false)
        }
      }, 300),
    [debounce, instanceId, timePeriod, chartData.length, useCustomRange, customStartTime, customEndTime]
  )

  // --- Time period change with debounce (refetches from API after 300ms) ---
  const debouncedTimePeriodChange = useMemo(
    () =>
      debounce<string>(async (period) => {
        if (!instanceId.trim() || chartData.length === 0) return
        setUseCustomRange(false) // Switch back to preset mode
        setIsLoading(true)
        setError(null)
        setInfoHint(null)
        setWarning(null)
        try {
          const res = await fetchCpuMetrics(instanceId, period, samplingInterval)
          const { data, hint, adjustedInterval, metadata: meta, warning: warn } = res
          setChartData(data)
          setMetadata(meta ?? null)
          setWarning(warn ?? null)

          if (data.length === 0 && hint) {
            setError(hint)
            setInfoHint(null)
          } else if (adjustedInterval && hint) {
            setError(null)
            setInfoHint(hint)
          } else {
            setError(null)
            setInfoHint(null)
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to fetch metrics')
          setInfoHint(null)
          setWarning(null)
          setMetadata(null)
        } finally {
          setIsLoading(false)
        }
      }, 300),
    [debounce, instanceId, samplingInterval, chartData.length]
  )

  const handleIntervalChange = (interval: string) => {
    setSamplingInterval(interval)
    debouncedIntervalChange(interval)
  }

  const handleTimePeriodChange = (period: string) => {
    setTimePeriod(period)
    setUseCustomRange(false)
    debouncedTimePeriodChange(period)
  }

  const handleCustomDateRangeApply = useCallback((start: number, end: number) => {
    setCustomStartTime(start)
    setCustomEndTime(end)
    setUseCustomRange(true)
    setTimePeriod(undefined)
    if (instanceId.trim()) fetchMetrics()
  }, [instanceId, fetchMetrics])

  // Computed stats from chart data – for premium KPI display
  const computedStats = useMemo(() => {
    if (chartData.length === 0) return null
    const cpus = chartData.map((d) => d.cpu)
    const avg = cpus.reduce((a, b) => a + b, 0) / cpus.length
    const min = Math.min(...cpus)
    const max = Math.max(...cpus)
    const last = chartData[chartData.length - 1].cpu
    return { avg, min, max, last, pointCount: chartData.length }
  }, [chartData])

  // ===========================================================================
  // Render
  // ===========================================================================

  return (
    <div className="min-h-screen premium-bg">
      {/* Light beam sweep effect */}
      <div className="light-beam" />
      
      {/* Floating light orbs - internal glow effect */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Large blue orb - top left */}
        <div className="absolute w-96 h-96 rounded-full blur-3xl opacity-70 animate-[float_20s_ease-in-out_infinite]" style={{
          top: '-5%',
          left: '-5%',
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.4) 0%, transparent 70%)',
        }} />
        
        {/* Medium orange orb - center right */}
        <div className="absolute w-80 h-80 rounded-full blur-3xl opacity-25 animate-[float_15s_ease-in-out_infinite_2s]" style={{
          top: '40%',
          right: '10%',
          background: 'radial-gradient(circle, rgba(251, 146, 60, 0.35) 0%, transparent 70%)',
        }} />
        
        {/* Small purple orb - bottom left */}
        <div className="absolute w-64 h-64 rounded-full blur-3xl opacity-15 animate-[float_18s_ease-in-out_infinite_4s]" style={{
          bottom: '15%',
          left: '15%',
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.3) 0%, transparent 70%)',
        }} />
        
        {/* Tiny accent orb - top right */}
        <div className="absolute w-48 h-48 rounded-full blur-2xl opacity-30 animate-[float_12s_ease-in-out_infinite_1s]" style={{
          top: '20%',
          right: '25%',
          background: 'radial-gradient(circle, rgba(16, 185, 129, 0.25) 0%, transparent 70%)',
        }} />
      </div>
      

      
      <main className="relative z-10 min-h-screen pt-4 px-4 pb-6 md:pt-5 md:px-6">
        {/* Technical status bar: connection, region, account, date/time */}
        <StatusBar />

        {/* Retention warning (e.g. date clamped to 455 days) */}
        {warning && (
          <div className="mt-4 px-3 py-2 rounded border text-sm font-mono" role="alert" style={{
            background: 'rgba(245, 158, 11, 0.1)',
            borderColor: 'var(--status-warning)',
            color: 'var(--text-primary)',
          }}>
            {warning}
          </div>
        )}

        {/* Monitoring controls + chart - elevated, minimal top margin */}
        <div className="mt-4">
          <PerformanceWidget
              instanceId={instanceId}
              timePeriod={timePeriod}
              samplingInterval={samplingInterval}
              customStartTime={customStartTime}
              customEndTime={customEndTime}
              useCustomRange={useCustomRange}
              datePickerMinMs={Date.now() - RETENTION_1H_MS}
              onInstanceIdChange={setInstanceId}
              onTimePeriodChange={handleTimePeriodChange}
              onIntervalChange={handleIntervalChange}
              onCustomDateRangeApply={handleCustomDateRangeApply}
              onRefresh={handleRefresh}
              onSubmit={handleSubmit}
              terminationProtection={terminationProtection}
              tpLoading={tpLoading}
              tpError={tpError}
              onTerminationProtectionChange={handleToggleTerminationProtection}
              chartData={chartData}
              isLoading={isLoading}
              error={error}
              infoHint={infoHint}
            />
        </div>

        {/* KPI cards – premium data-rich display with tooltips & hierarchy */}
        <section aria-label="Instance metrics" className="mt-6">
          {/* Instance context header when data loaded */}
          {metadata && (
            <div className="mb-4 px-1">
              <h2 className="text-sm font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                Instance Overview
              </h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                Real-time metrics from AWS CloudWatch · {instanceId || '—'}
              </p>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                key: 'status',
                label: 'Instance Status',
                value: metadata?.state ?? '—',
                sublabel: 'EC2 power state',
                iconBg: 'rgba(16, 185, 129, 0.12)',
                iconStroke: '#10b981',
                valueColor: metadata?.state === 'running' ? '#10b981' : metadata?.state === 'stopped' ? '#ef4444' : undefined,
                tooltip: 'Current power state of the EC2 instance. Running instances consume resources.',
                delay: 0,
              },
              {
                key: 'instanceType',
                label: 'Instance Type',
                value: metadata?.instanceType ?? '—',
                sublabel: 'Compute tier',
                iconBg: 'rgba(139, 92, 246, 0.12)',
                iconStroke: '#8b5cf6',
                tooltip: 'EC2 instance family and size (e.g. t3.micro, m5.large). Determines vCPU and memory.',
                delay: 50,
              },
              {
                key: 'currentCpu',
                label: 'Current CPU',
                value: chartData.length > 0
                  ? (chartData[chartData.length - 1].cpu < 0.01 && chartData[chartData.length - 1].cpu > 0
                    ? chartData[chartData.length - 1].cpu.toExponential(2)
                    : chartData[chartData.length - 1].cpu.toFixed(1)) + '%'
                  : '—',
                sublabel: computedStats ? `Avg ${computedStats.avg.toFixed(1)}% · ${computedStats.pointCount} points` : 'Last data point',
                iconBg: 'rgba(251, 146, 60, 0.12)',
                iconStroke: '#f97316',
                tooltip: 'Most recent CPU utilization. Hover chart for historical context.',
                delay: 100,
              },
              {
                key: 'availabilityZone',
                label: 'Availability Zone',
                value: metadata?.availabilityZone ?? '—',
                sublabel: metadata?.region ?? '',
                iconBg: 'rgba(59, 130, 246, 0.12)',
                iconStroke: '#3b82f6',
                tooltip: 'AWS AZ and region. Impacts latency and redundancy.',
                delay: 150,
              },
            ].map((stat) => (
              <article
                key={stat.key}
                className="stat-card group animate-stat-card"
                style={{ animationDelay: `${stat.delay}ms` }}
                title={stat.tooltip}
              >
                <div className="flex items-start justify-between gap-3 mb-4">
                  <h3 className="stat-card-label" style={{ color: 'var(--text-tertiary)' }}>{stat.label}</h3>
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-opacity group-hover:opacity-90"
                    style={{ background: stat.iconBg }}
                  >
                    {stat.key === 'status' && (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stat.iconStroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                    {stat.key === 'instanceType' && (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stat.iconStroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="3" width="20" height="14" rx="2" />
                        <path d="M8 21h8M12 17v4" />
                      </svg>
                    )}
                    {stat.key === 'currentCpu' && (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stat.iconStroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 20V10M12 20V4M6 20v-6" />
                      </svg>
                    )}
                    {stat.key === 'availabilityZone' && (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stat.iconStroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
                      </svg>
                    )}
                  </div>
                </div>
                <p className="stat-card-value font-mono" style={{ color: stat.valueColor ?? 'var(--text-primary)' }}>
                  {stat.value}
                </p>
                <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>{stat.sublabel}</p>
                {/* Contextual tooltip on hover */}
                <div
                  className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 16v-4M12 8h.01" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </article>
            ))}
          </div>
          {/* Computed stats bar when data exists – secondary, accessible */}
          {computedStats && chartData.length > 1 && (
            <div
              className="mt-4 px-4 py-3 rounded-lg flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-mono"
              style={{
                background: 'rgba(0,0,0,0.2)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-tertiary)',
              }}
            >
              <span><strong style={{ color: 'var(--text-secondary)' }}>Min CPU</strong> {computedStats.min < 0.01 && computedStats.min > 0 ? computedStats.min.toExponential(2) : computedStats.min.toFixed(2)}%</span>
              <span><strong style={{ color: 'var(--text-secondary)' }}>Max CPU</strong> {computedStats.max < 0.01 && computedStats.max > 0 ? computedStats.max.toExponential(2) : computedStats.max.toFixed(2)}%</span>
              <span><strong style={{ color: 'var(--text-secondary)' }}>Avg CPU</strong> {computedStats.avg < 0.01 && computedStats.avg > 0 ? computedStats.avg.toExponential(2) : computedStats.avg.toFixed(2)}%</span>
              <span><strong style={{ color: 'var(--text-secondary)' }}>Data points</strong> {computedStats.pointCount}</span>
              {chartData[0] && chartData[chartData.length - 1] && (
                <span>
                  <strong style={{ color: 'var(--text-secondary)' }}>Range</strong>{' '}
                  {new Date(chartData[0].timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  {' → '}
                  {new Date(chartData[chartData.length - 1].timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

export default Dashboard
