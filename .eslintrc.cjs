module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
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
    '@typescript-eslint/no-empty-object-type': 'warn',
    'no-undef': 'error',
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
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
    'vitest.config.*',
    'tailwind.config.*',
    'postcss.config.*',
    'jest.config.*',
    '**/test-*',
    'server/test/**/*.ts',
    '.eslintrc.cjs',
    'remove-js-duplicates.mjs',
    'remove-js-duplicates.js',
    'server/scripts/monitor-auth.js',
    'server.js'
  ],
  overrides: [
    {
      files: ['src/**/*.{ts,tsx}', '@/**/*'],
      parserOptions: {
        project: ['./tsconfig.app.json'],
      },
      env: {
        browser: true,
      },
      globals: {
        console: 'readonly',
      },
      rules: {
        'react/react-in-jsx-scope': 'off',
        'no-undef': 'off',
      }
    },
    {
      files: ['server/**/*.ts'],
      parserOptions: {
        project: ['./server/tsconfig.json'],
      },
      env: {
        node: true,
      },
      rules: {
        '@typescript-eslint/no-empty-object-type': 'off',
      },
      globals: {
        NodeJS: 'readonly',
        crypto: 'readonly',
        Express: 'readonly',
        query: 'readonly',
        parameters: 'readonly',
      }
    },
    {
        files: ['server/test/**/*.ts'],
        parserOptions: {
            project: ['./server/tsconfig.test.json'],
        },
        env: {
            node: true,
            jest: true,
        },
    },
    {
      files: ['*.js', '*.cjs', '*.mjs'],
      env: {
        node: true,
        browser: true,
      },
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
      },
    },
    {
      files: ['src/**/*.{js,jsx}'],
      env: {
        browser: true,
      },
      globals: {
        console: 'readonly',
      },
      rules: {
        'no-undef': 'error',
      },
    },
    {
      files: ['vitest.setup.ts'],
      env: {
        node: true,
        jest: true,
        browser: true,
      },
      parserOptions: {
        project: ['./tsconfig.node.json'],
      },
      globals: {
        vi: 'readonly',
        beforeEach: 'readonly',
        afterAll: 'readonly',
      }
    }
  ],
};
