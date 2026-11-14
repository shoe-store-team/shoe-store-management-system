import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores(["dist", "node_modules", "src/generated"]),
  {
    files: ["src/**/*.ts", "tests/**/*.ts"],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: {
      globals: globals.node,
      parserOptions: {
        // Chỉ rõ tsconfig của apps/api, tránh lẫn với apps/web khi mở cả dự án trong VS Code
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
]);
