// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      "dist/**",
    ]
  },
  eslint.configs.recommended,
  tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", {
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_",
        "ignoreRestSiblings": true, // Ignore unused destructured variables
        "caughtErrorsIgnorePattern": "^_" // Ignore unused catch variables starting with _
      }], // Allow unused variables starting with _
      "@typescript-eslint/no-explicit-any": "off", // Any can be useful in some cases
      "no-eval": "error", // Eval is evil
      "no-async-promise-executor": "off", // Cope
      "no-empty": ["error", { "allowEmptyCatch": true }], // Allow empty catch blocks
    }
  }
);
