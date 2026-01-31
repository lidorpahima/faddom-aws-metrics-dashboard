function StatusWidget() {
  const statusItems = [
    { label: 'System Health', status: 'Excellent', icon: '💚', color: 'text-primary-blue' },
    { label: 'Network', status: 'Stable', icon: '🌐', color: 'text-primary-blue' },
    { label: 'Storage', status: 'Normal', icon: '💾', color: 'text-primary-blue' },
    { label: 'Memory', status: 'Good', icon: '🧠', color: 'text-primary-blue' },
  ]

  return (
    <div className="feature-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-neutral-gray900">System Status</h3>
        <span className="text-2xl">✨</span>
      </div>

      <div className="space-y-3">
        {statusItems.map((item, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-3 rounded-lg bg-neutral-gray50 border border-neutral-gray200 hover:border-primary-blue transition-all duration-300"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{item.icon}</span>
              <div>
                <p className="text-sm font-medium text-neutral-gray900">{item.label}</p>
                <p className={`text-xs font-semibold ${item.color}`}>{item.status}</p>
              </div>
            </div>
            <svg className="w-5 h-5 text-neutral-gray600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        ))}
      </div>

      {/* Quick Action Button - Using secondary blue button */}
      <button className="btn-secondary w-full mt-4">
        View All Systems
      </button>
    </div>
  )
}

export default StatusWidget
