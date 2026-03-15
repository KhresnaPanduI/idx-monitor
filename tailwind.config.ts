import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#10121a",
        mist: "#ecf1eb",
        paper: "#f7f6f2",
        pine: "#103b2d",
        ember: "#f28d35",
        marine: "#0b6b88",
        sand: "#d6c9b4",
      },
      fontFamily: {
        sans: ["var(--font-space-grotesk)"],
        display: ["var(--font-instrument-serif)"],
      },
      boxShadow: {
        panel: "0 20px 70px rgba(16, 18, 26, 0.12)",
      },
    },
  },
  plugins: [],
};

export default config;
