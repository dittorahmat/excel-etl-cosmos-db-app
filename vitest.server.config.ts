import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./test/setup.js'],
    include: ['test/**/*.{test,spec}.{js,ts}'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      '**/__mocks__/**'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'dist/**',
        '**/*.d.ts',
        '**/*.config.*',
        '**/*.setup.*',
        '**/coverage/**',
        '**/__mocks__/**',
        'test/**'
      ]
    },
    alias: {
      '@': './src',
      '@test': './test'
    },
    testTimeout: 10000,
    hookTimeout: 20000
  },
  resolve: {
    alias: {
      '@': './src',
      '@test': './test'
    }
  }
});