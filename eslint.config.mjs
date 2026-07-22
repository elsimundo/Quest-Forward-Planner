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
    "next-env.d.ts",
    // Not app source — the client-approved mock-up we read for behaviour, and
    // static design-system/data assets. See CLAUDE.md.
    "reference/**",
    "design-system/**",
    "data/**",
  ]),
]);

export default eslintConfig;
