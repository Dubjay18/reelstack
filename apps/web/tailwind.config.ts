import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Satoshi', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        "display-xl": ["Satoshi", "sans-serif"],
        "heading": ["Satoshi", "sans-serif"],
        "display-xl-mobile": ["Satoshi", "sans-serif"],
        "display-lg": ["Satoshi", "sans-serif"],
        "body-lg": ["Satoshi", "sans-serif"],
        "body-sm": ["Satoshi", "sans-serif"],
        "display-md": ["Satoshi", "sans-serif"],
        "caption": ["Satoshi", "sans-serif"],
      },
      colors: {
        // Unifying to premium dark slate/zinc base + emerald accent
        brand: {
          DEFAULT: '#10b981', // emerald-500
          light:   '#34d399', // emerald-400
          pale:    '#6ee7b7', // emerald-300
          dark:    '#064e3b', // emerald-900
        },
        watched: '#10b981',

        // Landing page specific tokens mapped to emerald + dark grays
        "on-secondary-container": "#064e3b",
        "error": "#f87171",
        "inverse-primary": "#047857",
        "on-error-container": "#fef2f2",
        "on-primary": "#022c22",
        "on-tertiary-fixed-variant": "#7c2d11",
        "on-error": "#7f1d1d",
        "outline-variant": "#27272a",
        "primary-fixed-dim": "#34d399",
        "surface-variant": "#18181b",
        "surface-container-lowest": "#09090b",
        "secondary-fixed-dim": "#34d399",
        "primary-container": "#10b981",
        "tertiary-fixed": "#ffdbd0",
        "surface-container-highest": "#27272a",
        "on-secondary-fixed-variant": "#064e3b",
        "inverse-surface": "#f4f4f5",
        "tertiary-fixed-dim": "#ffb59e",
        "on-surface": "#f4f4f5",
        "secondary-fixed": "#6ee7b7",
        "surface-bright": "#27272a",
        "primary": "#10b981", // Emerald-500
        "inverse-on-surface": "#18181b",
        "surface-tint": "#10b981",
        "on-tertiary-fixed": "#3a0b00",
        "error-container": "#7f1d1d",
        "background": "#09090b", // zinc-950
        "surface-container": "#18181b", // zinc-900
        "on-primary-container": "#022c22",
        "tertiary-container": "#f97316",
        "on-secondary": "#022c22",
        "surface-dim": "#09090b",
        "on-background": "#f4f4f5",
        "surface": "#09090b",
        "on-tertiary": "#7c2d11",
        "primary-fixed": "#6ee7b7",
        "on-surface-variant": "#a1a1aa",
        "on-primary-fixed": "#022c22",
        "on-secondary-fixed": "#022c22",
        "surface-container-low": "#18181b",
        "secondary-container": "#10b981",
        "surface-container-high": "#27272a",
        "on-primary-fixed-variant": "#047857",
        "outline": "#52525b",
        "tertiary": "#f97316",
        "on-tertiary-container": "#7c2d11",
        "secondary": "#34d399"
      },
      borderRadius: {
        DEFAULT: '8px',
        lg: '12px',
        xl: '16px',
        '2xl': '20px',
      },
      spacing: {
        "base": "4px",
        "sm": "12px",
        "md": "16px",
        "sidebar-width": "240px",
        "xl": "32px",
        "gutter": "16px",
        "lg": "24px",
        "xs": "8px"
      },
      fontSize: {
        "display-xl": ["56px", { lineHeight: "1.1", letterSpacing: "-0.04em", fontWeight: "700" }],
        "heading": ["20px", { lineHeight: "1.4", letterSpacing: "-0.01em", fontWeight: "600" }],
        "display-xl-mobile": ["36px", { lineHeight: "1.1", letterSpacing: "-0.04em", fontWeight: "700" }],
        "display-lg": ["40px", { lineHeight: "1.2", letterSpacing: "-0.03em", fontWeight: "700" }],
        "body-lg": ["16px", { lineHeight: "1.6", letterSpacing: "0em", fontWeight: "400" }],
        "body-sm": ["14px", { lineHeight: "1.5", letterSpacing: "0em", fontWeight: "400" }],
        "mono": ["13px", { lineHeight: "1.5", letterSpacing: "0em", fontWeight: "400" }],
        "display-md": ["28px", { lineHeight: "1.3", letterSpacing: "-0.02em", fontWeight: "600" }],
        "caption": ["12px", { lineHeight: "1", letterSpacing: "0.02em", fontWeight: "500" }]
      },
      boxShadow: {
        card:     '0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3)',
        elevated: '0 4px 12px rgba(0,0,0,0.5), 0 2px 4px rgba(0,0,0,0.3)',
        modal:    '0 20px 60px rgba(0,0,0,0.7), 0 8px 24px rgba(0,0,0,0.4)',
        teal:     '0 0 0 2px rgba(20,184,166,0.4)',
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
}

export default config
