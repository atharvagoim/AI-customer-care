/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: { sans: ["Inter Variable", "Inter", "system-ui", "sans-serif"] },
      // Colours sampled from the Figma design
      colors: {
        pill: "#E6F4FE", // light pill buttons + user chat bubble
        ink: "#131621", // pill text
        bubble: "#E6E6E6", // AI bubble, chat controls
        card: "#F4F4F4", // dashboard cards, search, filters
        muted: "#7D7A7A", // dashboard labels/numbers
        soft: "#6B6969", // chat text, timestamps
        link: "#63BAF9", // "Back" pill text
        brand: "#1D43A2", // Dashboard / Analysis headings
        accent: "#E4632E", // AI resolution %
        chart: { 1: "#35589E", 2: "#688ECB", 3: "#8AB2F0", 4: "#B0CBF3" },
      },
    },
  },
  plugins: [],
};
