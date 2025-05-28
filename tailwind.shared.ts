import type { Config } from "tailwindcss";

const tailwindConfig: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      screens: {
        "3xl": "1920px", // FHD
      },
      colors: {
        // primary:         "#1d4ed8", // ???-blue-700
        // secondary:       "#6b7280", // ???-gray-500
        // info:            "#0ea5e9", // ???-sky-500
        // success:         "#16a34a", // ???-green-600
        // warning:         "#ca8a04", // ???-yellow-600
        // error:           "#dc2626", // ???-red-600
      },
    },
  },
  plugins: [],
};

export default tailwindConfig;
