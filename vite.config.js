import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
    // Load all environment variables with VITE_ prefix
    const env = loadEnv(mode, process.cwd(), '');
    
    // Log environment variables for debugging
    console.log('Vite Config - Mode:', mode);
    console.log('Vite Config - Environment variables:', {
        VITE_AUTH_ENABLED: env.VITE_AUTH_ENABLED,
        VITE_AZURE_CLIENT_ID: env.VITE_AZURE_CLIENT_ID,
        NODE_ENV: process.env.NODE_ENV
    });
    
    // Create define object with environment variables
    const defineVars = Object.entries(env).reduce((acc, [key, value]) => {
        if (key.startsWith('VITE_')) {
            acc[`import.meta.env.${key}`] = JSON.stringify(value);
        }
        return acc;
    }, {
        'process.env': {},
        'import.meta.env.MODE': JSON.stringify(mode),
        'import.meta.env.PROD': mode === 'production',
        'import.meta.env.DEV': mode !== 'production',
        'import.meta.env.VITE_AZURE_CLIENT_ID': JSON.stringify(env.VITE_AZURE_CLIENT_ID || ''),
        'import.meta.env.VITE_AZURE_TENANT_ID': JSON.stringify(env.VITE_AZURE_TENANT_ID || ''),
        'import.meta.env.VITE_AZURE_REDIRECT_URI': JSON.stringify(env.VITE_AZURE_REDIRECT_URI || ''),
        'import.meta.env.VITE_AZURE_SCOPES': JSON.stringify(env.VITE_AZURE_SCOPES || ''),
        'import.meta.env.VITE_AZURE_AUTHORITY': JSON.stringify(env.VITE_AZURE_AUTHORITY || ''),
        'import.meta.env.VITE_API_SCOPE': JSON.stringify(env.VITE_API_SCOPE || ''),
        'import.meta.env.VITE_API_BASE_URL': JSON.stringify(env.VITE_API_BASE_URL || ''),
        'import.meta.env.VITE_AUTH_ENABLED': JSON.stringify(env.VITE_AUTH_ENABLED || 'false'),
        'import.meta.env.VITE_APP_NAME': JSON.stringify(env.VITE_APP_NAME || ''),
        'import.meta.env.VITE_APP_VERSION': JSON.stringify(env.VITE_APP_VERSION || ''),
        'import.meta.env.VITE_ENABLE_ANALYTICS': JSON.stringify(env.VITE_ENABLE_ANALYTICS || 'false'),
        'import.meta.env.VITE_ENABLE_DEBUG': JSON.stringify(env.VITE_ENABLE_DEBUG || 'false'),
        'import.meta.env.VITE_USER_NODE_ENV': JSON.stringify(env.VITE_USER_NODE_ENV || 'development')
    });

    // Add our specific overrides
    defineVars['import.meta.env.VITE_AUTH_ENABLED'] = JSON.stringify(env.VITE_AUTH_ENABLED || 'false');
    defineVars['import.meta.env.VITE_AZURE_CLIENT_ID'] = JSON.stringify(env.VITE_AZURE_CLIENT_ID || '');
    defineVars['import.meta.env.VITE_AZURE_TENANT_ID'] = JSON.stringify(env.VITE_AZURE_TENANT_ID || '');
    defineVars['import.meta.env.VITE_AZURE_REDIRECT_URI'] = JSON.stringify(env.VITE_AZURE_REDIRECT_URI || '');
    defineVars['import.meta.env.VITE_API_SCOPE'] = JSON.stringify(env.VITE_API_SCOPE || '');

    console.log('Defining environment variables:', defineVars);
    
    // Add debugging to see what files are being processed
    console.log('[VITE DEBUG] Starting Vite build process');
    
    return {
        base: '/',
        publicDir: 'public',
        plugins: [
            react()
        ],
        build: {
            outDir: 'dist',
            assetsDir: 'assets',
            sourcemap: mode !== 'production',
            minify: 'terser',
            emptyOutDir: true,
            copyPublicDir: true,
            assetsInlineLimit: 0, // Ensure all assets are copied as files
            chunkSizeWarningLimit: 2000,
            rollupOptions: {
                input: {
                    main: path.resolve(__dirname, 'index.html'),
                },
                output: {
                    manualChunks(id) {
                        if (id.includes('node_modules')) {
                            return 'vendor';
                        }
                        return undefined;
                    },
                    // Preserve the exact filename for config.js and ensure all chunks go to assets directory
                    entryFileNames: 'assets/[name].[hash].js',
                    chunkFileNames: 'assets/[name].[hash].js',
                    assetFileNames: (assetInfo) => {
                        if (assetInfo.name === 'config.js')
                            return 'config.js';
                        return 'assets/[name].[hash][ext]';
                    }
                }
            },
            terserOptions: {
                compress: {
                    drop_console: false,
                },
            },
        },
        define: defineVars,
        resolve: {
            alias: {
                '@': path.resolve(__dirname, './src'),
            },
        },
        server: {
            port: 3000,
            open: true,
            proxy: {
                '/api': {
                    target: 'http://localhost:3001',
                    changeOrigin: true,
                    secure: false,
                    ws: true,
                    rewrite: (pathStr) => {
                        // Remove the leading /api from the path
                        const newPath = pathStr.replace(/^\/api/, '');
                        console.log(`Proxying ${pathStr} to ${newPath}`);
                        return newPath;
                    },
                    configure: (proxy, _options) => {
                        proxy.on('error', (err, _req, _res) => {
                            console.error('Proxy error:', err);
                        });
                        proxy.on('proxyReq', (_proxyReq, req, _res) => {
                            console.log('Proxying request to:', req.url);
                        });
                    }
                },
            },
            // Custom middleware for history API fallback
            configureServer(app) {
                app.use((req, res, next) => {
                    // Check if the request is for a file (has an extension)
                    if (req.url && !req.url.includes('.') && req.url !== '/' && !req.url.startsWith('/api')) {
                        req.url = '/index.html';
                    }
                    next();
                });
            }
        },
    };
});
