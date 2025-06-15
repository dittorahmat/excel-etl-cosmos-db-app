import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(path.dirname(fileURLToPath(import.meta.url)), './src'),
    },
  },
  build: {
    sourcemap: true,
  },
  server: {
    port: 3000,
    open: true,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup/globalSetup.ts', './src/setupTests.ts'],
    clearMocks: true,
    restoreMocks: true,
    mockReset: true,
    testTimeout: 10000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/coverage/**',
        '**/public/**',
        '**/*.d.ts',
        '**/*.config.*',
        '**/test/setup/**',
        '**/__mocks__/**',
      ],
      include: ['src/**/*.{ts,tsx}'],
    },
    environmentOptions: {
      jsdom: {
        url: 'http://localhost:3000',
        resources: 'usable',
        runScripts: 'dangerously',
      },
    },
    exclude: ['**/server/**', '**/node_modules/**'],
  },
  define: {
    'process.env': {}
  },
})
