import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load all environment variables
  const env = loadEnv(mode, process.cwd(), '');

  const proxyTarget = env.VITE_API_BASE_URL || 'http://localhost:3001';

  

  return {
    base: '/',
    publicDir: 'public',
    resolve: {
      dedupe: ['react', 'react-dom', 'scheduler'],
      alias: {
        '@': path.resolve(__dirname, './src'),
        // Ensure single instance of React and ReactDOM
        'react': path.resolve(__dirname, './node_modules/react'),
        'react-dom': path.resolve(__dirname, './node_modules/react-dom'),
        // Add any Radix UI components that might cause issues
        '@radix-ui/react-dialog': path.resolve(__dirname, './node_modules/@radix-ui/react-dialog'),
        '@radix-ui/react-dropdown-menu': path.resolve(__dirname, './node_modules/@radix-ui/react-dropdown-menu'),
      },
    },
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        '@radix-ui/react-dialog',
        '@radix-ui/react-dropdown-menu',
        // Add other Radix UI components you're using
        '@radix-ui/react-avatar',
        '@radix-ui/react-popover',
        '@radix-ui/react-select',
        '@radix-ui/react-slot',
        '@radix-ui/react-toast',
      ],
      esbuildOptions: {
        // Fix for Radix UI and React 18
        jsx: 'automatic',
        jsxDev: false, // Disable dev mode in production
        target: 'es2020',
        // Ensure React is treated as external
        define: {
          'process.env.NODE_ENV': '"production"',
        },
        banner: {
          js: `
            // React version: ${require('react/package.json').version}
            // React DOM version: ${require('react-dom/package.json').version}
          `
        }
      },
    },
    plugins: [
      react({
        // Use React 17+ automatic JSX transform
        jsxImportSource: '@emotion/react',
        // Ensure React is in the same scope
        jsxRuntime: 'automatic',
        // Ensure Babel doesn't process node_modules
        babel: {
          babelrc: false,
          configFile: false,
          plugins: [
            // Add any necessary Babel plugins here
          ],
        },
      })
    ],
    build: {
      // Ensure proper MIME types for assets
      assetsInlineLimit: 0, // Ensure all assets are copied as files
      // Ensure React is not bundled multiple times
      commonjsOptions: {
        transformMixedEsModules: true,
        include: [/node_modules/],
        exclude: ['**/node_modules/process-es6/**'],
      },
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: mode !== 'production',
      minify: 'terser',
      emptyOutDir: true,
      copyPublicDir: true,
      chunkSizeWarningLimit: 2000,
      // Configure Rollup options for bundling
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html'),
        },
        output: {
          entryFileNames: 'assets/[name].[hash].js',
          chunkFileNames: 'assets/[name].[hash].js',
          assetFileNames: (assetInfo: { name?: string, type: string }) => {
            // Keep config.js at the root
            if (assetInfo.name === 'config.js') return '[name][extname]';
            // CSS files in assets directory with proper extension
            if (assetInfo.name?.endsWith('.css')) {
              return 'assets/[name][extname]?[hash]';
            }
            // All other assets in assets directory
            return 'assets/[name][extname]?[hash]';
          },
          manualChunks: (id: string) => {
            if (id.includes('node_modules')) {
              return 'vendor';
            }
          },
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
      headers: {
        'Content-Type': 'text/css; charset=utf-8',
      },
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
          ws: true,
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
    preview: {
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
          ws: true,
          rewrite: (path) => path,
        },
      },
    },
  };
});
