function WidgetHeader() {
  return (
    <div className="feature-card p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-neutral-gray900 mb-1">
            Welcome back! 👋
          </h1>
          <p className="text-neutral-gray600">
            Here's what's happening with your infrastructure today
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Search Bar */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search..."
              className="pl-10 pr-4 py-2 rounded-small-card border border-neutral-gray200 focus-ring bg-white transition-all duration-300"
            />
            <svg
              className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-neutral-gray600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>

          {/* Date Display */}
          <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-small-card bg-neutral-gray50 border border-neutral-gray200">
            <span className="text-2xl">📅</span>
            <div>
              <p className="text-xs text-neutral-gray600">Today</p>
              <p className="text-sm font-semibold text-neutral-gray900">
                {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default WidgetHeader
