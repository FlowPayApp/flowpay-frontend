/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: "#fafafa",
          card: "#ffffff",
          border: "#e8e8ec",
        },
        ink: {
          DEFAULT: "#0f172a",
          muted: "#64748b",
        },
        brand: {
          DEFAULT: "#4f46e5",
          soft: "#eef2ff",
        },
        accent: {
          amber: "#f59e0b",
          rose: "#f43f5e",
          emerald: "#10b981",
        },
      },
      boxShadow: {
        soft: "0 1px 3px rgba(15, 23, 42, 0.06), 0 8px 24px rgba(15, 23, 42, 0.06)",
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
      },
    },
  },
  plugins: [],
};
