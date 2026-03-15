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
        border: "#cbd5e1", // Slightly stronger cool slate border
      },
      fontFamily: {
        sans: ["var(--font-source-sans-3)"],
        display: ["var(--font-source-serif-4)"],
      },
      boxShadow: {
        soft: "0 10px 28px -14px rgba(15, 23, 42, 0.16), 0 4px 14px -8px rgba(79, 70, 229, 0.08)",
        float: "0 18px 42px -22px rgba(15, 23, 42, 0.22), 0 10px 22px -14px rgba(79, 70, 229, 0.12)",
      },
    },
  },
  plugins: [],
};

export default config;
