import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    sourcemap: process.env.NODE_ENV === 'production' ? false : true,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-slot'],
        },
      },
    },
    chunkSizeWarningLimit: 1000, // Increase chunk size warning limit to 1000KB
  },
  server: {
    port: 3000,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
    define: {
      'process.env': {},
      // Explicitly expose environment variables to the client
      'import.meta.env.VITE_AZURE_CLIENT_ID': JSON.stringify(env.VITE_AZURE_CLIENT_ID),
      'import.meta.env.VITE_AZURE_TENANT_ID': JSON.stringify(env.VITE_AZURE_TENANT_ID),
      'import.meta.env.VITE_AZURE_REDIRECT_URI': JSON.stringify(env.VITE_AZURE_REDIRECT_URI || '/.auth/login/aad/callback'),
      'import.meta.env.VITE_AZURE_SCOPES': JSON.stringify(env.VITE_AZURE_SCOPES || 'User.Read openid profile email')
    },
  };
});
