import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';




const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load all environment variables
  const envVars = loadEnvVars(mode);
  
  

  return {
    base: '/',
    publicDir: 'public',
    plugins: [
      react()
    ],
    build: {
      outDir: 'dist',
      assetsDir: '.',
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
          manualChunks(id: string): string | undefined {
            if (id.includes('node_modules')) {
              if (id.includes('@azure/cosmos')) {
                return 'vendor-azure-cosmos';
              }
              if (id.includes('xlsx')) {
                return 'vendor-xlsx';
              }
              if (id.includes('uuid')) {
                return 'vendor-uuid';
              }
              if (id.includes('date-fns')) {
                return 'vendor-date-fns';
              }
              if (id.includes('recharts')) {
                return 'vendor-recharts';
              }
              if (id.includes('cors') || id.includes('express') || id.includes('helmet') || id.includes('multer')) {
                return 'vendor-server';
              }
              if (id.includes('@radix-ui')) {
                return 'vendor-radix-ui';
              }
              if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
                return 'vendor-react';
              }
              if (id.includes('msal')) {
                return 'vendor-msal';
              }
              if (id.includes('axios')) {
                return 'vendor-axios';
              }
              if (id.includes('lodash')) {
                return 'vendor-lodash';
              }
              // Default vendor chunk for other node_modules
              return 'vendor';
            }
            // No chunking for non-node_modules
            return undefined;
          },
          // Preserve the exact filename for config.js
          entryFileNames: '[name].[hash].js',
          chunkFileNames: '[name].[hash].js',
          assetFileNames: (assetInfo) => {
            if (assetInfo.name === 'config.js') return 'config.js';
            return 'assets/[name].[hash][ext]';
          }
        }
      },
      terserOptions: {
        compress: {
          drop_console: mode === 'production',
        },
      },
    },
    define: Object.entries(envVars).reduce((acc, [key, value]) => {
      if (key.startsWith('VITE_')) {
        acc[`import.meta.env.${key}`] = JSON.stringify(value);
      }
      return acc;
    }, {
      'process.env': {},
      'import.meta.env.MODE': JSON.stringify(mode),
      'import.meta.env.PROD': mode === 'production',
      'import.meta.env.DEV': mode !== 'production',
    }),
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
          rewrite: (pathStr: string) => {
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
