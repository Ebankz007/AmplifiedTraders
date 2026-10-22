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
    // The Prisma client is GENERATED code (`prisma generate` writes it to
    // lib/generated/prisma). Linting it produced hundreds of errors that no
    // human wrote and no human can fix — CommonJS require() imports, `module`
    // assignments, `this` aliasing. It is not our code and it changes on every
    // schema change, so it must never be linted.
    "lib/generated/**",
    // Deploy scratch directories: a staging build lives here until it is
    // swapped into .next.
    ".next-staging/**",
    ".next.previous/**",
  ]),
]);

export default eslintConfig;
