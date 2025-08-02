/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, 'server');

export default defineConfig({
  cacheDir: './node_modules/.vite',
  
  test: {
    globals: true,
    environment: 'node',
    typecheck: {
      include: ['**/*.test.ts'],
    },
    root: root,
    include: [
      path.join(root, 'test/**/*.test.{js,ts}'),
      path.join(root, '**/test/**/*.test.{js,ts}')
    ],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.git/**',
      '**/backup_js_tests/**',
      'vitest.setup.ts'
    ],
    
    setupFiles: [path.join(root, 'test/setup.ts')],
    
    environmentOptions: {
      NODE_ENV: 'test',
      TZ: 'UTC'
    },
    
    testTimeout: 10000,
    hookTimeout: 30000,
    teardownTimeout: 10000,
    isolate: true,
    
    mockReset: true,
    clearMocks: true,
    restoreMocks: true,
    
    silent: false,
    logHeapUsage: false,
    update: false,
    watch: false,
    
    reporters: ['default'],
    
    coverage: {
      enabled: true,
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: 'coverage/server',
      clean: true,
      cleanOnRerun: true,
      include: ['server/src/**/*.ts'],
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/*.d.ts',
        '**/*.config.*',
        '**/types/**',
        '**/__mocks__/**',
        '**/test-utils/**',
        '**/fixtures/**'
      ]
    },
    
    deps: {
      interopDefault: true,
      optimizer: {
        web: {
          include: [
            'vitest',
            'vitest-mock-extended',
            
            
            'crypto',
            'express',
            'multer',
            'xlsx',
            '@azure/cosmos',
            '@azure/storage-blob',
            '@azure/msal-node',
            'jsonwebtoken'
          ]
        }
      },
      moduleDirectories: [
        'node_modules',
        'server/src',
        'server/test'
      ]
    },
    
    
  },

  resolve: {
    alias: [
      {
        find: '@',
        replacement: path.resolve(__dirname, './server/src')
      },
      {
        find: '@test',
        replacement: path.resolve(__dirname, './server/test')
      },
      {
        find: '@server',
        replacement: path.resolve(__dirname, './server/src')
      },
      {
        find: /\.\/(.*)\.js$/,
        replacement: './$1.ts'
      },
      {
        find: /^(.*)\/(.*)\.js$/,
        replacement: '$1/$2.ts'
      }
    ]
  },
  
  build: {
    target: 'es2020',
    sourcemap: true
  },
  
  logLevel: 'warn',
  
  esbuild: {
    target: 'es2022'
  }
});
