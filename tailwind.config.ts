import type { Config } from "tailwindcss";

/**
 * SmartTaxIQ palette.
 *
 * Every value below was sampled from the supplied SmartTaxIQ logo artwork
 * (`public/images/smarttaxiq-logo.png`) and then extended into scales so
 * Tailwind's opacity modifiers work: `bg-ink/70`, `border-gold/30`, etc.
 *
 *   ink   #081840  the wordmark navy — headings, dark sections, footer
 *   gold  #d8b038  the ST monogram — the primary brand colour and every CTA
 *   mint  #10a878  the small square in the monogram — confirmations, ticks
 */
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#081840",
          50: "#f2f5fb",
          100: "#e3e9f5",
          200: "#c3cee6",
          300: "#93a6cf",
          400: "#5c76b0",
          500: "#365393",
          600: "#20397a",
          700: "#132763",
          800: "#0c1d50",
          900: "#081840",
          950: "#040d24",
        },
        gold: {
          DEFAULT: "#d8b038",
          50: "#fdfaef",
          100: "#faf2d6",
          200: "#f4e3ab",
          300: "#ecd078",
          400: "#e3be4f",
          500: "#d8b038",
          600: "#bd9226",
          700: "#9a7020",
          800: "#7c5921",
          900: "#66491f",
        },
        mint: {
          DEFAULT: "#10a878",
          50: "#eefbf5",
          100: "#d6f5e7",
          200: "#b0ead4",
          300: "#7bd8ba",
          400: "#43bf9a",
          500: "#10a878",
          600: "#068662",
          700: "#046b51",
          800: "#065541",
          900: "#064637",
        },
        ice: "#f2f5fa",
        sand: "#faf7ef",
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      maxWidth: {
        shell: "1240px",
      },
      boxShadow: {
        lift: "0 24px 60px -34px rgba(8,24,64,0.45)",
        card: "0 18px 44px -30px rgba(8,24,64,0.5)",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(14px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up": "fade-up .6s cubic-bezier(.22,.61,.36,1) both",
      },
    },
  },
  plugins: [],
};

export default config;
