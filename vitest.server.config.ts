/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    globals: true,
    environment: 'node', // Use node environment for server tests
    mockReset: true,
    clearMocks: true,
    testTimeout: 10000, // 10 second timeout for server tests
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
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json'],
  },
});
