function Footer() {
  return (
    <footer className="bg-white border-t border-neutral-gray200 shadow-[0_1px_3px_rgba(0,0,0,0.04)] mt-auto dark:bg-dark-surface/90 dark:border-white/10">
      <div className="max-w-container mx-auto px-section-px py-4">
        <div className="flex flex-col sm:flex-row justify-between items-center text-sm text-neutral-gray600 dark:text-dark-textSecondary">
          <p>© 2026 Fobdom - Dependency Mapping Platform</p>
          <p className="mt-2 sm:mt-0">Version 1.0.0</p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
