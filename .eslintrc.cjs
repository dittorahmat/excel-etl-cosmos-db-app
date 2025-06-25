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
    project: [
      path.join(__dirname, 'tsconfig.json'),
      path.join(__dirname, 'tsconfig.node.json'),
      path.join(__dirname, 'tsconfig.app.json'),
      path.join(__dirname, 'tsconfig.server.json'),
      path.join(__dirname, 'server', 'tsconfig.json'),
      path.join(__dirname, 'server', 'tsconfig.test.json'),
      path.join(__dirname, 'api', 'tsconfig.json') // Add tsconfig for api folder
    ],
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
        '@typescript-eslint/no-var-requires': 'off',
        'no-console': 'off',
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
    // Configuration for test files
    {
      files: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx'],
      env: {
        jest: true,
        node: true,
      },
      rules: {
        '@typescript-eslint/no-non-null-assertion': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-unsafe-assignment': 'off',
        '@typescript-eslint/no-unsafe-member-access': 'off',
        '@typescript-eslint/no-unsafe-call': 'off',
      },
    },
    // Configuration for Vite config files
    {
      files: ['vite.config.*', '**/vite.config.*'],
      parserOptions: {
        sourceType: 'module',
        ecmaVersion: 'latest',
      },
      env: {
        node: true,
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
    node: false
  },
  globals: {
    JSX: 'readonly',
  },
  parserOptions: {
    ...commonConfig.parserOptions,
    project: path.join(__dirname, 'tsconfig.app.json'),
    tsconfigRootDir: __dirname,
    ecmaFeatures: {
      jsx: true,
    },
  },
  settings: {
    ...commonConfig.settings,
    react: {
      version: 'detect',
    },
  },
};

// Server-specific configuration
const serverConfig = {
  ...commonConfig,
  env: {
    ...commonConfig.env,
    node: true,
    browser: false,
  },
  globals: {
    Express: 'readonly', // Add Express global
  },
  parserOptions: {
    ...commonConfig.parserOptions,
    project: path.join(__dirname, 'tsconfig.server.json'),
  },
  rules: {
    ...commonConfig.rules,
    // Add any server-specific rules here
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
  globals: {
    // Node.js globals
    Buffer: 'readonly',
    process: 'readonly',
    URL: 'readonly',
    URLSearchParams: 'readonly',
    console: 'readonly',
    NodeJS: 'readonly', // Add NodeJS global
  },
  parserOptions: {
    ...commonConfig.parserOptions,
    project: path.join(__dirname, 'tsconfig.server.json'),
    tsconfigRootDir: __dirname,
  },
};

module.exports = {
  root: true,
  // Base configuration that applies to all files
  ...commonConfig,
  // Configure TypeScript project references
  settings: {
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
        project: ['./tsconfig.json', './tsconfig.node.json'],
      },
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
    'server/test/**/*.ts'
  ],
  overrides: [
    // Handle TypeScript declaration files
    {
      files: ['**/*.d.ts'],
      parser: '@typescript-eslint/parser',
      parserOptions: {
        project: null, // Don't require tsconfig for .d.ts files
      },
      rules: {
        '@typescript-eslint/no-unused-vars': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
      },
    },
    // Apply frontend config to frontend files
    {
      files: ['src/**/*.{ts,tsx,js,jsx}', 'components/**/*.{ts,tsx,js,jsx}', 'hooks/**/*.{ts,tsx,js,jsx}'],
      ...frontendConfig,
      rules: {
        ...frontendConfig.rules,
        'no-undef': 'off', // TypeScript handles this
        'react/react-in-jsx-scope': 'off', // Not needed with React 17+
      },
    },
    // Apply backend config to backend files
    {
      files: ['server/**/*.ts'],
      ...backendConfig,
      rules: {
        ...backendConfig.rules,
        'no-console': 'off', // Allow console in backend
        '@typescript-eslint/no-empty-object-type': 'off', // Explicitly turn off for backend
      },
    },
    // Handle test files
    {
      files: ['**/*.test.{ts,tsx,js,jsx}', 'server/test/**/*.{ts,tsx,js,jsx}'],
      env: {
        node: true,
        browser: true,
        es2020: true
      },
      globals: {
        vi: 'readonly',
        expect: 'readonly',
        it: 'readonly',
        describe: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
      },
      parserOptions: {
        ...commonConfig.parserOptions,
        project: path.join(__dirname, 'server', 'tsconfig.test.json'),
      },
      rules: {
        ...commonConfig.rules,
        // Relax rules for test files
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
        '@typescript-eslint/no-require-imports': 'off',
        'no-console': 'off',
        'no-undef': 'off',
      },
      env: {
        node: true,
        browser: true,
        es2020: true
      },
      globals: {
        vi: 'readonly',
        expect: 'readonly',
        it: 'readonly',
        describe: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
      },
      rules: {
        ...commonConfig.rules,
        // Relax rules for test files
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
        '@typescript-eslint/no-require-imports': 'off',
        'no-console': 'off',
        'no-undef': 'off',
      },
    },
    // Handle root-level JavaScript files that are not part of a specific project
    {
      files: ['*.js', '*.mjs'],
      parserOptions: {
        project: null, // Do not require tsconfig for these files
      },
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
        '@typescript-eslint/explicit-module-boundary-types': 'off',
        '@typescript-eslint/no-unsafe-assignment': 'off',
        '@typescript-eslint/no-unsafe-member-access': 'off',
        '@typescript-eslint/no-unsafe-call': 'off',
        'no-undef': 'off',
        '@typescript-eslint/no-require-imports': 'off', // Allow require in root-level js files
      },
    },
    // Configuration for server-side JavaScript scripts
    {
      files: ['server/scripts/*.js'],
      parserOptions: {
        project: null, // Do not require tsconfig for these files
      },
      env: {
        node: true,
      },
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
        '@typescript-eslint/no-unsafe-assignment': 'off',
        '@typescript-eslint/no-unsafe-member-access': 'off',
        '@typescript-eslint/no-unsafe-call': 'off',
        '@typescript-eslint/no-require-imports': 'off', // Allow require in these scripts
      },
    },
    // Configuration for server-side TypeScript scripts
    {
      files: ['server/scripts/*.ts'],
      parserOptions: {
        project: null, // Do not require tsconfig for these files
      },
      env: {
        node: true,
      },
      rules: {
        '@typescript-eslint/no-explicit-any': 'off', // Relax any rule for scripts if needed
        '@typescript-eslint/no-unused-vars': 'off', // Relax unused vars for scripts if needed
      },
    },
    // Configuration for Vitest config files
    {
      files: ['vitest.config.*', '**/vitest.config.*'],
      parserOptions: {
        project: null, // Do not require tsconfig for these files
      },
      env: {
        node: true,
      },
    },

  ],
};
