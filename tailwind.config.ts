import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Primary Theme Palette: Refined Graphite, Charcoal & Slate Greys
        grey: {
          50: "#f6f8fa",
          100: "#eaeef2",
          200: "#d0d7de",
          300: "#afb8c1",
          400: "#8c959f",
          500: "#6e7781",
          600: "#484f58",
          700: "#30363d",
          750: "#24292f",
          800: "#1c2128",
          850: "#161b22",
          900: "#0f1217",
          950: "#090b0e",
        },
        primary: {
          50: "#f6f8fa",
          100: "#eaeef2",
          200: "#d0d7de",
          300: "#afb8c1",
          400: "#8c959f",
          500: "#6e7781",
          600: "#484f58",
          700: "#30363d",
          750: "#24292f",
          800: "#1c2128",
          850: "#161b22",
          900: "#0f1217",
          950: "#090b0e",
          DEFAULT: "#30363d",
        },
        // Secondary Theme Palette: Radiant Metallic Luxury Golds
        gold: {
          50: "#fffdf5",
          100: "#fff8db",
          200: "#feefad",
          300: "#fde174",
          400: "#fad142",
          500: "#d4af37", // Canonical Classic Gold
          600: "#b99326",
          700: "#947219",
          800: "#755615",
          900: "#4d3609",
          950: "#2b1c03",
        },
        secondary: {
          50: "#fffdf5",
          100: "#fff8db",
          200: "#feefad",
          300: "#fde174",
          400: "#fad142",
          500: "#d4af37",
          600: "#b99326",
          700: "#947219",
          800: "#755615",
          900: "#4d3609",
          950: "#2b1c03",
          DEFAULT: "#d4af37",
        },
        cyber: {
          cyan: "#d4af37", // Aliased to gold for seamless backwards compatibility
          gold: "#d4af37",
          emerald: "#10b981",
          amber: "#f59e0b",
          rose: "#f43f5e",
          purple: "#d4af37", // Aliased to luxury gold
          dark: "#0f1217",
          card: "#161b22",
          border: "#30363d",
        }
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "Menlo", "Consolas", "monospace"],
      },
      boxShadow: {
        glow: "0 0 25px -4px rgba(212, 175, 55, 0.35)",
        "glow-gold": "0 0 25px -4px rgba(212, 175, 55, 0.4)",
        "glow-secondary": "0 0 25px -4px rgba(212, 175, 55, 0.4)",
        "glow-grey": "0 0 25px -4px rgba(110, 119, 129, 0.25)",
        "glow-primary": "0 0 25px -4px rgba(110, 119, 129, 0.25)",
        "glow-emerald": "0 0 20px -3px rgba(16, 185, 129, 0.25)",
        "glow-rose": "0 0 20px -3px rgba(244, 63, 94, 0.25)",
      },
    },
  },
  plugins: [],
};
export default config;
