/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Vazirmatn", "IRANSans", "Tahoma", "Arial", "sans-serif"],
      },
      animation: {
        "pulse-glow": "pulse-glow 2s infinite",
      },
      keyframes: {
        "pulse-glow": {
          "0%, 100%": { 
            transform: "scale(1)",
            filter: "drop-shadow(0 0 5px #ef4444)" 
          },
          "50%": { 
            transform: "scale(1.1)",
            filter: "drop-shadow(0 0 20px #ef4444)" 
          },
        },
      },
    },
  },
  plugins: [],
}