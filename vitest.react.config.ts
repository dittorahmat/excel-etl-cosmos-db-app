/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: [],
    watch: false,
    cache: false,
    isolate: false, // Disable test isolation to reduce memory usage
  },
});
