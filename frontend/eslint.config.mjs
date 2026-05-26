import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

import noForceDynamicExport from "./eslint-rules/no-force-dynamic-export.mjs";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    files: ["src/app/**/*.{tsx,ts,jsx,js}"],
    plugins: {
      local: {
        rules: {
          "no-force-dynamic-export": noForceDynamicExport,
        },
      },
    },
    rules: {
      "local/no-force-dynamic-export": "error",
    },
  },
]);

export default eslintConfig;
