/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Only apply React plugin when not in test environment
const plugins = [];
if (process.env.NODE_ENV !== 'test') {
    plugins.push(react({
        jsxImportSource: '@emotion/react',
        babel: {
            plugins: ['@emotion/babel-plugin'],
        },
    }));
}
export default defineConfig({
    test: {
        // Test configuration
        globals: true,
        environment: 'jsdom',
        // Memory optimization - run tests in sequence
        sequence: { shuffle: false },
        // Test setup files - only load what's needed
        setupFiles: [
            './src/setupTests.ts',
            ...(process.env.NODE_ENV !== 'test' ? [] : ['./src/test/setup/testSetup.ts'])
        ],
        // Test mocks and cleanup
        mockReset: true,
        clearMocks: true,
        // Module resolution and mocks
        server: {
            deps: {
                // Force Vite to pre-bundle these dependencies
                inline: ['@azure/msal-react', '@azure/msal-browser'],
            },
        },
        // Dependency optimization for tests
        deps: {
            optimizer: {
                web: {
                    include: ['@azure/msal-react', '@azure/msal-browser'],
                },
            },
        },
        // Test coverage - disabled by default for performance
        coverage: {
            enabled: false, // Disable coverage by default to speed up tests
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            all: true,
            include: ['src/**/*.{ts,tsx}'],
            exclude: [
                '**/node_modules/**',
                '**/dist/**',
                '**/coverage/**',
                '**/public/**',
                '**/*.d.ts',
                '**/*.config.*',
                '**/test/setup/**',
                '**/__mocks__/**',
                '**/__tests__/**',
            ],
            thresholds: {
                lines: 0,
                functions: 0,
                branches: 0,
                statements: 0,
            },
        },
        // Performance optimizations
        css: false, // Disable CSS processing in tests
        watch: false // Disable file watching in test mode
    },
    resolve: {
        alias: {
            // MSAL mocks - these will be used in tests instead of the real packages
            '@azure/msal-react': path.resolve(__dirname, './src/__mocks__/@azure/msal-react.ts'),
            '@azure/msal-browser': path.resolve(__dirname, './src/__mocks__/@azure/msal-browser.ts'),
            // Source directory alias
            '@': path.resolve(__dirname, './src'),
        },
        extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json'],
    },
    plugins,
    // Add build-specific settings
    build: {
        // Enable source maps for better debugging
        sourcemap: true,
    },
    // Add server-specific settings
    server: {
        // Enable HMR for development
        hmr: process.env.NODE_ENV !== 'test',
    },
});
