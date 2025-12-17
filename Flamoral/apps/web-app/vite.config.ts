import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import legacy from '@vitejs/plugin-legacy';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isProduction = mode === 'production';

  return {
    plugins: [
      react(),
      // Add legacy browser support with polyfills for older browsers
      isProduction && legacy({
        targets: [
          'defaults',
          'not IE 11',
          'Chrome >= 88',
          'Safari >= 14',
          'Edge >= 88',
          'Firefox >= 78',
          'iOS >= 14',
          'Android >= 10',
        ],
        // Automatically detect and add polyfills
        polyfills: [
          'es.promise',
          'es.array.iterator',
          'es.object.assign',
          'es.string.includes',
          'es.array.includes',
          'es.array.find',
          'es.array.from',
          'es.symbol',
          'es.map',
          'es.set',
          'es.weak-map',
          'es.weak-set',
        ],
        // Modernize polyfills - only add what's needed
        modernPolyfills: true,
        // Render legacy chunks for older browsers
        renderLegacyChunks: true,
      }),
    ].filter(Boolean),
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
          target: env.VITE_API_URL || 'http://localhost:3000',
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: 'dist',
      // Disable source maps in production for security
      sourcemap: !isProduction,
      // Use esbuild for minification (built-in, no extra deps)
      minify: isProduction ? 'esbuild' : false,
      // Increase chunk size warning limit
      chunkSizeWarningLimit: 1000,
      // Copy public directory assets (robots.txt, sitemap.xml, favicon, service-worker.js, manifest.json, etc.)
      copyPublicDir: true,
      // Enable asset inlining threshold (10KB)
      assetsInlineLimit: 10240,
      // Target modern browsers for better performance and smaller bundle
      // This matches our browserslist configuration
      target: ['es2020', 'edge88', 'firefox78', 'chrome88', 'safari14'],
      // Enable CSS code splitting for better caching
      cssCodeSplit: true,
      // Module preload polyfill for better browser compatibility
      modulePreload: {
        polyfill: true,
      },
      // Rollup options for better browser compatibility
      rollupOptions: {
        output: {
          // Manual chunking for better caching
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'ui-vendor': ['framer-motion', 'styled-components'],
            'state-vendor': ['@reduxjs/toolkit', 'react-redux', 'redux-persist'],
            'utils-vendor': ['axios', 'date-fns', 'dompurify'],
          },
          // Asset file naming with hash for cache busting
          assetFileNames: (assetInfo) => {
            const info = assetInfo.name.split('.');
            const ext = info[info.length - 1];
            if (/png|jpe?g|svg|gif|tiff|bmp|ico|webp/i.test(ext)) {
              return `assets/images/[name]-[hash][extname]`;
            } else if (/woff2?|ttf|otf|eot/i.test(ext)) {
              return `assets/fonts/[name]-[hash][extname]`;
            }
            return `assets/[name]-[hash][extname]`;
          },
          // Chunk file naming
          chunkFileNames: 'assets/js/[name]-[hash].js',
          entryFileNames: 'assets/js/[name]-[hash].js',
        },
      },
    },
    // CSS options for better browser compatibility
    css: {
      postcss: {
        plugins: [
          // Autoprefixer is already in devDependencies via postcss.config
        ],
      },
    },
    define: {
      // Define environment-specific constants
      __DEV__: !isProduction,
      'process.env.NODE_ENV': JSON.stringify(mode),
    },
    // Enable/disable optimizations
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-router-dom'],
      // Force pre-bundling of these modules for better compatibility
      esbuildOptions: {
        target: 'es2020',
      },
    },
    // Public directory configuration
    publicDir: 'public',
  };
});
