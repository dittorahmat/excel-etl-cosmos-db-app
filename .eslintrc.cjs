const path = require('path');

// Common configuration for both frontend and backend
const commonConfig = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  plugins: ['@typescript-eslint', 'react-hooks', 'react-refresh'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': ['error', { 
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
      caughtErrorsIgnorePattern: '^_'
    }],
    '@typescript-eslint/no-empty-object-type': 'off',
    'no-undef': 'error',
  },
  settings: {
    react: {
      version: 'detect',
    },
    'import/resolver': {
      node: {
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
      },
    },
  },
  overrides: [
    // Configuration for JavaScript files (e.g., config files)
    {
      files: ['*.js', '*.cjs'],
      env: {
        node: true,
      },
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
        '@typescript-eslint/no-unsafe-assignment': 'off',
        '@typescript-eslint/no-unsafe-member-access': 'off',
        '@typescript-eslint/no-unsafe-call': 'off',
      },
    },
  ],
};

// Frontend specific configuration
const frontendConfig = {
  ...commonConfig,
  env: {
    browser: true,
    es2020: true,
    node: false,
  },
  parserOptions: {
    ...commonConfig.parserOptions,
    project: path.resolve(__dirname, 'tsconfig.app.json'),
    tsconfigRootDir: __dirname,
  },
};

// Backend specific configuration
const backendConfig = {
  ...commonConfig,
  env: {
    node: true,
    es2020: true,
    browser: false,
  },
  parserOptions: {
    ...commonConfig.parserOptions,
    project: path.resolve(__dirname, 'tsconfig.server.json'),
    tsconfigRootDir: __dirname,
  },
};

module.exports = {
  root: true,
  // Base configuration that applies to all files
  ...commonConfig,
  ignorePatterns: [
    'dist',
    'node_modules',
    'coverage',
    '**/*.d.ts',
    'server/dist',
    'server/coverage',
    '**/__tests__/**',
    '**/*.test.ts',
    '**/*.spec.ts',
    '**/test/**',
    '**/test-utils/**',
    '**/__mocks__/**',
    '**/mocks/**',
  ],
  overrides: [
    // Apply frontend config to frontend files
    {
      files: ['src/**/*.{ts,tsx,js,jsx}'],
      ...frontendConfig,
    },
    // Apply backend config to backend files
    {
      files: ['server/**/*.ts'],
      ...backendConfig,
    },
    // Handle test files
    {
      files: ['**/*.test.{ts,tsx,js,jsx}'],
      env: {
        jest: true,
      },
      rules: {
        ...commonConfig.rules,
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
      },
    },
  ],
};
