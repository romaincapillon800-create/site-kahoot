import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cyber: {
          bg: "#050510",
          surface: "#0a0a1a",
          card: "rgba(15, 15, 35, 0.6)",
          border: "rgba(99, 102, 241, 0.2)",
          neon: {
            blue: "#00d4ff",
            purple: "#a855f7",
            pink: "#ec4899",
            green: "#10b981",
          },
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      animation: {
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "gradient-shift": "gradient-shift 8s ease infinite",
        float: "float 6s ease-in-out infinite",
      },
      keyframes: {
        "pulse-glow": {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "1" },
        },
        "gradient-shift": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-20px)" },
        },
      },
      backgroundImage: {
        "cyber-gradient":
          "linear-gradient(135deg, #050510 0%, #0f0f2e 50%, #1a0a2e 100%)",
        "neon-gradient":
          "linear-gradient(135deg, #00d4ff 0%, #a855f7 50%, #ec4899 100%)",
      },
      boxShadow: {
        neon: "0 0 20px rgba(0, 212, 255, 0.3), 0 0 40px rgba(168, 85, 247, 0.2)",
        "neon-lg":
          "0 0 30px rgba(0, 212, 255, 0.4), 0 0 60px rgba(168, 85, 247, 0.3)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
