import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#00AEFF",
          strong: "#0077B6",
          soft: "#E6F7FF",
        },
        ink: "#0F1D26",
        heading: "#1F2A33",
        body: "#5B6770",
        muted: "#5F6B73",
        line: "#DCE0E0",
        surface: "#FFFFFF",
        canvas: "#F6F8F9",
        success: {
          DEFAULT: "#146C43",
          tint: "#E7F4EE",
        },
        warning: {
          DEFAULT: "#F5B301",
          tint: "#FFF4D6",
          text: "#664D03",
        },
        danger: {
          DEFAULT: "#B02A37",
          tint: "#FCEAEC",
        },
        info: "#0B5E86",
      },
      fontFamily: {
        sans: ["Roboto", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        display: ["Roboto Slab", "Georgia", "Times New Roman", "serif"],
      },
      borderRadius: {
        sm: "4px",
        md: "8px",
        lg: "12px",
        pill: "999px",
      },
      maxWidth: {
        container: "1240px",
        wide: "1440px",
        measure: "760px",
      },
      boxShadow: {
        xs: "0 1px 2px rgba(15,29,38,.06)",
        sm: "0 2px 8px rgba(15,29,38,.08)",
        md: "0 12px 32px rgba(15,29,38,.12)",
      },
      spacing: {
        18: "4.5rem",
        22: "5.5rem",
        30: "7.5rem",
      },
      transitionTimingFunction: {
        out: "cubic-bezier(.22,1,.36,1)",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-400px 0" },
          "100%": { backgroundPosition: "400px 0" },
        },
        "slide-in-right": {
          from: { transform: "translateX(100%)" },
          to: { transform: "translateX(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
      },
      animation: {
        shimmer: "shimmer 1.4s linear infinite",
        "slide-in-right": "slide-in-right 300ms cubic-bezier(.22,1,.36,1)",
        "fade-in": "fade-in 200ms cubic-bezier(.22,1,.36,1)",
      },
    },
  },
};

export default config;