import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';

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
    VITE_AZURE_REDIRECT_URI: env.VITE_AZURE_REDIRECT_URI || '',
    VITE_AZURE_SCOPES: env.VITE_AZURE_SCOPES || 'User.Read openid profile email',
    MODE: mode,
    PROD: mode === 'production',
    DEV: mode !== 'production'
  };

  // Ensure public directory exists
  const publicDir = path.resolve(__dirname, 'public');
  if (!existsSync(publicDir)) {
    mkdirSync(publicDir, { recursive: true });
  }

  // Write the config to a file that will be loaded at runtime
  fs.writeFile(
    path.join(publicDir, 'config.js'),
    `// This file is auto-generated during build
window.__APP_CONFIG__ = ${JSON.stringify(envConfig, null, 2)};`
  ).catch(console.error);
  
  return {
    // Configure the base public path
    base: '/',
    // Ensure public files are copied to the output directory
    publicDir: 'public',
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    // Configure the build output
    build: {
      outDir: 'dist',
      assetsDir: '.',
      sourcemap: process.env.NODE_ENV === 'production' ? false : true,
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: process.env.NODE_ENV === 'production',
        },
      },
      chunkSizeWarningLimit: 1000, // Increase chunk size warning limit (in kbs)
      rollupOptions: {
        // Ensure config.js is included in the build
        input: {
          main: path.resolve(__dirname, 'index.html'),
        },
        output: {
          manualChunks: {
            react: ['react', 'react-dom', 'react-router-dom'],
            ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-slot'],
          },
        },
      },
    },
    server: {
      port: 3000,
      open: true,
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          rewrite: (pathStr: string) => pathStr.replace(/^\/api/, ''),
        },
      },
    },
    define: {
      'process.env': {},
      // Use the runtime config instead of build-time environment variables
      'import.meta.env.MODE': JSON.stringify(mode),
      'import.meta.env.PROD': mode === 'production',
      'import.meta.env.DEV': mode !== 'production',
    },
  };
});
