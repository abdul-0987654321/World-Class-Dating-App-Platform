import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';

  return {
    plugins: [
      react({
        babel: isProduction
          ? {
              plugins: [
                // Remove console.log in production
                ['transform-remove-console', { exclude: ['error', 'warn'] }],
              ],
            }
          : undefined,
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@components': path.resolve(__dirname, './src/components'),
        '@pages': path.resolve(__dirname, './src/pages'),
        '@store': path.resolve(__dirname, './src/store'),
        '@hooks': path.resolve(__dirname, './src/hooks'),
        '@utils': path.resolve(__dirname, './src/utils'),
      },
    },
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: process.env.VITE_API_URL || 'http://localhost:3000',
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: 'dist',
      // Disable source maps in production for security
      sourcemap: !isProduction,
      // Minify in production
      minify: isProduction ? 'terser' : false,
      terserOptions: isProduction
        ? {
            compress: {
              // Remove console statements
              drop_console: true,
              drop_debugger: true,
              pure_funcs: ['console.log', 'console.info', 'console.debug'],
            },
            format: {
              // Remove comments
              comments: false,
            },
          }
        : undefined,
      rollupOptions: {
        output: {
          // Code splitting for better caching
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'],
            redux: ['@reduxjs/toolkit', 'react-redux', 'redux-persist'],
            query: ['@tanstack/react-query'],
            sentry: ['@sentry/react'],
          },
        },
      },
      // Increase chunk size warning limit
      chunkSizeWarningLimit: 1000,
    },
    define: {
      // Define environment-specific constants
      __DEV__: !isProduction,
      'process.env.NODE_ENV': JSON.stringify(mode),
    },
    // Enable/disable optimizations
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-router-dom'],
    },
  };
});
