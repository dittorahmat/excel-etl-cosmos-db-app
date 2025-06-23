/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    globals: true,
    environment: 'node', // Use node environment for minimal setup
    setupFiles: [], // No setup files for minimal test
    mockReset: true,
    clearMocks: true,
    coverage: {
      enabled: false, // Disable coverage for minimal test
    },
    // Disable all file watching and caching
    watch: false,
    cache: false,
  },
  resolve: {
    alias: {
      // Minimal aliases
      '@': path.resolve(__dirname, './src'),
    },
  },
});
