/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  build: {
    // Disable source maps to reduce memory usage
    sourcemap: false,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    testTimeout: 120000, // 120 second timeout for complex tests
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      enabled: false,
    },
    // Disable CSS processing
    css: false,
    pool: 'forks',
    poolOptions: {
      forks: {
        execArgv: ['--max-old-space-size=2048'],
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json'],
  },
  plugins: [
    react()
  ],
});
