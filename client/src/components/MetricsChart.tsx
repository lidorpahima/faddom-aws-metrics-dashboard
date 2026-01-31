import { useMemo, useState, useRef, useCallback, useEffect } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  ReferenceDot,
  ReferenceArea,
  Brush,
} from 'recharts'

export interface DataPoint {
  time: string
  cpu: number
  timestamp: number
}

interface MetricsChartProps {
  data: DataPoint[]
  statusColor: string
  height?: number
  /** When true, show loading overlay on chart */
  isLoading?: boolean
  /** When true, show full-screen overlay with toolbar */
  fullScreen?: boolean
  onCloseFullScreen?: () => void
  /** Toolbar: snap to grid (round values in tooltip) */
  snapToGrid?: boolean
  onSnapToGridChange?: (v: boolean) => void
  /** Use log scale for Y when data is micro-scale */
  useLogScale?: boolean
  onUseLogScaleChange?: (v: boolean) => void
}

const PADDING_PERCENT = 0.05

function computeDomain(values: number[], useLog: boolean): [number, number] {
  if (values.length === 0) return [0, 1]
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const padding = span * PADDING_PERCENT
  if (useLog && min > 0) {
    const logMin = Math.log10(min)
    const logMax = Math.log10(max)
    const logSpan = logMax - logMin || 1
    const logPad = logSpan * PADDING_PERCENT
    return [Math.pow(10, logMin - logPad), Math.pow(10, logMax + logPad)]
  }
  return [min - padding, max + padding]
}

function formatTick(value: number, isMicro: boolean): string {
  if (isMicro) return value.toExponential(2)
  if (value >= 1000 || (value > 0 && value < 0.01)) return value.toExponential(2)
  return value.toFixed(2)
}

/** Format timestamp to readable date + time for tooltips */
function formatTooltipDate(timestamp: number): { date: string; time: string; full: string } {
  const d = new Date(timestamp)
  const date = d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
  const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
  const full = d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'medium' })
  return { date, time, full }
}

/** Short format for Brush ticks – date when span > 1 day, else time */
function formatBrushTick(data: DataPoint[], index: number): string {
  const point = data[index]
  if (!point) return ''
  const d = new Date(point.timestamp)
  const prev = index > 0 ? data[index - 1] : null
  const sameDay = prev && new Date(prev.timestamp).toDateString() === d.toDateString()
  if (sameDay || index === 0) {
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })
  }
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false })
}

/** Selection summary: shows when user has selected a range via click-drag */
function SelectionSummary({
  chartData,
  selectedRange,
  statusColor,
}: {
  chartData: DataPoint[]
  selectedRange: { startIndex: number; endIndex: number }
  statusColor: string
}) {
  const slice = chartData.slice(selectedRange.startIndex, selectedRange.endIndex + 1)
  if (slice.length === 0) return null
  const minCpu = Math.min(...slice.map((d) => d.cpu))
  const maxCpu = Math.max(...slice.map((d) => d.cpu))
  const avgCpu = slice.reduce((a, d) => a + d.cpu, 0) / slice.length
  const startP = slice[0]
  const endP = slice[slice.length - 1]
  const delta = endP.cpu - startP.cpu

  return (
    <div
      className="flex items-center justify-between gap-3 flex-wrap px-3 py-2 rounded-lg border text-xs font-mono animate-[fadeIn_0.2s_ease-out]"
      style={{
        borderColor: statusColor,
        background: 'rgba(255,255,255,0.04)',
        color: 'var(--text-secondary)',
      }}
    >
      <div className="flex items-center gap-3 flex-wrap">
        <span style={{ color: 'var(--text-tertiary)' }}>Selected range:</span>
        <span>
          <strong style={{ color: statusColor }}>{slice.length}</strong> points
        </span>
        <span>
          CPU <strong style={{ color: statusColor }}>{minCpu.toFixed(2)}%</strong> – <strong style={{ color: statusColor }}>{maxCpu.toFixed(2)}%</strong>
        </span>
        <span>
          Avg <strong style={{ color: statusColor }}>{avgCpu.toFixed(2)}%</strong>
        </span>
        {delta !== 0 && (
          <span style={{ color: delta >= 0 ? 'var(--accent-info)' : 'var(--accent-primary)' }}>
            Δ {delta >= 0 ? '+' : ''}{delta.toFixed(2)}%
          </span>
        )}
      </div>
      <span style={{ color: 'var(--text-muted)' }}>Double-click chart to clear</span>
    </div>
  )
}

/** Info bar for Brush slider: date range, points, min/max, reset */
function BrushInfoBar({
  chartData,
  displayData,
  brushRange,
  statusColor,
  onReset,
}: {
  chartData: DataPoint[]
  displayData: DataPoint[]
  brushRange: { startIndex: number; endIndex: number } | null
  statusColor: string
  onReset: () => void
}) {
  if (chartData.length === 0 || displayData.length <= 1) return null
  const startPoint = chartData[0]
  const endPoint = chartData[chartData.length - 1]
  const minCpu = Math.min(...chartData.map((d) => d.cpu))
  const maxCpu = Math.max(...chartData.map((d) => d.cpu))
  const isZoomed = brushRange && (brushRange.startIndex > 0 || brushRange.endIndex < displayData.length - 1)

  const formatRange = (ts: number) =>
    new Date(ts).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false })

  return (
    <div
      className="flex items-center justify-between gap-3 flex-wrap px-3 py-2 rounded-b-lg border-t text-xs font-mono"
      style={{
        borderTopColor: 'var(--border-default)',
        background: 'rgba(0,0,0,0.2)',
        color: 'var(--text-secondary)',
      }}
    >
      <div className="flex items-center gap-4 flex-wrap">
        <span title={formatTooltipDate(startPoint.timestamp).full}>
          <span style={{ color: 'var(--text-tertiary)' }}>From</span> {formatRange(startPoint.timestamp)}
        </span>
        <span style={{ color: 'var(--text-tertiary)' }}>→</span>
        <span title={formatTooltipDate(endPoint.timestamp).full}>
          <span style={{ color: 'var(--text-tertiary)' }}>To</span> {formatRange(endPoint.timestamp)}
        </span>
        <span style={{ color: 'var(--border-default)' }}>|</span>
        <span>
          <span style={{ color: 'var(--text-tertiary)' }}>Points</span> {chartData.length} of {displayData.length}
        </span>
        <span style={{ color: 'var(--border-default)' }}>|</span>
        <span>
          <span style={{ color: 'var(--text-tertiary)' }}>CPU</span>{' '}
          <span style={{ color: statusColor }}>{minCpu.toFixed(3)}</span>
          <span style={{ color: 'var(--text-tertiary)' }}> – </span>
          <span style={{ color: statusColor }}>{maxCpu.toFixed(3)}</span>
        </span>
      </div>
      {isZoomed && (
        <button
          type="button"
          onClick={onReset}
          className="px-2.5 py-1 rounded border text-xs font-mono transition-colors hover:opacity-90"
          style={{
            background: 'rgba(255,255,255,0.08)',
            borderColor: 'var(--border-default)',
            color: 'var(--text-secondary)',
          }}
        >
          ↺ Reset zoom
        </button>
      )}
    </div>
  )
}

/** Format CPU value for display */
function formatCpuValue(v: number, snapToGrid: boolean): string {
  if (snapToGrid) return (Math.round(v * 1000) / 1000).toFixed(3)
  if (v < 0.01 && v > 0) return v.toExponential(4)
  return v.toFixed(4)
}

/** Hover tooltip: clearly shows start→end segment with exact values and change */
function FullscreenHoverCard({
  data,
  hoverIndex,
  statusColor,
  mouseX,
  mouseY,
  snapToGrid,
  globalIndex,
  totalPoints,
}: {
  data: DataPoint[]
  hoverIndex: number
  statusColor: string
  mouseX: number
  mouseY: number
  snapToGrid: boolean
  globalIndex?: number
  totalPoints?: number
}) {
  const windowSize = Math.max(5, Math.floor(data.length * 0.1))
  const start = Math.max(0, Math.min(hoverIndex - Math.floor(windowSize / 2), data.length - windowSize))
  const slice = data.slice(start, start + windowSize)
  const domain = useMemo(() => computeDomain(slice.map((d) => d.cpu), false), [slice])
  const point = data[hoverIndex]
  if (!point || slice.length === 0) return null

  const prev = hoverIndex > 0 ? data[hoverIndex - 1] : null
  const startPoint = prev ?? point
  const endPoint = point
  const delta = prev !== null ? endPoint.cpu - prev.cpu : null
  const pctChange = prev !== null && prev.cpu !== 0 ? ((endPoint.cpu - prev.cpu) / prev.cpu) * 100 : null

  return (
    <div
      className="fixed pointer-events-none z-10 border rounded-lg overflow-hidden flex flex-col"
      style={{
        width: 210,
        minHeight: 200,
        left: mouseX + 16,
        top: mouseY - 220,
        borderColor: 'var(--border-default)',
        background: 'rgba(37, 41, 52, 0.98)',
        boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(20px)',
      }}
    >
      {/* Segment: From → To with visual cue */}
      <div className="px-3 py-2.5 border-b" style={{ borderColor: 'var(--border-default)', background: 'rgba(0,0,0,0.15)' }}>
        <div className="text-[10px] font-medium uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
          Segment
        </div>
        <div className="flex flex-col gap-2 text-xs font-mono">
          <div className="flex items-center justify-between gap-2">
            <span style={{ color: 'var(--text-tertiary)' }}>From</span>
            <span style={{ color: statusColor }}>{formatCpuValue(startPoint.cpu, snapToGrid)}%</span>
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }} title={formatTooltipDate(startPoint.timestamp).full}>
              {new Date(startPoint.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })}
            </span>
          </div>
          <div className="flex items-center justify-center" style={{ color: 'var(--text-tertiary)' }}>
            <span className="flex-1 h-px" style={{ background: 'var(--border-default)' }} />
            <span className="px-2 text-[10px]">→</span>
            <span className="flex-1 h-px" style={{ background: 'var(--border-default)' }} />
          </div>
          <div className="flex items-center justify-between gap-2">
            <span style={{ color: 'var(--text-tertiary)' }}>To</span>
            <span className="font-semibold" style={{ color: statusColor }}>{formatCpuValue(endPoint.cpu, snapToGrid)}%</span>
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }} title={formatTooltipDate(endPoint.timestamp).full}>
              {new Date(endPoint.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })}
            </span>
          </div>
        </div>
      </div>
      {/* Mini zoom – context around segment */}
      <div className="flex-shrink-0" style={{ height: 60 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={slice} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
            <XAxis dataKey="time" hide />
            <YAxis domain={domain} hide tickFormatter={(v) => formatTick(v, false)} />
            <Area type="monotone" dataKey="cpu" stroke={statusColor} fill={statusColor} fillOpacity={0.25} strokeWidth={1.5} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      {/* Change & position */}
      <div className="flex flex-col gap-1.5 px-3 py-2.5 text-xs font-mono">
        {delta !== null && (
          <div className="flex items-baseline justify-between gap-2">
            <span style={{ color: 'var(--text-secondary)' }}>Change</span>
            <span style={{ color: delta >= 0 ? 'var(--accent-info)' : 'var(--accent-primary)' }}>
              {delta >= 0 ? '+' : ''}{delta.toFixed(4)} ({pctChange !== null ? `${pctChange >= 0 ? '+' : ''}${pctChange.toFixed(2)}%` : '—'})
            </span>
          </div>
        )}
        <div style={{ color: 'var(--text-tertiary)', fontSize: '10px' }}>
          Point {(globalIndex ?? hoverIndex) + 1} of {totalPoints ?? data.length}
        </div>
      </div>
    </div>
  )
}

export function MetricsChart({
  data,
  statusColor,
  height = 280,
  isLoading = false,
  fullScreen = false,
  onCloseFullScreen,
  snapToGrid = false,
  useLogScale = false,
}: MetricsChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [hoverValue, setHoverValue] = useState<DataPoint | null>(null)
  // Brush range for fullscreen: allows dragging to select zoom window
  const [brushRange, setBrushRange] = useState<{ startIndex: number; endIndex: number } | null>(null)
  // Click-drag selection: user-selected range for focus/isolate
  const [selectedRange, setSelectedRange] = useState<{ startIndex: number; endIndex: number } | null>(null)
  const [isSelecting, setIsSelecting] = useState(false)
  const [selectStartIndex, setSelectStartIndex] = useState<number | null>(null)
  // Key to force chart remount when resetting zoom (Brush is internal to Recharts)
  const [brushResetKey, setBrushResetKey] = useState(0)

  const displayData = data
  // In fullscreen: Brush filters via Recharts; chartData is visible slice for hover/domain
  const chartData = useMemo(() => {
    if (!fullScreen || !brushRange || displayData.length === 0) return displayData
    const { startIndex, endIndex } = brushRange
    return displayData.slice(Math.max(0, startIndex), Math.min(endIndex + 1, displayData.length))
  }, [fullScreen, brushRange, displayData])

  const values = useMemo(() => chartData.map((d) => d.cpu), [chartData])

  // Reset brush when data changes or entering fullscreen
  useEffect(() => {
    if (fullScreen && displayData.length > 0) {
      setBrushRange((prev) => {
        if (!prev) return { startIndex: 0, endIndex: displayData.length - 1 }
        return {
          startIndex: Math.min(prev.startIndex, displayData.length - 1),
          endIndex: Math.min(prev.endIndex, displayData.length - 1),
        }
      })
    } else {
      setBrushRange(null)
    }
  }, [fullScreen, displayData.length])

  const handleBrushReset = useCallback(() => {
    setBrushResetKey((k) => k + 1)
    setBrushRange({ startIndex: 0, endIndex: displayData.length - 1 })
  }, [displayData.length])
  const domain = useMemo(() => computeDomain(values, useLogScale), [values, useLogScale])
  const isMicro = useMemo(() => {
    const min = Math.min(...values)
    const max = Math.max(...values)
    return values.length > 0 && max - min > 0 && (max < 0.01 || min < 0.01)
  }, [values])

  const getIndexFromEvent = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!containerRef.current || chartData.length === 0) return null
      const rect = containerRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const percent = Math.max(0, Math.min(1, x / rect.width))
      return Math.min(Math.floor(percent * chartData.length), chartData.length - 1)
    },
    [chartData]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!containerRef.current || chartData.length === 0) return
      const i = getIndexFromEvent(e)
      if (i === null) return
      setHoverIndex(i)
      setMousePos({ x: e.clientX, y: e.clientY })
      setHoverValue(chartData[i] ?? null)
      if (isSelecting && selectStartIndex !== null) {
        const start = Math.min(selectStartIndex, i)
        const end = Math.max(selectStartIndex, i)
        setSelectedRange({ startIndex: start, endIndex: end })
      }
    },
    [chartData, getIndexFromEvent, isSelecting, selectStartIndex]
  )

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const i = getIndexFromEvent(e)
      if (i === null) return
      setIsSelecting(true)
      setSelectStartIndex(i)
      setSelectedRange({ startIndex: i, endIndex: i })
    },
    [getIndexFromEvent]
  )

  const handleMouseUp = useCallback(() => {
    setIsSelecting(false)
    setSelectStartIndex(null)
  }, [])

  const handleMouseLeave = useCallback(() => {
    setHoverIndex(null)
    setHoverValue(null)
    if (isSelecting) {
      setIsSelecting(false)
      setSelectStartIndex(null)
    }
  }, [isSelecting])

  const handleDoubleClick = useCallback(() => {
    setSelectedRange(null)
  }, [])

  // Global mouseup for range selection (mouse may leave chart during drag)
  useEffect(() => {
    const onMouseUp = () => {
      if (isSelecting) {
        setIsSelecting(false)
        setSelectStartIndex(null)
      }
    }
    window.addEventListener('mouseup', onMouseUp)
    return () => window.removeEventListener('mouseup', onMouseUp)
  }, [isSelecting])

  const content = (
    <div
      ref={containerRef}
      className={`relative ${fullScreen ? 'flex-1 h-full min-h-0 flex flex-col' : ''} ${isSelecting ? 'cursor-crosshair' : ''}`}
      onMouseMove={handleMouseMove}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onDoubleClick={handleDoubleClick}
      role="img"
      aria-label="CPU usage chart. Click and drag to select a range. Double-click to clear selection."
    >
      {hoverIndex !== null && chartData.length > 0 && !isLoading && (
        <FullscreenHoverCard
          data={chartData}
          hoverIndex={hoverIndex}
          statusColor={statusColor}
          mouseX={mousePos.x}
          mouseY={mousePos.y}
          snapToGrid={snapToGrid}
          globalIndex={brushRange ? brushRange.startIndex + hoverIndex : undefined}
          totalPoints={displayData.length}
        />
      )}
      {/* Loading overlay - shows on top of chart when fetching new data */}
      {isLoading && (
        <div className="absolute inset-0 backdrop-blur-sm z-20 flex items-center justify-center rounded-lg" style={{
          background: 'rgba(26, 29, 38, 0.8)',
        }}>
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-10 w-10 mb-3" style={{
              borderWidth: '2px',
              borderStyle: 'solid',
              borderColor: 'transparent',
              borderTopColor: 'var(--accent-info)',
            }}></div>
            <p className="text-sm font-mono" style={{ color: 'var(--text-secondary)' }}>Loading metrics...</p>
          </div>
        </div>
      )}
      <div className={fullScreen ? 'flex-1 min-h-0 flex flex-col' : ''}>
      <ResponsiveContainer width="100%" height={fullScreen ? '100%' : height}>
      <AreaChart
        key={brushResetKey}
        data={fullScreen && displayData.length > 1 ? displayData : chartData}
        margin={fullScreen ? { top: 20, right: 30, bottom: fullScreen && displayData.length > 1 ? 100 : 40, left: 20 } : undefined}
        >
          <defs>
            <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={statusColor} stopOpacity={0.3} />
              <stop offset="95%" stopColor={statusColor} stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" opacity={0.3} />
          <XAxis 
            dataKey="time" 
            stroke="var(--text-tertiary)" 
            style={{ fontSize: fullScreen ? '12px' : '11px' }}
            tick={{ fill: 'var(--text-tertiary)' }}
          />
          <YAxis
            stroke="var(--text-tertiary)"
            style={{ fontSize: fullScreen ? '12px' : '11px' }}
            domain={domain}
            tickFormatter={(v) => formatTick(v, isMicro)}
            tick={{ fill: 'var(--text-tertiary)' }}
          />
          {/* Hover card (zoom + details below cursor) is used for both fullscreen and inline */}
          <Area
            type="monotone"
            dataKey="cpu"
            stroke={statusColor}
            strokeWidth={2}
            fill="url(#colorCpu)"
            animationDuration={500}
          />
          {/* Selected range: shaded area + distinct start/end markers */}
          {selectedRange && chartData[selectedRange.startIndex] && chartData[selectedRange.endIndex] && (
            <>
              <ReferenceArea
                x1={chartData[selectedRange.startIndex].time}
                x2={chartData[selectedRange.endIndex].time}
                fill={statusColor}
                fillOpacity={0.15}
                strokeOpacity={0}
              />
              <ReferenceDot
                x={chartData[selectedRange.startIndex].time}
                y={chartData[selectedRange.startIndex].cpu}
                r={5}
                fill={statusColor}
                stroke="white"
                strokeWidth={2}
              />
              <ReferenceDot
                x={chartData[selectedRange.endIndex].time}
                y={chartData[selectedRange.endIndex].cpu}
                r={5}
                fill={statusColor}
                stroke="white"
                strokeWidth={2}
              />
            </>
          )}
          {/* Hover: prev point (start of change) + current point (end) – distinct markers */}
          {hoverValue && hoverIndex !== null && (
            <>
              {hoverIndex > 0 && chartData[hoverIndex - 1] && (
                <ReferenceDot
                  x={chartData[hoverIndex - 1].time}
                  y={chartData[hoverIndex - 1].cpu}
                  r={3}
                  fill="transparent"
                  stroke={statusColor}
                  strokeWidth={2}
                  strokeOpacity={0.8}
                />
              )}
              <ReferenceDot
                x={hoverValue.time}
                y={hoverValue.cpu}
                r={5}
                fill={statusColor}
                stroke="white"
                strokeWidth={2}
              />
            </>
          )}
          {/* Brush slider in fullscreen: drag to select zoom range, smooth analysis of time series */}
          {fullScreen && displayData.length > 1 && (
            <Brush
              dataKey="time"
              height={56}
              stroke={statusColor}
              fill="rgba(255,255,255,0.03)"
              tickFormatter={(_, index) => formatBrushTick(displayData, index)}
              onChange={(e) => {
                const start = e.startIndex ?? 0
                const end = e.endIndex ?? displayData.length - 1
                setBrushRange({ startIndex: start, endIndex: end })
              }}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
      </div>
      {selectedRange && chartData.length > 0 && (
        <SelectionSummary
          chartData={chartData}
          selectedRange={selectedRange}
          statusColor={statusColor}
        />
      )}
      {fullScreen && displayData.length > 1 && (
        <BrushInfoBar
          chartData={chartData}
          displayData={displayData}
          brushRange={brushRange}
          statusColor={statusColor}
          onReset={handleBrushReset}
        />
      )}
    </div>
  )

  // Toolbar (Close) only in fullscreen — no button when chart is inline
  const toolbar = fullScreen && onCloseFullScreen ? (
    <div className="flex items-center justify-between gap-4 flex-wrap mb-2">
      <button
        type="button"
        onClick={onCloseFullScreen}
        className="text-xs font-mono px-3 py-1.5 rounded border transition-colors duration-300"
        style={{
          borderColor: 'var(--border-default)',
          background: 'rgba(255, 255, 255, 0.05)',
          color: 'var(--text-secondary)',
        }}
      >
        Close
      </button>
    </div>
  ) : null

  if (fullScreen) {
    return (
      <div
        className="fixed inset-0 z-50 flex flex-col p-4 backdrop-blur-sm animate-[fadeIn_0.25s_ease-out]"
        role="dialog"
        aria-label="Chart full screen"
        style={{
          background: 'rgba(26, 29, 38, 0.85)',
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>CPU Usage – Analysis</h2>
          {toolbar}
        </div>
        <div className="flex-1 min-h-0 rounded-xl overflow-hidden animate-[scaleIn_0.3s_ease-out] flex flex-col glass-card">
          {content}
        </div>
      </div>
    )
  }

  return <>{content}</>
}
