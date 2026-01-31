/**
 * Technical status bar: connection status, date/time.
 * Premium, data-rich layout for professional dashboards.
 */
interface StatusBarProps {
  /** When false, shows Disconnected with red dot */
  connected?: boolean
}

function StatusBar({ connected = true }: StatusBarProps) {
  const now = new Date()
  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  const timeStr = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })

  return (
    <div className="glass-card px-4 py-3" role="banner">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between text-sm">
        {/* Left: connection status */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 md:gap-6">
          <div className="flex items-center gap-2" title={connected ? 'Connected' : 'Disconnected'}>
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{
                backgroundColor: connected ? 'var(--status-running)' : 'var(--status-stopped)',
                boxShadow: connected ? '0 0 8px rgba(16, 185, 129, 0.5)' : '0 0 8px rgba(239, 68, 68, 0.5)',
              }}
              aria-hidden
            />
            <span className="text-xs font-medium" style={{ color: connected ? 'var(--text-secondary)' : 'var(--status-stopped)' }}>
              {connected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <span className="hidden sm:inline text-xs" style={{ color: 'var(--border-default)' }}>·</span>
          <span className="text-xs font-mono" style={{ color: 'var(--text-tertiary)' }}>
            EC2 CloudWatch Monitor
          </span>
        </div>

        {/* Right: date & time */}
        <div className="flex items-center gap-2 sm:gap-4 font-mono shrink-0" style={{ color: 'var(--text-secondary)' }}>
          <span className="truncate text-xs" style={{ color: 'var(--text-tertiary)' }}>{dateStr}</span>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>UTC</span>
          <span className="font-semibold text-sm tabular-nums" style={{ color: 'var(--text-primary)' }}>{timeStr}</span>
        </div>
      </div>
    </div>
  )
}

export default StatusBar
