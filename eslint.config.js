import js from "@eslint/js";
import globals from "globals";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores(["dist", "node_modules"]),
  {
    files: ["src/**/*.{js,jsx}"],
    extends: [js.configs.recommended, reactHooks.configs.flat.recommended, reactRefresh.configs.vite],
    plugins: { react },
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaVersion: "latest", ecmaFeatures: { jsx: true }, sourceType: "module" },
    },
    rules: {
      "react/jsx-uses-vars": "error",
      "no-unused-vars": ["error", { varsIgnorePattern: "^[A-Z_]" }],
    },
  },
  {
    files: ["server/**/*.js", "*.config.js"],
    extends: [js.configs.recommended],
    languageOptions: { globals: globals.node, ecmaVersion: "latest", sourceType: "module" },
  },
]);
