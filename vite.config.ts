import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync, writeFileSync } from 'fs';

// Load environment variables from .env file and process.env
const loadEnvVars = (mode: string) => {
  // Load all environment variables from .env files and process.env
  const env = loadEnv(mode, process.cwd(), '');
  
  
  
  // Use environment variables with fallbacks
  return {
    VITE_AZURE_TENANT_ID: env.VITE_AZURE_TENANT_ID || process.env.VITE_AZURE_TENANT_ID || '',
    VITE_AZURE_CLIENT_ID: env.VITE_AZURE_CLIENT_ID || process.env.VITE_AZURE_CLIENT_ID || '',
    VITE_AZURE_REDIRECT_URI: env.VITE_AZURE_REDIRECT_URI || process.env.VITE_AZURE_REDIRECT_URI || 'https://gray-flower-09b086c00.6.azurestaticapps.net',
    VITE_AZURE_SCOPES: env.VITE_AZURE_SCOPES || process.env.VITE_AZURE_SCOPES || 'User.Read openid profile email',
    VITE_API_SCOPE: env.VITE_API_SCOPE || process.env.VITE_API_SCOPE || '',
  };
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load all environment variables
  const envVars = loadEnvVars(mode);
  
  // Create a config file that will be loaded at runtime
  const envConfig = {
    ...envVars,
    MODE: mode,
    PROD: mode === 'production',
    DEV: mode !== 'production'
  };
  
  

  // Generate config content
  const configContent = `// This file is auto-generated during build
window.__APP_CONFIG__ = ${JSON.stringify(envConfig, null, 2)};`;

  // Ensure public directory exists
  const publicDir = path.resolve(__dirname, 'public');
  if (!existsSync(publicDir)) {
    mkdirSync(publicDir, { recursive: true });
  }
  
  // Write config to public directory
  const configPath = path.join(publicDir, 'config.js');
  writeFileSync(configPath, configContent);
  console.log('Config file written to public directory:', configPath);

  // Create a script tag with the environment variables
  const envScript = `
    <script>
      // Injected by Vite build
      window.__AZURE_ENV__ = ${JSON.stringify(envConfig, null, 2)};
    </script>
  `;

  return {
    base: '/',
    publicDir: 'public',
    plugins: [
      react(),
      // Plugin to inject environment variables into HTML
      {
        name: 'html-transform',
        transformIndexHtml(html) {
          return html.replace(
            '<head>',
            `<head>${envScript}`
          );
        }
      }
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
    define: {
      'process.env': {},
      'import.meta.env.MODE': JSON.stringify(mode),
      'import.meta.env.PROD': mode === 'production',
      'import.meta.env.DEV': mode !== 'production',
    },
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
