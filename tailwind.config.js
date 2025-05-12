/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'scuba-blue': '#1e3d59',
        'ocean-light': '#17a2b8',
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      rotate: {
        'y-180': '180deg',
      },
      transform: {
        'perspective': 'perspective(1000px)',
      },
      // Add these screen breakpoints if you need more precise mobile control
      screens: {
        'xs': '480px',
        // Keep existing Tailwind breakpoints
      },
      // Add skeleton loading animation keyframes
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-468px 0' },
          '100%': { backgroundPosition: '468px 0' }
        }
      },
      animation: {
        'shimmer': 'shimmer 1.5s linear infinite'
      },
      // Add safe area variables for modern mobile devices
      spacing: {
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-top': 'env(safe-area-inset-top)',
      },
    },
  },
  plugins: [
    function({ addUtilities }) {
      addUtilities({
        '.rotate-y-180': {
          transform: 'rotateY(180deg)',
        },
        '.preserve-3d': {
          transformStyle: 'preserve-3d',
        },
        '.perspective': {
          perspective: '1000px',
        },
        '.backface-hidden': {
          backfaceVisibility: 'hidden',
          '-webkit-backface-visibility': 'hidden',
        },
        // Add these mobile-friendly utilities
        '.smooth-scroll': {
          '-webkit-overflow-scrolling': 'touch',
          'scrollBehavior': 'smooth',
        },
        '.no-tap-highlight': {
          '-webkit-tap-highlight-color': 'transparent',
        },
        '.no-select': {
          '-webkit-user-select': 'none',
          'userSelect': 'none',
        },
        '.skeleton': {
          'background': 'linear-gradient(to right, #f0f0f0 8%, #e0e0e0 18%, #f0f0f0 33%)',
          'backgroundSize': '800px 104px',
          'animation': 'shimmer 1.5s linear infinite',
        },
      })
    }
  ],
}