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
          bg: "#000000",
          surface: "#1a1a1a",
          card: "rgba(10, 10, 10, 0.6)",
          border: "rgba(200, 200, 200, 0.2)",
          neon: {
            blue: "#ffffff",
            purple: "#cccccc",
            pink: "#999999",
            green: "#666666",
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
          "linear-gradient(135deg, #0a0a0a 0%, #121212 45%, #1d1d1d 100%)",
        "neon-gradient":
          "linear-gradient(135deg, #ffffff 0%, #cccccc 50%, #999999 100%)",
      },
      boxShadow: {
        neon: "0 0 20px rgba(255, 255, 255, 0.1), 0 0 40px rgba(200, 200, 200, 0.05)",
        "neon-lg":
          "0 0 30px rgba(255, 255, 255, 0.15), 0 0 60px rgba(200, 200, 200, 0.1)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
