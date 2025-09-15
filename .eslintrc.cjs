module.exports = {
  root: true,
  env: {
    browser: true,
    node: true,
    es2020: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    project: ['./tsconfig.client.json', './server/tsconfig.json'],
    tsconfigRootDir: __dirname,
    createDefaultProgram: true,
  },
  plugins: ['@typescript-eslint', 'react', 'react-hooks', 'prettier'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'prettier',
  ],
  rules: {
    'prettier/prettier': 'error',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
  overrides: [
    {
      files: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
      env: {
        jest: true,
      },
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
      },
    },
    {
      files: ['server/src/**/*.{ts,tsx}'],
      parserOptions: {
        project: ['./server/tsconfig.json'],
      },
    },
    {
      files: ['src/**/*.{ts,tsx}'],
      parserOptions: {
        project: ['./tsconfig.client.json'],
      },
    },
  ],
  ignorePatterns: [
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
  ],
};