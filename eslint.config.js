import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import pluginReact from 'eslint-plugin-react';
import pluginReactHooks from 'eslint-plugin-react-hooks';
import pluginReactRefresh from 'eslint-plugin-react-refresh';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  pluginReact.configs.flat?.recommended || {},
  {
    files: ['src/**/*.{ts,tsx}', 'server/src/**/*.{ts,tsx}'],
    ignores: [
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
      'api/dist/**',
      'deployment/dist/**',
      'server/dist/**',
      'server/coverage/**',
      'server/dist_test/**',
      'test_deployment/dist/**',
      'server.js',
      'test-files/**',
      'test/setup.js',
      'src/__mocks__/**',
      'src/__tests__/**',
      'src/test/**',
      'server/src/__mocks__/**',
      'server/src/test/**',
      'server/src/test-utils/**',
    ],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      parserOptions: {
        project: './tsconfig.json',
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        fetch: 'readonly',
        Promise: 'readonly',
        // Node.js globals
        require: 'readonly',
        module: 'readonly',
        exports: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        // Jest globals
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
      },
    },
    plugins: {
      react: pluginReact,
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
    settings: {
      react: {
        version: 'detect',
      },
    },
  }
);