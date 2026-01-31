import { useRef, useEffect } from 'react'

interface InputsPanelProps {
  ipAddress: string
  timePeriod: string
  samplingInterval: string
  onIpChange: (value: string) => void
  onTimePeriodChange: (value: string) => void
  onIntervalChange: (value: string) => void
  onSubmit: (e: React.FormEvent) => void
  isLoading: boolean
}

function InputsPanel({
  ipAddress,
  timePeriod,
  samplingInterval,
  onIpChange,
  onTimePeriodChange,
  onIntervalChange,
  onSubmit,
  isLoading
}: InputsPanelProps) {
  const ipInputRef = useRef<HTMLInputElement>(null)

  // Focus first input on mount for better UX
  useEffect(() => {
    ipInputRef.current?.focus()
  }, [])

  return (
    <form 
      onSubmit={onSubmit}
      className="feature-card focus-smooth dark:bg-dark-surface/80 dark:border-white/10"
      aria-label="Performance monitoring configuration"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {/* IP Address Field - Primary */}
        <div className="space-y-2">
          <label 
            htmlFor="ip-address" 
            className="block text-sm font-medium text-neutral-gray800 dark:text-dark-textSecondary"
          >
            IP Address
          </label>
          <input
            id="ip-address"
            ref={ipInputRef}
            type="text"
            value={ipAddress}
            onChange={(e) => onIpChange(e.target.value)}
            placeholder="e.g., 192.168.1.1"
            className="w-full px-4 py-2.5 border border-neutral-gray200 dark:border-white/10 rounded-lg focus-ring bg-white dark:bg-dark-surface dark:text-dark-text dark:placeholder-gray-400 transition-all duration-300"
            aria-required="true"
            aria-label="IP address of the AWS instance"
            required
          />
        </div>

        {/* Time Period Field */}
        <div className="space-y-2">
          <label 
            htmlFor="time-period" 
            className="block text-sm font-medium text-neutral-gray800 dark:text-dark-textSecondary"
          >
            Time Period
          </label>
          <select
            id="time-period"
            value={timePeriod}
            onChange={(e) => onTimePeriodChange(e.target.value)}
            className="w-full px-4 py-2.5 border border-neutral-gray200 dark:border-white/10 rounded-lg focus-ring bg-white dark:bg-dark-surface dark:text-dark-text transition-all duration-300"
            aria-label="Time period for data collection"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
          </select>
        </div>

        {/* Sampling Interval Field */}
        <div className="space-y-2">
          <label 
            htmlFor="sampling-interval" 
            className="block text-sm font-medium text-neutral-gray800 dark:text-dark-textSecondary"
          >
            Sampling Interval
          </label>
          <select
            id="sampling-interval"
            value={samplingInterval}
            onChange={(e) => onIntervalChange(e.target.value)}
            className="w-full px-4 py-2.5 border border-neutral-gray200 dark:border-white/10 rounded-lg focus-ring bg-white dark:bg-dark-surface dark:text-dark-text transition-all duration-300"
            aria-label="Sampling interval for metrics collection"
          >
            <option value="1m">1 Minute</option>
            <option value="5m">5 Minutes</option>
            <option value="15m">15 Minutes</option>
            <option value="1h">1 Hour</option>
          </select>
        </div>
      </div>

      {/* Submit Button - Primary Orange CTA */}
      <button
        type="submit"
        disabled={isLoading || !ipAddress.trim()}
        className="btn-primary w-full md:w-auto disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none disabled:hover:shadow-button-primary"
        aria-label="Submit form to fetch performance data"
      >
        {isLoading ? (
          <span className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Loading...
          </span>
        ) : (
          'Fetch Performance Data'
        )}
      </button>
    </form>
  )
}

export default InputsPanel
