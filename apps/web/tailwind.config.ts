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
        "display-xl": ["Hanken Grotesk", "sans-serif"],
        "heading": ["Hanken Grotesk", "sans-serif"],
        "display-xl-mobile": ["Hanken Grotesk", "sans-serif"],
        "display-lg": ["Hanken Grotesk", "sans-serif"],
        "body-lg": ["Hanken Grotesk", "sans-serif"],
        "body-sm": ["Hanken Grotesk", "sans-serif"],
        "display-md": ["Hanken Grotesk", "sans-serif"],
        "caption": ["Hanken Grotesk", "sans-serif"],
      },
      colors: {
        // Design system — Zinc base + Teal accent
        brand: {
          DEFAULT: '#14b8a6', // teal-500
          light:   '#2dd4bf', // teal-400
          pale:    '#5eead4', // teal-300
          dark:    '#134e4a', // teal-900
        },
        watched: '#22c55e',

        // Landing page specific tokens
        "on-secondary-container": "#004119",
        "error": "#ffb4ab",
        "inverse-primary": "#006b5f",
        "on-error-container": "#ffdad6",
        "on-primary": "#003731",
        "on-tertiary-fixed-variant": "#7c2d11",
        "on-error": "#690005",
        "outline-variant": "#3c4947",
        "primary-fixed-dim": "#4fdbc8",
        "surface-variant": "#353437",
        "surface-container-lowest": "#0e0e10",
        "secondary-fixed-dim": "#4ae176",
        "primary-container": "#14b8a6",
        "tertiary-fixed": "#ffdbd0",
        "surface-container-highest": "#353437",
        "on-secondary-fixed-variant": "#005321",
        "inverse-surface": "#e5e1e4",
        "tertiary-fixed-dim": "#ffb59e",
        "on-surface": "#e5e1e4",
        "secondary-fixed": "#6bff8f",
        "surface-bright": "#39393b",
        "primary": "#4fdbc8",
        "inverse-on-surface": "#313032",
        "surface-tint": "#4fdbc8",
        "on-tertiary-fixed": "#3a0b00",
        "error-container": "#93000a",
        "background": "#131315",
        "surface-container": "#201f22",
        "on-primary-container": "#00423b",
        "tertiary-container": "#f38764",
        "on-secondary": "#003915",
        "surface-dim": "#131315",
        "on-background": "#e5e1e4",
        "surface": "#131315",
        "on-tertiary": "#5e1800",
        "primary-fixed": "#71f8e4",
        "on-surface-variant": "#bbcac6",
        "on-primary-fixed": "#00201c",
        "on-secondary-fixed": "#002109",
        "surface-container-low": "#1c1b1d",
        "secondary-container": "#00b954",
        "surface-container-high": "#2a2a2c",
        "on-primary-fixed-variant": "#005048",
        "outline": "#859490",
        "tertiary": "#ffb59e",
        "on-tertiary-container": "#6c2106",
        "secondary": "#4ae176"
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
