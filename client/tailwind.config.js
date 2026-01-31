/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary Blue Palette
        'primary-blue': '#2B7DE9',
        'primary-blue-light': '#4A9FF5',
        'primary-blue-dark': '#1E5FB8',
        'primary-accent': '#FFA726',
        'primary': {
          blue: {
            main: '#2B7DE9',
            light: '#4A9FF5',
            dark: '#1E5FB8',
          },
          accent: '#FFA726',
        },
        // Neutral Grays
        'neutral': {
          white: '#FFFFFF',
          gray50: '#F8FAFB',
          gray100: '#F3F5F7',
          gray200: '#E8ECEF',
          gray300: '#D1D8DD',
          gray600: '#6B7280',
          gray800: '#2D3748',
          gray900: '#1A202C',
        },
        // Legacy support (mapped to new colors)
        'vibrant': {
          pink: '#ec4899',
          purple: '#a855f7',
          blue: '#2B7DE9',
          green: '#22c55e',
          cyan: '#06b6d4',
          red: '#ef4444',
        },
        'widget': {
          surface: '#FFFFFF',
          surfaceLight: '#F8FAFB',
          border: '#E8ECEF',
        },
      },
      backgroundImage: {
        'hero-gradient': 'linear-gradient(180deg, #FFFFFF 0%, #F0F7FF 100%)',
        'light-blue-gradient': 'linear-gradient(180deg, #E8F2FF 0%, #FFFFFF 100%)',
        'blue-section': '#2B7DE9',
        'widget-gradient': 'linear-gradient(135deg, #ffffff, #f8fafc)',
        'green-gradient': 'linear-gradient(135deg, #22c55e, #16a34a)',
        'blue-gradient': 'linear-gradient(135deg, #1E5FB8 0%, #2B7DE9 100%)',
      },
      borderRadius: {
        'widget': '16px',
        'card': '16px',
        'small-card': '12px',
        'btn': '24px',
        'pill': '9999px',
        'icon': '50%',
      },
      backdropBlur: {
        'widget': '20px',
      },
      fontFamily: {
        'heading': ['Inter', '-apple-system', 'BlinkMacSystemFont', "'Segoe UI'", 'sans-serif'],
        'body': ['Inter', '-apple-system', 'BlinkMacSystemFont', "'Segoe UI'", 'sans-serif'],
      },
      fontSize: {
        'hero-h1': ['48px', { lineHeight: '1.2', fontWeight: '700', letterSpacing: '-0.02em' }],
        'hero-subtitle': ['18px', { lineHeight: '1.6', fontWeight: '400' }],
        'section-h2': ['36px', { lineHeight: '1.3', fontWeight: '700', letterSpacing: '-0.01em' }],
        'section-h3': ['24px', { lineHeight: '1.4', fontWeight: '600' }],
        'body-large': ['18px', { lineHeight: '1.7', fontWeight: '400' }],
        'body-regular': ['16px', { lineHeight: '1.6', fontWeight: '400' }],
        'body-small': ['14px', { lineHeight: '1.5', fontWeight: '400' }],
      },
      fontWeight: {
        'thin': '100',
        'light': '200',
      },
      boxShadow: {
        'card': '0 2px 8px rgba(0, 0, 0, 0.04)',
        'card-hover': '0 8px 24px rgba(0, 0, 0, 0.08)',
        'button-primary': '0 4px 12px rgba(255, 167, 38, 0.25)',
        'button-primary-hover': '0 6px 16px rgba(255, 167, 38, 0.35)',
        'button-secondary': '0 4px 12px rgba(43, 125, 233, 0.2)',
        'button-secondary-hover': '0 6px 16px rgba(43, 125, 233, 0.3)',
        'floating-icon': '0 4px 16px rgba(43, 125, 233, 0.25)',
        'widget': '0 2px 8px rgba(0, 0, 0, 0.04)',
        'widget-hover': '0 8px 24px rgba(0, 0, 0, 0.08)',
        'soft': '0 8px 25px -8px rgba(0, 0, 0, 0.12)',
        'elevated': '0 4px 16px rgba(0, 0, 0, 0.06)',
        'glass': '0 4px 20px -2px rgba(0, 0, 0, 0.08), 0 2px 8px -2px rgba(0, 0, 0, 0.04)',
        'glass-tab': '0 1px 2px rgba(0, 0, 0, 0.04)',
        'glass-tab-active': '0 2px 8px -2px rgba(0, 0, 0, 0.12), 0 4px 12px -4px rgba(0, 0, 0, 0.08)',
      },
      spacing: {
        'section-py': '80px',
        'section-px': '48px',
        'card-gap': '24px',
      },
      maxWidth: {
        'container': '1280px',
      },
      transitionDuration: {
        'glass': '250ms',
        'default': '300ms',
      },
      transitionTimingFunction: {
        'default': 'ease',
      },
      borderColor: {
        'luminosity': 'rgba(255, 255, 255, 0.4)',
        'luminosity-subtle': '#E8ECEF',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.5s ease-in',
        'slide-fade': 'slideFade 0.4s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideFade: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
