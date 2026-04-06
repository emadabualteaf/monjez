/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "../../lib/ui/src/**/*.{js,ts,jsx,tsx}",
    "../../lib/shared/**/*.{js,ts,jsx,tsx}", // استهدف مجلدات الكود فقط
  ],
  theme: {
    extend: {
      colors: {
        primary: "hsl(var(--primary))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
      },
    },
  },
  plugins: [],
}