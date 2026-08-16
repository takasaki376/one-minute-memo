import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "public/sw.js",
    "next-env.d.ts",
  ]),
  // CommonJS スクリプトは ESM 前提の parserOptions を外し、lint 対象に残す
  {
    files: ["scripts/**/*.cjs"],
    languageOptions: {
      sourceType: "commonjs",
      parserOptions: {
        project: null,
        projectService: false,
      },
    },
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
]);

export default eslintConfig;
