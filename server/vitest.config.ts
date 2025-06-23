/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./test/minimal-setup.ts'],
    include: ['test/**/*.{test,spec}.{ts,js}'],
    exclude: [
      'node_modules',
      'dist',
      'test/backup_js_tests/**/*.test.{js,ts}'
    ],
    testTimeout: 60000,
    clearMocks: true,
    watch: false,
    silent: true,
    hookTimeout: 30000,
    teardownTimeout: 30000,
    // Disable type checking during test runs for now
    typecheck: {
      enabled: false
    },
    // Set up module mocking
    deps: {
      inline: ['@azure/cosmos']
    },
    // Set up test environment
    environmentOptions: {
      NODE_ENV: 'test'
    },
    coverage: {
      provider: 'v8',
      reporter: ['text'],
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      exclude: [
        'node_modules/'
      ]
        '**/*.test.{js,ts}',
        'src/types/**',
        'src/config/**',
        'src/server.ts'
      ],
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100
      }
    },
    setupFiles: ['./test/setup.ts']
  },
  resolve: {
    alias: [
      {
        find: /^@\/(.*)$/,
        replacement: resolve(__dirname, './src/$1')
      }
    ],
    extensions: ['.ts', '.js', '.json']
  },
  // Ensure proper module resolution
  esbuild: {
    target: 'es2020'
  }
});
