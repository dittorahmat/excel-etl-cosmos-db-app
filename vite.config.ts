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

  // Ensure the dist directory exists
  const distDir = path.resolve(__dirname, 'dist');
  if (!existsSync(distDir)) {
    mkdirSync(distDir, { recursive: true });
  }

  // Write the config to a file that will be loaded at runtime
  const configContent = `// This file is auto-generated during build
window.__APP_CONFIG__ = ${JSON.stringify(envConfig, null, 2)};`;
  
  // Ensure the public directory exists
if (!existsSync(publicDir)) {
  mkdirSync(publicDir, { recursive: true });
}

// Always write config.js to the public directory
const configPath = path.join(publicDir, 'config.js');
writeFileSync(configPath, configContent);
console.log('Runtime config written to:', configPath);

// Verify the file was written
if (!existsSync(configPath)) {
  throw new Error('Failed to write config.js to public directory');
}

// In production, also write to dist directory
if (mode === 'production') {
  if (!existsSync(distDir)) {
    mkdirSync(distDir, { recursive: true });
  }
  const distConfigPath = path.join(distDir, 'config.js');
  writeFileSync(distConfigPath, configContent);
  console.log('Runtime config written to:', distConfigPath);
}
  
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
      emptyOutDir: true,
      copyPublicDir: true,
      chunkSizeWarningLimit: 1000, // Increase chunk size warning limit (in kbs)
      terserOptions: {
        compress: {
          drop_console: process.env.NODE_ENV === 'production',
        },
      },
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
          // Ensure config.js is copied to the root
          entryFileNames: '[name].[hash].js',
          chunkFileNames: '[name].[hash].js',
          assetFileNames: '[name].[ext]',
        },
      },
      // Copy config.js to the root of the output directory
      assetsInlineLimit: 0, // Ensure all assets are copied as files
      copyPublicDir: true, // Ensure public directory is copied
      // Ensure config.js is copied to the root
      emptyOutDir: true,
      // Copy the config.js file to the root of the output directory
      // This is a workaround for Azure Static Web Apps
      // that doesn't serve files from subdirectories correctly
      // without additional configuration
      rollupOutputOptions: {
        assetFileNames: '[name].[ext]',
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
