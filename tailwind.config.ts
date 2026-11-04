/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-hind)", "sans-serif"],
        display: ["var(--font-yatra)", "sans-serif"],
      },
      colors: {
        shikhar: {
          dawn: "#FDE68A",
          day: "#93C5FD",
          dusk: "#1E3A8A",
          night: "#0F172A",
        },
      },
    },
  },
  plugins: [],
};
