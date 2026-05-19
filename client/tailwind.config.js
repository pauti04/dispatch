/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ['"DM Serif Display"', "Georgia", "serif"],
        serif: ['"Crimson Pro"', "Georgia", "serif"],
        sans: ['"Inter"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      colors: {
        ink: "#0d0c0a",
        paper: "#f4ecdc",
        muted: "#a89c84",
        gold: "#c9a14a",
        rule: "#3a3530",
      },
    },
  },
  plugins: [],
};
