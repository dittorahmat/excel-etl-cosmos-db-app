import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync, writeFileSync } from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');
  
  // Create a config file that will be loaded at runtime
  const envConfig = {
    VITE_AZURE_CLIENT_ID: env.VITE_AZURE_CLIENT_ID || '',
    VITE_AZURE_TENANT_ID: env.VITE_AZURE_TENANT_ID || '',
    VITE_AZURE_REDIRECT_URI: env.VITE_AZURE_REDIRECT_URI || 'http://localhost:3000',
    VITE_AZURE_SCOPES: env.VITE_AZURE_SCOPES || 'User.Read openid profile email',
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

  return {
    base: '/',
    publicDir: 'public',
    plugins: [
      react(),
      // Plugin to ensure config.js is copied to the dist directory
      {
        name: 'copy-config',
        closeBundle() {
          const destPath = path.join(__dirname, 'dist/config.js');
          if (!existsSync(path.dirname(destPath))) {
            mkdirSync(path.dirname(destPath), { recursive: true });
          }
          writeFileSync(destPath, configContent);
          console.log('Config file written to dist directory:', destPath);
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
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html'),
        },
        output: {
          manualChunks: {
            react: ['react', 'react-dom', 'react-router-dom'],
            ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-slot'],
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
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              console.log('Proxying request to:', req.url);
            });
          }
        },
      },
    },
  };
});
