// This file is used to configure ESLint for a TypeScript project.
// It extends the recommended rules from ESLint and TypeScript ESLint plugin,
// and integrates Prettier for code formatting.
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import js from '@eslint/js';
import globals from 'globals';
import eslintConfigPrettier from 'eslint-config-prettier/flat';

export default defineConfig(
  {
    ignores: ['**/dist', '**/coverage', '**/cdk.out'],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.ts'],
    languageOptions: {
      ecmaVersion: 'latest',
      globals: globals.node,
    },
    plugins: {
      prettier: eslintConfigPrettier,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
  // Test override: allow require and any in test files
  {
    files: ['**/*.test.ts', '**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
);
