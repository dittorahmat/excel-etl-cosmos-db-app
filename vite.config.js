import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    build: {
        sourcemap: true,
    },
    server: {
        port: 3000,
        open: true,
        proxy: {
            // Proxy API requests to the backend server
            '/api': {
                target: 'http://localhost:3001', // Backend server port
                changeOrigin: true,
                secure: false,
                // Don't rewrite the path, let the backend handle /api prefix
                // rewrite: (path) => path.replace(/^\/api/, '')
            },
            // Proxy auth requests to the backend
            '/.auth': {
                target: 'http://localhost:3001',
                changeOrigin: true,
                secure: false
            }
        }
    },
    define: {
        'process.env': {}
    },
});
