import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#F5F0E8",
        surface: "#FFFFFF",
        ink: "#1A1A1A",
        muted: "#6B6560",
        line: "#DDD8D0",
        accent: "#C44A2D",
        dark: "#141414",
        light: "#FAF8F4",
        success: "#287A55",
        error: "#B83232",
        warning: "#D4920D",
      },
      fontFamily: {
        serif: ["Cormorant Garamond", "Georgia", "serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      maxWidth: {
        content: "1440px",
      },
      fontSize: {
        "hero-lg": ["clamp(2.625rem, 6vw, 6rem)", { lineHeight: "1.02", letterSpacing: "-0.02em" }],
        "section-lg": ["clamp(1.875rem, 4vw, 3.5rem)", { lineHeight: "1.05", letterSpacing: "-0.01em" }],
      },
      transitionTimingFunction: {
        editorial: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
