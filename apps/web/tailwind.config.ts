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
        // "Amber Reel" — warm cinematic dark (amber/terracotta on near-black brown)
        brand: {
          DEFAULT: '#eb9c3e', // accent (amber)
          light:   '#f0b168', // lighter amber
          pale:    '#f5c98e', // pale amber
          dark:    '#7c4a1a', // deep amber/brown
        },
        watched: '#eb9c3e',

        // Convenience aliases matching the design doc's token names directly
        accent: '#eb9c3e',
        accent2: '#d9552b',
        "on-accent": '#1c1207',

        // Landing page / M3-style role tokens, remapped to Amber Reel hexes
        "on-secondary-container": "#1c1207",
        "error": "#f87171",
        "inverse-primary": "#b97328",
        "on-error-container": "#fef2f2",
        "on-primary": "#1c1207",
        "on-tertiary-fixed-variant": "#1c1207",
        "on-error": "#7f1d1d",
        "outline-variant": "rgba(255,214,170,0.14)",
        "primary-fixed-dim": "#eb9c3e",
        "surface-variant": "#241c15",
        "surface-container-lowest": "#17120e",
        "secondary-fixed-dim": "#d9552b",
        "primary-container": "#eb9c3e",
        "tertiary-fixed": "#e8926f",
        "surface-container-highest": "#31261a",
        "on-secondary-fixed-variant": "#1c1207",
        "inverse-surface": "#f7ecdf",
        "tertiary-fixed-dim": "#d9552b",
        "on-surface": "#f7ecdf",
        "secondary-fixed": "#e8926f",
        "surface-bright": "#31261a",
        "primary": "#eb9c3e", // accent
        "inverse-on-surface": "#1e1712",
        "surface-tint": "#eb9c3e",
        "on-tertiary-fixed": "#1c1207",
        "error-container": "#7f1d1d",
        "background": "#17120e", // bg
        "surface-container": "#1e1712", // bg2
        "on-primary-container": "#1c1207",
        "tertiary-container": "#d9552b",
        "on-secondary": "#1c1207",
        "surface-dim": "#17120e",
        "on-background": "#f7ecdf",
        "surface": "#241c15",
        "on-tertiary": "#1c1207",
        "primary-fixed": "#f0b168",
        "on-surface-variant": "#b9a58e",
        "on-primary-fixed": "#1c1207",
        "on-secondary-fixed": "#1c1207",
        "surface-container-low": "#1e1712",
        "secondary-container": "#d9552b",
        "surface-container-high": "#31261a",
        "on-primary-fixed-variant": "#1c1207",
        "outline": "#6b5847",
        "tertiary": "#d9552b",
        "on-tertiary-container": "#1c1207",
        "secondary": "#d9552b"
      },
      borderRadius: {
        DEFAULT: '8px',
        sm: '6px',
        md: '14px',
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
        teal:     '0 0 0 2px rgba(235,156,62,0.4)',
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
}

export default config
