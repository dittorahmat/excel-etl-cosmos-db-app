module.exports = {
  root: true,
  env: {
    node: true,
    browser: true,
    es2021: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:react-hooks/recommended',
  ],
  parser: '@babel/eslint-parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
    requireConfigFile: false,
    babelOptions: {
      presets: ['@babel/preset-env', '@babel/preset-react'],
    },
  },
  plugins: ['react-hooks', 'react-refresh'],
  settings: {
    react: {
      version: 'detect',
    },
  },
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
  },
  overrides: [
    // Server-side JavaScript files (exclude from TypeScript processing)
    {
      files: [
        'server/**/*.js',
        'server/test-*.js',
        'server/**/test-*.js',
        '**/test-*.js'
      ],
      excludedFiles: ['**/*.ts', '**/*.tsx'],
      parser: 'espree',
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          globalReturn: true,
          impliedStrict: true
        }
      },
      env: {
        node: true,
        es2021: true
      },
      rules: {
        'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      },
      // Explicitly disable TypeScript rules for these files
      extends: ['eslint:recommended'],
      plugins: []
    },
    // Client-side JavaScript files
    {
      files: ['**/*.js', '**/*.jsx'],
      excludedFiles: ['server/**/*.js'],
      parser: 'espree',
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
          globalReturn: false,
          impliedStrict: true
        }
      },
      env: {
        browser: true,
        es2021: true,
        node: true
      },
      rules: {
        'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      }
    },
    // TypeScript files
    {
      files: ['**/*.ts', '**/*.tsx'],
      extends: [
        'eslint:recommended',
        'plugin:react-hooks/recommended',
        'plugin:@typescript-eslint/recommended',
      ],
      parser: '@typescript-eslint/parser',
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
        project: './tsconfig.eslint.json',
        tsconfigRootDir: __dirname,
      },
      plugins: ['@typescript-eslint', 'react-hooks', 'react-refresh'],
      rules: {
        'react-refresh/only-export-components': [
          'warn',
          { allowConstantExport: true },
        ],
        '@typescript-eslint/no-explicit-any': 'warn',
        '@typescript-eslint/no-unused-vars': [
          'error',
          {
            argsIgnorePattern: '^_',
            varsIgnorePattern: '^_',
            caughtErrorsIgnorePattern: '^_',
          },
        ],
        'no-undef': 'off', // Handled by TypeScript
      },
    },
  ],
  ignorePatterns: [
    '**/node_modules',
    '**/dist',
    '**/build',
    '**/coverage',
    '**/.next',
    '**/out',
    '**/public',
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
  ],
};
