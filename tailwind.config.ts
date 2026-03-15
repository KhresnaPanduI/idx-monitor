import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#fbfbfb", // Very subtle off-white/gray
        "background-alt": "#ffffff", // Pure white for cards/surfaces
        foreground: "#0f172a", // Slate/charcoal for main text
        "foreground-muted": "#64748b", // Slate for muted text
        accent: "#4f46e5", // Crisp Indigo
        border: "#e2e8f0", // Soft, light border
      },
      fontFamily: {
        sans: ["var(--font-space-grotesk)"],
        display: ["var(--font-instrument-serif)"],
      },
      boxShadow: {
        soft: "0 4px 20px -2px rgba(0, 0, 0, 0.05)",
        float: "0 8px 30px -4px rgba(0, 0, 0, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
