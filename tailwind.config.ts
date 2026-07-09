import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#0F4C81", // primary navy blue
          light: "#3D7AB0",
          dark: "#0A3760",
        },
        accent: {
          DEFAULT: "#F2A93B", // gold accent
          light: "#F7C36B",
        },
        status: {
          active: "#22C55E",
          suspended: "#EAB308",
          disabled: "#EF4444",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "0.75rem",
      },
    },
  },
  plugins: [],
};

export default config;
