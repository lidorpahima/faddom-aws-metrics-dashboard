import { useMemo } from 'react'
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts'

interface ChartAreaProps {
  data: Array<{time: string, cpu: number, timestamp: number}>
  isLoading: boolean
  darkMode?: boolean
}

function ChartArea({ data, isLoading, darkMode = false }: ChartAreaProps) {
  // Format data for chart with smooth transitions
  const chartData = useMemo(() => {
    return data.map((item, index) => ({
      ...item,
      index,
      // Add slight delay for elegant data point appearance
      delay: index * 20
    }))
  }, [data])

  // Determine status color based on current CPU usage - using only primary colors
  const getStatusColor = () => {
    if (data.length === 0) return '#2B7DE9' // primary-blue
    const currentCpu = data[data.length - 1]?.cpu || 0
    if (currentCpu > 80) return '#FFA726' // primary-accent (orange) for high
    if (currentCpu > 60) return '#2B7DE9' // primary-blue for medium
    return '#2B7DE9' // primary-blue for normal
  }

  const statusColor = getStatusColor()

  if (isLoading) {
    return (
      <div className="chart-wrapper glass-mid rounded-lg shadow-elevated dark:shadow-elevated-dark border border-luminosity-subtle dark:border-white/10 p-8 min-h-[400px] md:min-h-[500px] flex items-center justify-center animate-pulse dark:bg-dark-surface/60">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-aws-blue-600 dark:border-aws-blue-400 mb-4"></div>
          <p className="text-neutral-gray600 dark:text-dark-textSecondary font-body">Loading performance data...</p>
        </div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="chart-wrapper glass-mid rounded-lg shadow-elevated dark:shadow-elevated-dark border border-luminosity-subtle dark:border-white/10 p-8 min-h-[400px] md:min-h-[500px] flex items-center justify-center dark:bg-dark-surface/60">
        <div className="text-center">
          <svg className="mx-auto h-16 w-16 text-neutral-gray600 dark:text-dark-textTertiary mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className="text-neutral-gray600 dark:text-dark-textSecondary font-body text-lg">Enter an IP address and fetch data to view performance metrics</p>
        </div>
      </div>
    )
  }

  return (
    <div className="chart-wrapper glass-mid rounded-lg shadow-elevated dark:shadow-elevated-dark border border-luminosity-subtle dark:border-white/10 p-6 md:p-8 animate-fade-in dark:bg-dark-surface/60">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-heading font-bold text-neutral-gray900 dark:text-dark-text">CPU Usage Over Time</h2>
        <div className="flex items-center space-x-2">
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: statusColor }}
            aria-hidden="true"
          ></div>
          <span className="text-sm text-neutral-gray600 dark:text-dark-textSecondary font-body">
            {data[data.length - 1]?.cpu.toFixed(1)}% CPU
          </span>
        </div>
      </div>
      
      <ResponsiveContainer width="100%" height={400} className="animate-slide-fade">
        <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={statusColor} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={statusColor} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-600" />
          <XAxis 
            dataKey="time" 
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
            tick={{ fill: '#6b7280' }}
          />
          <YAxis 
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
            tick={{ fill: '#6b7280' }}
            domain={[0, 100]}
            label={{ value: 'CPU %', angle: -90, position: 'insideLeft', style: { fill: '#6b7280' } }}
          />
          <Tooltip 
            contentStyle={ darkMode
              ? { backgroundColor: '#1f2937', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.25)', color: '#F8FAFC' }
              : { backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', color: '#374151' }
            }
            labelStyle={{ color: darkMode ? '#F8FAFC' : '#374151', fontWeight: '600' }}
            formatter={(value: number) => [`${value.toFixed(2)}%`, 'CPU Usage']}
          />
          <Area 
            type="monotone" 
            dataKey="cpu" 
            stroke={statusColor} 
            strokeWidth={2}
            fill="url(#colorCpu)"
            animationDuration={500}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export default ChartArea
