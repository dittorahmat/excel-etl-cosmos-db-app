import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts', './tests/setup.ts'],
    include: ['src/**/*.{test,spec}.{js,jsx,ts,tsx}'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/server/**'
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
        '**/test/**',
        '**/__tests__/**',
        '**/__mocks__/**',
        'server/**'
      ]
    },
    alias: {
      '@': './src'
    },
    deps: {
      optimizer: {
        web: {
          exclude: ['@testing-library/user-event']
        }
      }
    },
    css: {
      modules: {
        classNameStrategy: 'non-scoped'
      }
    },
    testTimeout: 10000,
    hookTimeout: 20000
  },
  resolve: {
    alias: {
      '@': './src'
    }
  }
});