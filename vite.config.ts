import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';




const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load all environment variables
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  
  

  return {
    base: '/',
    publicDir: 'public',
    resolve: {
      dedupe: ['react', 'react-dom'],
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    optimizeDeps: {
      include: ['react', 'react-dom'],
      esbuildOptions: {
        // Fix for Radix UI
        jsx: 'automatic',
      },
    },
    plugins: [
      react({
        // Use React 17+ automatic JSX transform
        jsxImportSource: '@emotion/react',
        // Ensure React is in the same scope
        jsxRuntime: 'automatic',
      })
    ],
    build: {
      // Ensure React is not bundled multiple times
      commonjsOptions: {
        transformMixedEsModules: true,
      },
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: mode !== 'production',
      minify: 'terser',
      emptyOutDir: true,
      copyPublicDir: true,
      assetsInlineLimit: 0, // Ensure all assets are copied as files
      chunkSizeWarningLimit: 2000,
      // Configure Rollup options for bundling
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html'),
        },
        output: {
          entryFileNames: 'assets/[name].[hash].js',
          chunkFileNames: 'assets/[name].[hash].js',
          assetFileNames: (assetInfo: { name?: string }) => {
            // Keep config.js at the root
            if (assetInfo.name === 'config.js') return '[name][extname]';
            // CSS files in assets directory with proper extension, handling unusual extensions
            if (assetInfo.name?.includes('.css') || assetInfo.name?.endsWith('W1Mdea1icss')) return 'assets/[name].css';
            // All other assets in assets directory
            return 'assets/[name].[hash][extname]';
          },
          manualChunks: (id: string) => {
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
          }
        }
      },
      terserOptions: {
        compress: {
          drop_console: mode === 'production',
        },
      },
    },
    define: {
      ...Object.entries(env).reduce<Record<string, string>>((acc, [key, value]) => {
        if (key.startsWith('VITE_')) {
          acc[`import.meta.env.${key}`] = JSON.stringify(value);
        }
        return acc;
      }, {}),
      'process.env': {},
      'import.meta.env.MODE': JSON.stringify(mode),
      'import.meta.env.PROD': mode === 'production',
      'import.meta.env.DEV': mode !== 'production',
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
      configureServer(app: any) {
        app.use((req: any, _res: any, next: () => void) => {
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
