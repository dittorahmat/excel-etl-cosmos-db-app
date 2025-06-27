/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    mockReset: true,
    clearMocks: true,
    testTimeout: 120000, // 120 second timeout for complex tests
    include: ['src/**/*.{test,spec}.{js,ts,jsx,tsx}'],
    coverage: {
      enabled: false,
    },
    cache: false,
    isolate: false,
    // Disable file watching and HMR
    server: {
      watch: null,
      hmr: false,
    },
    // Disable threads to reduce memory usage
    threads: false,
    // Disable source maps
    sourcemap: false,
    // Disable CSS processing
    css: false,
    // Disable test file watching
    watchExclude: ['**/*'],
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
