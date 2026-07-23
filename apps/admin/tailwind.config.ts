import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#F5F3EF",
        surface: "#FFFDF9",
        ink: "#191817",
        muted: "#625D58",
        line: "#DDD6CE",
        accent: "#B8442A",
        dark: "#191817",
        success: "#059669",
        error: "#DC2626",
        warning: "#D97706",
        info: "#2563EB",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
