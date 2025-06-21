/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
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
    },
});
