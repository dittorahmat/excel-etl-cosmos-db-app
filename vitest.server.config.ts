/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  cacheDir: './node_modules/.vite',
  
  test: {
    globals: true,
    environment: 'node',
    
    include: ['**/server/test/**/*.test.{js,ts}'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.git/**',
      '**/backup_js_tests/**',
      'vitest.setup.ts'
    ],
    
    setupFiles: ['./server/test/setup.ts'],
    
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
    
    reporters: [
      'default',
      ['vitest-sonar-reporter', {
        outputFile: 'test-results/sonar-report.xml'
      }]
    ],
    
    coverage: {
      enabled: true,
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: 'coverage/server',
      clean: true,
      cleanOnRerun: true,
      exclude: [
        '**/node_modules/**',
        '**/test/**',
        '**/dist/**',
        '**/*.d.ts',
        '**/*.config.*',
        '**/types/**',
        '**/__mocks__/**',
        '**/test-utils/**',
        '**/fixtures/**'
      ]
    },
    
    typecheck: {
      enabled: true,
      include: ['**/*.test.ts']
    },
    
    deps: {
      interopDefault: true,
      optimizer: {
        web: {
          include: [
            'vitest',
            'vitest-mock-extended',
            'uuid',
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
    }
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
