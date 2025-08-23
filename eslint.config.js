import globals from 'globals';
import pluginJs from '@eslint/js';
import pluginReactHooks from 'eslint-plugin-react-hooks';
import pluginReactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    files: ['src/**/*.{ts,tsx}', 'server/src/**/*.{ts,tsx}'],
    ignores: [
      // Standard ignores
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/.next/**',
      '**/out/**',
      '**/public/**',
      '**/*.d.ts',
      '**/__tests__/**',
      '**/*.test.*',
      '**/*.spec.*',
      '**/test/**',
      '**/test-utils/**',
      '**/__mocks__/**',
      '**/mocks/**',
      'vite.config.*',
      'vitest.*.config.*',
      // Additional directories to ignore
      'api/dist/**',
      'deployment/dist/**',
      'server/dist/**',
      'server/coverage/**',
      'server/dist_test/**',
      'test_deployment/dist/**',
      // Specific files to ignore
      'server.js',
      'test-files/**',
      'test/setup.js',
      // Problematic directories
      'src/__mocks__/**',
      'src/__tests__/**',
      'src/test/**',
      'server/src/__mocks__/**',
      'server/src/test/**',
      'server/src/test-utils/**',
    ],
    extends: [
      pluginJs.configs.recommended,
      ...tseslint.configs.recommended,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': pluginReactHooks,
      'react-refresh': pluginReactRefresh,
    },
    rules: {
      ...pluginReactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      // Allow unused variables that start with underscore
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { 
          'argsIgnorePattern': '^_',
          'varsIgnorePattern': '^_',
          'caughtErrorsIgnorePattern': '^_'
        }
      ],
      'no-unused-vars': [
        'warn',
        { 
          'argsIgnorePattern': '^_',
          'varsIgnorePattern': '^_',
          'caughtErrorsIgnorePattern': '^_'
        }
      ]
    },
  },
  {
    files: ['server/src/**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.node,
    },
    rules: {
      ...pluginJs.configs.recommended.rules,
    },
  }
);