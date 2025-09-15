// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    // Ignore patterns
    ignores: [
      '**/dist',
      '**/node_modules',
      '**/coverage',
      '**/*.d.ts',
      '**/__tests__/**',
      '**/*.test.ts',
      '**/*.spec.ts',
      '**/test/**',
      '**/test-utils/**',
      '**/__mocks__/**',
      '**/mocks/**',
      '**/vite.config.*'
    ]
  },
  {
    // Base configuration
    files: ['**/*.{ts,tsx}'],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended
    ],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module'
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }]
    }
  }
);