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
      ".next/**",
      // Isolated build dirs used to verify a build without disturbing a running
      // dev server. Linting compiled output produced ~2800 no-require-imports
      // errors from minified chunks and buried the real source warnings.
      ".next-verify*/**",
      ".nvtmp/**",
      ".nvout/**",
      ".nvwork/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
];

export default eslintConfig;
