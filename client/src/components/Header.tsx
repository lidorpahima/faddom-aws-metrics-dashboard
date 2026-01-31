interface HeaderProps {
  darkMode: boolean
  onToggleDarkMode: () => void
}

function Header({ darkMode, onToggleDarkMode }: HeaderProps) {
  return (
    <header className="bg-white border-b border-neutral-gray200 shadow-[0_1px_3px_rgba(0,0,0,0.04)] h-[72px] dark:bg-dark-surface/90 dark:border-white/10">
      <div className="max-w-container mx-auto px-section-px h-full">
        <div className="flex items-center justify-between h-full">
          {/* Logo/Brand */}
          <div className="flex items-center">
            <h1 className="text-xl md:text-2xl font-heading font-bold text-primary-blue dark:text-dark-text">
              Fobdom
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Navigation Links */}
            <nav className="hidden md:flex items-center space-x-1">
              <a 
                href="#overview" 
                className="nav-link focus-ring rounded-lg"
                aria-label="Navigate to overview section"
              >
                Overview
              </a>
              <a 
                href="#metrics" 
                className="nav-link focus-ring rounded-lg"
                aria-label="Navigate to metrics section"
              >
                Metrics
              </a>
              <a 
                href="#settings" 
                className="nav-link focus-ring rounded-lg"
                aria-label="Navigate to settings"
              >
                Settings
              </a>
            </nav>
            
            {/* Dark Mode Toggle */}
            <button
              type="button"
              onClick={onToggleDarkMode}
              className="p-2 text-neutral-gray600 hover:text-primary-blue transition-colors duration-300 focus-ring rounded-lg"
              aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {darkMode ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header
