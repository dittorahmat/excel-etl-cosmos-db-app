/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    mockReset: true,
    clearMocks: true,
    testTimeout: 10000,
    setupFiles: ['./server/test/setup.ts'],
    include: ['**/server/test/**/*.test.{js,ts}'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/.git/**'],
    coverage: {
      enabled: false,
    },
    cache: false,
    // Configure TypeScript
    typecheck: {
      enabled: true,
      include: ['**/*.test.ts'],
    },
    // Server configuration
    server: {
      deps: {
        // Ensure proper handling of ESM modules
        inline: [
          'uuid',
          'express',
          'multer',
          'xlsx',
          '@azure/cosmos',
          '@azure/storage-blob'
        ]
      }
    },
    // Dependencies optimization
    deps: {
      optimizer: {
        web: {
          include: ['uuid', 'express', 'multer', 'xlsx', '@azure/cosmos', '@azure/storage-blob']
        }
      },
      // Ensure proper module resolution for test files
      moduleDirectories: ['node_modules', 'server/src']
    },
  },
  logLevel: 'info',
  resolve: {
    alias: [
      {
        find: '@',
        replacement: path.resolve(__dirname, './server/src'),
      },
      // Add more aliases as needed
      {
        find: /^\.\/(.*)\.js$/,
        replacement: './$1.ts',
      },
      {
        find: /^(.*)\/(.*)\.js$/,
        replacement: '$1/$2.ts',
      },
      {
        find: '@/test-utils',
        replacement: path.resolve(__dirname, './server/src/test-utils'),
      },
      // Add alias for uuid to ensure consistent resolution
      {
        find: 'uuid',
        replacement: 'uuid',
      },
    ],
    extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json'],
  },
  // Ensure proper ESM module handling
  esbuild: {
    target: 'es2020',
  },
});
