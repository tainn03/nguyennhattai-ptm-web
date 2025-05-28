import type { Config } from "tailwindcss";

import sharedConfig from "./tailwind.shared";

const tailwindConfig: Config = {
  ...sharedConfig,
  plugins: [require("@tailwindcss/forms")],
};

export default tailwindConfig;
