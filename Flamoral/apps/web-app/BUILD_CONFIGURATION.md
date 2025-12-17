# Flamoral Web App - Build Configuration Guide

## Overview

This document provides comprehensive information about the Vite build configuration, optimizations, and best practices for the Flamoral web application.

## Table of Contents

1. [Build Configuration](#build-configuration)
2. [Environment Variables](#environment-variables)
3. [Chunk Splitting Strategy](#chunk-splitting-strategy)
4. [Browser Compatibility](#browser-compatibility)
5. [Build Scripts](#build-scripts)
6. [Performance Optimizations](#performance-optimizations)
7. [Deployment](#deployment)
8. [Troubleshooting](#troubleshooting)

## Build Configuration

### Vite Configuration

The optimized Vite configuration (`vite.config.optimized.ts`) includes:

- **Fast Refresh**: Enabled for React components
- **Automatic JSX Runtime**: No need to import React in every file
- **Advanced Chunk Splitting**: Separates vendor libraries for better caching
- **Asset Organization**: Images, fonts, and CSS in organized directories
- **Source Maps**: Hidden in production (available for debugging but not exposed)
- **Console Removal**: Console statements removed in production (except errors/warnings)
- **Tree Shaking**: Dead code elimination enabled
- **Minification**: Using esbuild for fast minification

### Key Features

```typescript
{
  // React plugin with optimizations
  plugins: [react({ fastRefresh: true, jsxRuntime: 'automatic' })],

  // Build optimizations
  build: {
    minify: 'esbuild',
    target: 'es2020',
    sourcemap: 'hidden',
    cssCodeSplit: true,
    chunkSizeWarningLimit: 1000,
  },

  // Console and debugger removal in production
  esbuild: {
    drop: isProduction ? ['console', 'debugger'] : [],
  }
}
```

## Environment Variables

### Environment Files

- `.env.development` - Local development
- `.env.staging` - Staging environment
- `.env.production` - Production environment
- `.env.example` - Template for all environments

### Required Variables

**API Configuration:**
```bash
VITE_API_URL=https://api.flamoral.com/api/v1
VITE_SOCKET_URL=https://api.flamoral.com
VITE_WS_URL=wss://api.flamoral.com
```

**Application:**
```bash
VITE_APP_NAME=Flamoral
VITE_APP_ENV=production
VITE_APP_DOMAIN=https://flamoral.com
```

### Environment Validation

The app includes automatic environment validation (`src/utils/env.validation.ts`):

```typescript
import { logEnvironmentValidation } from '@/utils/env.validation';

// Call during app initialization
logEnvironmentValidation();
```

**Features:**
- Validates required variables are set
- Checks for placeholder values in production
- Validates URL formats
- Ensures HTTPS in production
- Provides helpful error messages

## Chunk Splitting Strategy

### Vendor Bundles

The build creates separate bundles for better caching:

```typescript
manualChunks: {
  // React ecosystem (rarely changes)
  'vendor-react': ['react', 'react-dom', 'react-router-dom'],

  // State management (rarely changes)
  'vendor-redux': ['@reduxjs/toolkit', 'react-redux', 'redux-persist'],

  // Data fetching (rarely changes)
  'vendor-query': ['@tanstack/react-query'],

  // UI libraries (occasionally changes)
  'vendor-ui': ['framer-motion', 'lucide-react', 'react-icons', 'styled-components'],

  // External services (rarely changes)
  'vendor-services': ['@sentry/react', 'axios', 'socket.io-client'],

  // Payment and authentication (rarely changes)
  'vendor-auth-payment': ['@stripe/react-stripe-js', '@stripe/stripe-js', '@react-oauth/google'],

  // Video calling (large, rarely changes)
  'vendor-video': ['agora-rtc-sdk-ng'],

  // Utilities (rarely changes)
  'vendor-utils': ['date-fns', 'dompurify'],
}
```

### Benefits

1. **Better Caching**: Vendor code rarely changes, maximizing cache hits
2. **Parallel Loading**: Multiple chunks can be downloaded simultaneously
3. **Smaller Updates**: Only changed chunks need to be re-downloaded
4. **Faster Rebuilds**: Unchanged chunks are reused
5. **Improved Performance**: Smaller initial bundle size

### Asset Organization

```
dist/
├── assets/
│   ├── js/
│   │   ├── index-[hash].js          # Application code
│   │   ├── vendor-react-[hash].js    # React bundle
│   │   ├── vendor-redux-[hash].js    # Redux bundle
│   │   └── vendor-ui-[hash].js       # UI libraries
│   ├── css/
│   │   └── index-[hash].css
│   ├── images/
│   │   └── [name]-[hash].[ext]
│   └── fonts/
│       └── [name]-[hash].[ext]
└── index.html
```

## Browser Compatibility

### Browserslist Configuration

`.browserslistrc`:
```
>0.2%
not dead
not op_mini all
last 2 Chrome versions
last 2 Firefox versions
last 2 Safari versions
last 2 Edge versions
last 2 iOS versions
last 2 ChromeAndroid versions
not IE 11
```

### Target Browsers

**Supported:**
- Chrome 88+
- Firefox ESR+
- Safari 14+
- Edge 88+
- iOS 14+
- Android 10+

**Not Supported:**
- Internet Explorer 11
- Opera Mini
- Very old mobile browsers

### Polyfills

The build targets ES2020, which includes:
- Async/await
- ES6 modules
- Arrow functions
- Classes
- Template literals
- Destructuring
- Spread operator

No additional polyfills needed for target browsers.

## Build Scripts

### Available Scripts

```bash
# Development
npm run dev                    # Start dev server (port 5173)

# Production builds
npm run build                  # Build for production
npm run build:production       # Explicit production build
npm run build:staging          # Build for staging
npm run preview               # Preview production build locally

# Testing and quality
npm run type-check            # TypeScript type checking
npm run lint                  # ESLint checks
npm run lint:fix             # Fix ESLint issues
npm run test                 # Run unit tests
npm run test:e2e             # Run E2E tests

# Utilities
npm run clean                # Clean build artifacts
```

### Production Build Script

Use the automated build script for production:

```bash
bash scripts/build-production.sh
```

**What it does:**
1. Checks Node.js version (>=18)
2. Cleans previous builds
3. Installs dependencies (`npm ci`)
4. Runs type checking
5. Runs linting
6. Runs tests
7. Builds production bundle
8. Analyzes bundle size
9. Checks for large chunks
10. Verifies critical files
11. Runs security audit

## Performance Optimizations

### 1. Code Splitting

**Route-based splitting:**
```typescript
// Use React.lazy for route components
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Profile = lazy(() => import('@/pages/Profile'));

// Wrap with Suspense
<Suspense fallback={<LoadingSpinner />}>
  <Routes>
    <Route path="/dashboard" element={<Dashboard />} />
    <Route path="/profile" element={<Profile />} />
  </Routes>
</Suspense>
```

**Component-based splitting:**
```typescript
// Lazy load heavy components
const VideoCall = lazy(() => import('@/components/VideoCall'));
const ImageEditor = lazy(() => import('@/components/ImageEditor'));
```

### 2. Asset Optimization

- **Images**: Compressed and served in modern formats (WebP)
- **Fonts**: Subset and preloaded
- **CSS**: Minified and split by route
- **JavaScript**: Minified with esbuild

### 3. Caching Strategy

**HTTP Headers (configured in nginx):**
```nginx
# Static assets (vendor bundles) - 1 year
location /assets/ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}

# HTML files - no cache
location / {
    add_header Cache-Control "no-cache, must-revalidate";
}
```

### 4. Bundle Size Guidelines

**Target sizes:**
- Initial bundle: < 300KB (gzipped)
- Vendor bundles: < 200KB each (gzipped)
- Route chunks: < 100KB each (gzipped)
- Total app: < 2MB (gzipped)

**Warning thresholds:**
- Chunks > 500KB trigger warnings
- Review and optimize if warnings appear

### 5. Optimization Checklist

- [ ] Remove unused dependencies
- [ ] Use dynamic imports for large components
- [ ] Optimize images and assets
- [ ] Enable gzip/brotli compression
- [ ] Implement proper caching headers
- [ ] Use CDN for static assets
- [ ] Lazy load below-the-fold content
- [ ] Preload critical resources
- [ ] Use service worker for offline support

## Deployment

### Pre-deployment Checklist

1. **Environment Variables**
   - [ ] All required variables set
   - [ ] No placeholder values in production
   - [ ] API URLs use HTTPS
   - [ ] API keys are valid

2. **Build Quality**
   - [ ] Type check passes
   - [ ] Linting passes
   - [ ] Tests pass
   - [ ] No security vulnerabilities
   - [ ] Bundle sizes acceptable

3. **Configuration**
   - [ ] CSP headers configured
   - [ ] CORS settings correct
   - [ ] Rate limiting enabled
   - [ ] Analytics configured
   - [ ] Error tracking enabled

### Deployment Process

**1. Build the application:**
```bash
bash scripts/build-production.sh
```

**2. Test locally:**
```bash
npm run preview
```

**3. Deploy to staging:**
```bash
# Copy dist/ to staging server
rsync -avz dist/ user@staging-server:/var/www/flamoral/
```

**4. Test on staging:**
- Functional testing
- Performance testing
- Security testing
- Cross-browser testing

**5. Deploy to production:**
```bash
# Copy dist/ to production server
rsync -avz dist/ user@production-server:/var/www/flamoral/
```

**6. Post-deployment verification:**
- Check error tracking (Sentry)
- Monitor analytics
- Verify API connectivity
- Test critical user flows

### Azure Static Web Apps

If deploying to Azure Static Web Apps:

```yaml
# staticwebapp.config.json
{
  "routes": [
    {
      "route": "/assets/*",
      "headers": {
        "cache-control": "public, max-age=31536000, immutable"
      }
    }
  ],
  "navigationFallback": {
    "rewrite": "/index.html"
  }
}
```

## Troubleshooting

### Common Issues

**1. Build fails with TypeScript errors**
```bash
# Run type check to see all errors
npm run type-check

# Fix type errors or temporarily bypass
# (not recommended for production)
```

**2. Large bundle sizes**
```bash
# Analyze bundle
npm run build:analyze

# Check for:
- Duplicate dependencies
- Unused imports
- Large libraries that should be lazy loaded
```

**3. Missing environment variables**
```
Error: Missing required environment variables: VITE_API_URL
```

**Solution:**
- Check `.env.production` file exists
- Verify all required variables are set
- Check for typos in variable names

**4. Source maps not working**
```typescript
// In vite.config.ts
build: {
  sourcemap: 'hidden',  // Change to true for debugging
}
```

**5. Chunk loading failures**
```
Error: Failed to fetch dynamically imported module
```

**Possible causes:**
- Incorrect publicPath configuration
- CDN/server issues
- Old service worker cache

**Solution:**
```typescript
// Clear service worker cache
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(registration => registration.unregister());
});
```

### Performance Issues

**1. Slow initial load**
- Check bundle sizes
- Implement code splitting
- Enable HTTP/2
- Use CDN for assets
- Optimize images

**2. Slow subsequent navigations**
- Implement route-based code splitting
- Use React.lazy and Suspense
- Prefetch next routes
- Optimize state management

**3. Memory leaks**
- Check for uncleaned event listeners
- Review Redux persist configuration
- Profile with Chrome DevTools
- Check for circular references

## Best Practices

### 1. Development

- Use TypeScript for type safety
- Follow ESLint rules
- Write tests for critical features
- Use feature flags for experimental features
- Keep dependencies up to date

### 2. Build Configuration

- Use separate env files per environment
- Never commit secrets to version control
- Use environment validation
- Enable source maps for debugging (hidden in production)
- Monitor bundle sizes

### 3. Performance

- Lazy load non-critical features
- Optimize images and assets
- Use proper caching strategies
- Monitor Core Web Vitals
- Implement code splitting

### 4. Security

- Use HTTPS in production
- Configure CSP headers
- Enable CSRF protection
- Sanitize user input
- Keep dependencies updated
- Run security audits regularly

## Additional Resources

- [Vite Documentation](https://vitejs.dev/)
- [React Performance](https://react.dev/learn/render-and-commit)
- [Web.dev Performance](https://web.dev/performance/)
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)

## Support

For build-related issues:
1. Check this documentation
2. Review Vite logs
3. Check browser console
4. Contact DevOps team
5. Create GitHub issue

---

**Last Updated**: December 2024
**Version**: 1.0.0
**Maintained by**: Flamoral Development Team
