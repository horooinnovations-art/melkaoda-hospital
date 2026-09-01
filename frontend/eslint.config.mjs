import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      // Every build directory, not an enumerated subset. `.next-v2/` was missing
      // from this list, so `npm run lint` reported 2,940 errors from compiled
      // chunks and generated route types while src/ had none — which made a lint
      // gate worthless, because it could never go green.
      ".next*/**",
      ".nv*/**",
      "out/**",
      "build/**",
      "dist/**",
      "coverage/**",
      "next-env.d.ts",
      "*.tsbuildinfo",
      ".lint-summary.cjs",
    ],
  },
];

export default eslintConfig;
