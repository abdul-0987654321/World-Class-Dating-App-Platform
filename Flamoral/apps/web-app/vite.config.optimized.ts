import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';

  return {
    plugins: [
      react({
        // Enable Fast Refresh
        fastRefresh: true,
        // Enable automatic JSX runtime
        jsxRuntime: 'automatic',
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
        '@services': path.resolve(__dirname, './src/services'),
        '@types': path.resolve(__dirname, './src/types'),
      },
    },
    server: {
      port: 5173,
      host: true,
      strictPort: false,
      proxy: {
        '/api': {
          target: process.env.VITE_API_URL || 'http://localhost:4000',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api/, '/api/v1'),
        },
      },
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      // Hidden source maps for production debugging without exposing to users
      sourcemap: isProduction ? 'hidden' : true,
      // Use esbuild for faster minification
      minify: 'esbuild',
      // Target modern browsers for better performance
      target: 'es2020',
      // Increase chunk size warning limit
      chunkSizeWarningLimit: 1000,
      // CSS code splitting
      cssCodeSplit: true,
      // Rollup options for advanced chunk splitting
      rollupOptions: {
        output: {
          // Manual chunk splitting for better caching
          manualChunks: {
            // React core bundle
            'vendor-react': [
              'react',
              'react-dom',
              'react-router-dom',
            ],
            // Redux and state management
            'vendor-redux': [
              '@reduxjs/toolkit',
              'react-redux',
              'redux-persist',
            ],
            // React Query
            'vendor-query': [
              '@tanstack/react-query',
            ],
            // UI libraries
            'vendor-ui': [
              'framer-motion',
              'lucide-react',
              'react-icons',
              'styled-components',
              'react-toastify',
            ],
            // External services
            'vendor-services': [
              '@sentry/react',
              'axios',
              'socket.io-client',
            ],
            // Payment and Auth
            'vendor-auth-payment': [
              '@stripe/react-stripe-js',
              '@stripe/stripe-js',
              '@react-oauth/google',
              'react-apple-signin-auth',
            ],
            // Video calling
            'vendor-video': [
              'agora-rtc-sdk-ng',
            ],
            // Utilities
            'vendor-utils': [
              'date-fns',
              'dompurify',
            ],
          },
          // Asset file naming
          assetFileNames: (assetInfo) => {
            const info = assetInfo.name.split('.');
            const extType = info[info.length - 1];
            if (/\.(png|jpe?g|svg|gif|tiff|bmp|ico|webp)$/i.test(assetInfo.name)) {
              return `assets/images/[name]-[hash][extname]`;
            } else if (/\.(woff2?|eot|ttf|otf)$/i.test(assetInfo.name)) {
              return `assets/fonts/[name]-[hash][extname]`;
            } else if (extType === 'css') {
              return `assets/css/[name]-[hash][extname]`;
            }
            return `assets/[name]-[hash][extname]`;
          },
          // Chunk file naming
          chunkFileNames: 'assets/js/[name]-[hash].js',
          entryFileNames: 'assets/js/[name]-[hash].js',
        },
      },
      // Report compressed size
      reportCompressedSize: true,
      // Enable CSS minification
      cssMinify: true,
    },
    define: {
      // Define environment-specific constants
      __DEV__: !isProduction,
      'process.env.NODE_ENV': JSON.stringify(mode),
    },
    // Pre-bundling optimizations
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        '@reduxjs/toolkit',
        'react-redux',
        '@tanstack/react-query',
        'axios',
        'framer-motion',
      ],
      // Exclude large dependencies that should be lazy loaded
      exclude: ['agora-rtc-sdk-ng'],
    },
    // Performance optimizations
    esbuild: {
      logOverride: { 'this-is-undefined-in-esm': 'silent' },
      // Drop console and debugger in production
      drop: isProduction ? ['console', 'debugger'] : [],
    },
    // Preview server configuration
    preview: {
      port: 4173,
      host: true,
      strictPort: false,
    },
  };
});
