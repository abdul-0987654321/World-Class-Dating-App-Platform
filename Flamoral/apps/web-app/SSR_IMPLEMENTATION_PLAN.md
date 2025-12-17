# SSR Implementation Plan for Flamoral Dating App

**Date:** 2025-12-15
**Current Status:** SPA with poor SEO (empty `div#root` in source)
**Goal:** Improve SEO by implementing server-side rendering for key marketing pages

---

## Table of Contents

1. [Current Setup Analysis](#current-setup-analysis)
2. [SSR Options Comparison](#ssr-options-comparison)
3. [Recommended Approach](#recommended-approach)
4. [Implementation Plan](#implementation-plan)
5. [Azure Static Web Apps Compatibility](#azure-static-web-apps-compatibility)
6. [Risk Assessment](#risk-assessment)
7. [Resources](#resources)

---

## Current Setup Analysis

### Technology Stack

- **Framework:** React 18.2.0 with TypeScript
- **Build Tool:** Vite 5.0.8
- **Router:** React Router DOM 6.21.0
- **State Management:** Redux Toolkit + Redux Persist
- **Deployment:** Azure Static Web Apps
- **API Integration:** Proxy to backend API at `https://api.flamoral.com`

### Current Build Configuration

**File:** `apps/web-app/vite.config.ts`

```typescript
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          redux: ['@reduxjs/toolkit', 'react-redux', 'redux-persist'],
          query: ['@tanstack/react-query'],
          sentry: ['@sentry/react'],
        },
      },
    },
  },
});
```

### Page Structure Analysis

**Public Pages (SEO-Critical):**
- `/` - Landing page (FuturisticLandingPage)
- `/privacy-policy` - Privacy Policy
- `/terms-of-service` - Terms of Service
- `/tier-showcase` - Subscription tiers showcase

**Protected Pages (SEO Not Critical):**
- `/discover` - Discovery page
- `/matches` - Matches page
- `/messages` - Messages page
- `/profile` - Profile pages
- `/subscription` - Subscription management
- Admin pages

### Current SEO Problem

The `index.html` contains only an empty `<div id="root"></div>`, meaning:
- Search engine crawlers see no content initially
- Social media link previews show minimal information
- First Contentful Paint (FCP) is delayed until JavaScript loads and executes
- Reduced discoverability for organic search traffic

### Deployment Configuration

**File:** `apps/web-app/staticwebapp.config.json`

```json
{
  "navigationFallback": {
    "rewrite": "/index.html"
  },
  "routes": [
    {
      "route": "/api/*",
      "rewrite": "https://api.flamoral.com/api/*"
    }
  ],
  "platform": {
    "apiRuntime": "node:20"
  }
}
```

---

## SSR Options Comparison

### Option A: Vite Built-in SSR

**Overview:** Use Vite's native SSR capabilities to render pages on the server.

**Pros:**
- Native Vite support with minimal new dependencies
- Uses existing Vite configuration and knowledge
- Fast HMR (Hot Module Replacement) in development
- No framework lock-in
- Efficient invalidation similar to HMR

**Cons:**
- Low-level API requiring custom implementation
- Need to set up Node.js server (Express/Fastify)
- Requires creating `entry-client.js` and `entry-server.js`
- More complex deployment (not pure static anymore)
- Need to handle hydration manually
- Redux Persist compatibility challenges with SSR

**Azure SWA Compatibility:** ⚠️ **Partial**
- Would require custom backend (Standard plan, $99/month minimum)
- Not compatible with current Free/Standard tier static hosting
- Increased operational complexity

**Estimated Effort:** 🔴 **High (3-4 weeks)**

**Files to Change:**
- Create `src/entry-client.tsx`
- Create `src/entry-server.tsx`
- Create `server.js` or `server.ts`
- Modify `vite.config.ts`
- Update `package.json` scripts
- Refactor Redux Persist initialization
- Update deployment configuration

---

### Option B: Pre-rendering with Vike (formerly vite-plugin-ssr) - RECOMMENDED

**Overview:** Pre-render static HTML for SEO-critical pages at build time, keep dynamic pages as SPA.

**Pros:**
- Best of both worlds: SEO for static pages, SPA for dynamic content
- No server required - remains static deployment
- Perfect for Azure Static Web Apps (no plan upgrade needed)
- Minimal changes to existing codebase
- Excellent performance (HTML generated once at build time)
- Compatible with existing Redux setup
- Progressive enhancement approach
- Vike is actively maintained and growing

**Cons:**
- Pre-rendered content is static (rebuilt on deployment)
- Need to configure which pages to pre-render
- Additional build dependency
- Cannot use for frequently-changing content

**Azure SWA Compatibility:** ✅ **Fully Compatible**
- Works with existing Free/Standard tier
- No server-side runtime required
- Perfect fit for static hosting

**Estimated Effort:** 🟢 **Medium (1-2 weeks)**

**Files to Change:**
- Install `vike` package
- Update `vite.config.ts` to add Vike plugin
- Create `+config.ts` files for page configuration
- Optionally create `+onBeforeRender.ts` hooks for data fetching
- Update build scripts in `package.json`
- Update `staticwebapp.config.json` if needed

**Pages to Pre-render:**
1. `/` - Landing page
2. `/privacy-policy` - Privacy Policy
3. `/terms-of-service` - Terms of Service
4. `/tier-showcase` - Subscription showcase
5. `/about` - About page (if created)
6. `/safety` - Safety center info (public version if exists)
7. `/pricing` - Pricing page (if different from tier-showcase)

---

### Option C: Migrate to Next.js

**Overview:** Complete framework migration to Next.js for built-in SSR/SSG support.

**Pros:**
- Industry-standard framework with massive ecosystem
- Built-in SSR, SSG, ISR (Incremental Static Regeneration)
- Excellent documentation and community support
- Best SEO capabilities with automatic optimization
- Image optimization, font optimization built-in
- API routes for backend functionality
- App Router with React Server Components

**Cons:**
- Major migration effort (rewrite entire app)
- Need to migrate all React Router code to Next.js routing
- Redux Persist requires careful migration
- Azure Static Web Apps Next.js support is still in preview (2025)
- Reported performance issues with cold starts (up to 10s)
- Would require Standard plan + custom backend for full SSR
- Limited updates to Azure SWA in 2025 raises concerns
- File-based routing less flexible than React Router
- Vendor lock-in to Next.js conventions

**Azure SWA Compatibility:** ⚠️ **Limited (Preview)**
- Next.js hybrid support is in preview as of 2025
- Requires Standard plan minimum
- Some features unsupported:
  - Linked APIs using Azure Functions
  - SWA CLI local emulation
  - Navigation fallback
- Performance concerns with managed functions cold starts
- Next.js static export works but loses SSR benefits

**Estimated Effort:** 🔴 **Very High (2-3 months)**

**Files to Change:**
- Essentially a full rewrite:
  - Convert all pages to Next.js App Router or Pages Router
  - Migrate React Router to Next.js routing
  - Refactor Redux store initialization
  - Convert path aliases to Next.js conventions
  - Update API proxy configuration
  - Rewrite build and deployment pipelines
  - Update all internal imports
  - Migrate authentication flow

---

### Option D: Migrate to Remix

**Overview:** Migrate to Remix, a modern full-stack React framework from the React Router team.

**Pros:**
- Built by React Router team (familiar patterns)
- Server-first approach with excellent performance
- Native support for progressive enhancement
- Excellent form handling with actions/loaders
- Fast development with Vite integration
- No API routes needed (uses loaders/actions)
- Better alignment with web standards

**Cons:**
- Still requires major migration effort
- Smaller ecosystem than Next.js
- Less Azure Static Web Apps documentation/support
- Would require custom backend deployment
- Younger framework with less enterprise adoption
- Need to learn new paradigms (loaders, actions)

**Azure SWA Compatibility:** ❌ **Not Compatible**
- No native Azure Static Web Apps support
- Requires full Node.js server deployment
- Would need to deploy to Azure App Service or Container Apps instead

**Estimated Effort:** 🔴 **Very High (2-3 months)**

---

## Recommended Approach

### Choice: Option B - Pre-rendering with Vike

**Rationale:**

1. **Minimal Risk:** Incremental approach that doesn't require rewriting the entire application
2. **Cost-Effective:** No need to upgrade Azure Static Web Apps plan
3. **SEO Impact:** Solves the SEO problem for the pages that matter most (landing, legal, pricing)
4. **Development Time:** 1-2 weeks vs. 2-3 months for full framework migration
5. **Compatibility:** Fully compatible with existing Azure SWA deployment
6. **Flexibility:** Can still migrate to Next.js/Remix later if needed
7. **Performance:** Pre-rendered pages are faster than SSR (no server rendering on each request)
8. **No Server Required:** Keeps deployment simple and costs low

**When to Consider Next.js/Remix Instead:**

- If you need SSR for user-generated content pages
- If you're building a content-heavy site with frequent updates
- If you have budget for higher-tier Azure plans
- If you plan a major refactor anyway
- If you need advanced features like ISR, middleware, edge functions

---

## Implementation Plan

### Phase 1: Setup and Configuration (2-3 days)

#### Step 1: Install Vike

```bash
npm install vike --save-dev
```

#### Step 2: Update `vite.config.ts`

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import vike from 'vike/plugin';
import path from 'path';

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';

  return {
    plugins: [
      react(),
      vike({
        prerender: true, // Enable pre-rendering
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
    // ... rest of config
  };
});
```

#### Step 3: Update `package.json` Scripts

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "prerender": "vite build && vite build --ssr"
  }
}
```

### Phase 2: Configure Pages for Pre-rendering (3-4 days)

#### Step 1: Create Vike Configuration

Create `src/pages/+config.ts`:

```typescript
import type { Config } from 'vike/types';

export default {
  // Pages to pre-render
  prerender: true,
} satisfies Config;
```

#### Step 2: Configure Landing Page

Create `src/pages/Landing/+Page.tsx`:

```typescript
export { Page };

import FuturisticLandingPage from './FuturisticLandingPage';

function Page() {
  return <FuturisticLandingPage />;
}
```

Create `src/pages/Landing/+route.ts`:

```typescript
export default '/';
```

#### Step 3: Configure Legal Pages

Similar structure for:
- `src/pages/Legal/PrivacyPolicy/+Page.tsx` (route: `/privacy-policy`)
- `src/pages/Legal/TermsOfService/+Page.tsx` (route: `/terms-of-service`)

#### Step 4: Configure Other Static Pages

- `src/pages/TierShowcase/+Page.tsx` (route: `/tier-showcase`)

#### Step 5: List Pages to Pre-render

Create `vike.config.ts`:

```typescript
export default {
  prerender: {
    // List of routes to pre-render
    routes: [
      '/',
      '/privacy-policy',
      '/terms-of-service',
      '/tier-showcase',
    ],
  },
};
```

### Phase 3: Handle Dynamic Routes (2-3 days)

For protected routes and dynamic pages, keep them as SPA:

```typescript
// src/pages/discover/+config.ts
export default {
  prerender: false, // Don't pre-render this page
};
```

### Phase 4: Update SEO Meta Tags (1-2 days)

Create page-specific head content:

```typescript
// src/pages/Landing/+Head.tsx
export { Head };

function Head() {
  return (
    <>
      <title>Flamoral - Where Passion Meets Connection</title>
      <meta
        name="description"
        content="Find meaningful relationships with Flamoral, the premium dating platform that connects like-minded individuals."
      />
      <meta property="og:title" content="Flamoral - Premium Dating Platform" />
      <meta property="og:description" content="Where Passion Meets Connection" />
      <meta property="og:type" content="website" />
      <meta property="og:url" content="https://flamoral.com" />
      <meta property="og:image" content="https://flamoral.com/og-image.png" />
    </>
  );
}
```

### Phase 5: Testing (2-3 days)

1. **Local Testing:**
   ```bash
   npm run build
   npm run preview
   ```

2. **Verify Pre-rendered HTML:**
   - Check `dist/client/` for `.html` files
   - Verify HTML contains actual content, not just `<div id="root">`

3. **Test SEO:**
   - Use Chrome DevTools > Network > Disable JavaScript
   - Verify pages still display content
   - Test with Google's Rich Results Test
   - Check meta tags in source

4. **Test SPA Functionality:**
   - Verify protected routes still work
   - Test navigation between pages
   - Ensure hydration works correctly

### Phase 6: Deployment (1 day)

1. **Update Build Pipeline:**
   - Ensure GitHub Actions runs `npm run build`
   - Verify `dist/client` is deployed to Azure SWA

2. **Update `staticwebapp.config.json`:**
   ```json
   {
     "navigationFallback": {
       "rewrite": "/index.html",
       "exclude": [
         "/",
         "/privacy-policy",
         "/terms-of-service",
         "/tier-showcase",
         "/assets/*",
         "/images/*",
         "*.{css,js,json,ico,png,jpg,jpeg,gif,svg,webp,woff,woff2}"
       ]
     }
   }
   ```

3. **Deploy to Staging:**
   - Test all functionality
   - Verify SEO improvements

4. **Production Deployment:**
   - Monitor for errors
   - Track SEO metrics

---

## Azure Static Web Apps Compatibility

### Current Configuration Support

Azure Static Web Apps **fully supports** pre-rendered static sites:

- ✅ No server-side runtime required
- ✅ All content served from CDN
- ✅ Works with Free and Standard tiers
- ✅ No changes to pricing
- ✅ Existing routing configuration compatible

### Deployment Options Comparison

| Feature | Current SPA | Vike Pre-render | Next.js Static Export | Next.js Hybrid (Preview) |
|---------|-------------|-----------------|----------------------|--------------------------|
| Azure SWA Support | ✅ Full | ✅ Full | ✅ Full | ⚠️ Preview |
| Plan Required | Free/Standard | Free/Standard | Free/Standard | Standard + Backend |
| SEO | ❌ Poor | ✅ Excellent | ✅ Excellent | ✅ Excellent |
| Dynamic SSR | ❌ No | ❌ No | ❌ No | ✅ Yes |
| ISR Support | ❌ No | ❌ No | ❌ No | ✅ Yes (preview) |
| Cold Start Issues | N/A | N/A | N/A | ⚠️ Up to 10s |
| Server Required | ❌ No | ❌ No | ❌ No | ✅ Yes |
| Cost (monthly) | $0-9 | $0-9 | $0-9 | $99+ |

### Azure SWA 2025 Status Update

**Important Considerations:**

1. **Limited Development Activity:** Azure Static Web Apps has seen reduced updates in 2025, with concerns about long-term support
2. **Preview Features Stagnant:** Next.js hybrid support has been in preview for years with slow progress
3. **Plan Changes:** Dedicated plan ($99/month) is being retired in October 2025
4. **Recommendation:** Avoid vendor lock-in; keep architecture flexible for potential migration to other platforms

### Alternative Deployment Platforms

If Azure SWA becomes problematic, consider:

1. **Vercel** - Native Next.js support, excellent performance
2. **Netlify** - Great for static sites, good Vike support
3. **Cloudflare Pages** - Fast, global CDN, supports SSR
4. **AWS Amplify** - Comprehensive platform with SSR support

---

## Risk Assessment

### Low-Risk Approach (Vike Pre-rendering)

**Technical Risks:** 🟢 **Low**
- Minimal code changes
- No breaking changes to existing functionality
- Backward compatible with current SPA behavior
- Easy to rollback if issues arise

**Business Risks:** 🟢 **Low**
- No impact on current users
- No downtime required
- Incremental deployment possible
- Low cost (no plan upgrades needed)

**Timeline Risks:** 🟢 **Low**
- Well-defined scope
- 1-2 week implementation
- Minimal dependencies on external teams

### High-Risk Approaches (Next.js/Remix Migration)

**Technical Risks:** 🔴 **High**
- Complete codebase rewrite
- Breaking changes to routing, state management
- Potential compatibility issues with third-party libraries
- Redux Persist migration challenges
- Authentication flow refactoring

**Business Risks:** 🟡 **Medium**
- Extended development timeline
- Requires thorough regression testing
- Potential for user-facing bugs
- Higher cost if requiring plan upgrades

**Timeline Risks:** 🔴 **High**
- 2-3 month timeline
- Dependencies on learning new framework
- Unpredictable migration issues

---

## Implementation Checklist

### Pre-Implementation

- [ ] Review and approve this plan with stakeholders
- [ ] Set up development branch for SSR work
- [ ] Create backup/rollback plan
- [ ] Set up SEO tracking baseline metrics

### Phase 1: Setup (Week 1)

- [ ] Install Vike package
- [ ] Update Vite configuration
- [ ] Configure build scripts
- [ ] Test local build process
- [ ] Verify development mode still works

### Phase 2: Pre-rendering Configuration (Week 1-2)

- [ ] Configure landing page for pre-rendering
- [ ] Configure privacy policy page
- [ ] Configure terms of service page
- [ ] Configure tier showcase page
- [ ] Set up page-specific SEO meta tags
- [ ] Configure routes to exclude from pre-rendering

### Phase 3: Testing (Week 2)

- [ ] Verify pre-rendered HTML contains content
- [ ] Test with JavaScript disabled
- [ ] Run Google Rich Results Test
- [ ] Test social media link previews
- [ ] Verify SPA functionality on protected routes
- [ ] Performance testing (Lighthouse scores)
- [ ] Cross-browser testing

### Phase 4: Deployment (Week 2)

- [ ] Update Azure SWA configuration
- [ ] Deploy to staging environment
- [ ] Run full QA on staging
- [ ] Monitor staging for 24-48 hours
- [ ] Deploy to production
- [ ] Monitor production metrics

### Post-Implementation

- [ ] Track SEO metrics (organic traffic, rankings)
- [ ] Monitor Core Web Vitals
- [ ] Gather user feedback
- [ ] Document learnings and improvements
- [ ] Plan for additional page pre-rendering if successful

---

## Success Metrics

### Technical Metrics

1. **SEO Improvements:**
   - HTML source contains visible content for pre-rendered pages
   - Google Search Console indexing success rate > 95%
   - Proper meta tags visible in source

2. **Performance Metrics:**
   - First Contentful Paint (FCP) < 1.5s
   - Largest Contentful Paint (LCP) < 2.5s
   - Time to Interactive (TTI) < 3.5s
   - Lighthouse SEO score > 90

3. **Build Metrics:**
   - Build time increase < 30%
   - Bundle size increase < 10%
   - All pages pre-render successfully

### Business Metrics

1. **Traffic Metrics:**
   - Organic search traffic increase > 20% (3 months post-launch)
   - Improved search ranking for target keywords
   - Reduced bounce rate on landing pages

2. **Conversion Metrics:**
   - Maintain or improve current conversion rates
   - Improved social media referral traffic
   - Better link preview click-through rates

---

## Resources

### Documentation

- [Vike Official Documentation](https://vike.dev/)
- [Vite SSR Guide](https://vite.dev/guide/ssr)
- [Azure Static Web Apps Documentation](https://learn.microsoft.com/en-us/azure/static-web-apps/)
- [React Server Components (for future reference)](https://react.dev/blog/2023/03/22/react-labs-what-we-have-been-working-on-march-2023#react-server-components)

### Research References

1. Azure Static Web Apps SSR Support:
   - [Azure SWA Next.js Support Discussion](https://github.com/Azure/static-web-apps/discussions/921)
   - [Extending Next.js Support in Azure SWA](https://techcommunity.microsoft.com/t5/apps-on-azure-blog/extending-next-js-support-in-azure-static-web-apps/ba-p/3627975)
   - [Deploy Hybrid Next.js Tutorial](https://learn.microsoft.com/en-us/azure/static-web-apps/deploy-nextjs-hybrid)

2. Vite SSR Implementation:
   - [Vite Server-Side Rendering Guide](https://vite.dev/guide/ssr)
   - [Ultimate Guide to SSR with Vite and React](https://www.geeksforgeeks.org/reactjs/ultimate-guide-to-server-side-rendering-ssr-with-vite-and-reactjs/)
   - [Mastering SSR in React 19 with Vite](https://dev.to/yugjadvani/mastering-server-side-rendering-ssr-in-react-19-with-vite-the-ultimate-guide-for-developers-4mgm)

3. Vike (vite-plugin-ssr):
   - [Pre-rendering with Vike](https://vite-plugin-ssr.com/pre-rendering)
   - [Vike Migration Guide](https://vite-plugin-ssr.com/vike)
   - [Vike Official Website](https://vike.dev/)

4. Next.js Migration:
   - [Migrating from Create React App to Next.js](https://nextjs.org/docs/app/guides/migrating/from-create-react-app)
   - [How to Migrate from React to Next.js](https://maybe.works/blogs/migrate-from-react-to-next-js)
   - [React vs Next.js in 2025](https://www.theninjastudio.com/blog/next-js-vs-react)

5. Remix Comparison:
   - [Remix vs Next.js 2025 Comparison](https://merge.rocks/blog/remix-vs-nextjs-2025-comparison)
   - [Next.js vs Remix Complete Guide](https://strapi.io/blog/next-js-vs-remix-2025-developer-framework-comparison-guide)
   - [Remix vs Next.js Official Comparison](https://remix.run/blog/remix-vs-next)

### Community Support

- [Vite Discord #ssr channel](https://chat.vitejs.dev/)
- [Vike Discord](https://discord.gg/vike)
- [React Developer Community](https://react.dev/community)

---

## Conclusion

The recommended approach is **Option B: Pre-rendering with Vike** because it:

1. **Solves the SEO problem** with minimal risk and effort
2. **Maintains compatibility** with existing Azure Static Web Apps deployment
3. **Requires no cost increase** (no plan upgrades)
4. **Takes 1-2 weeks** instead of 2-3 months
5. **Provides excellent performance** (pre-rendered HTML is faster than SSR)
6. **Keeps options open** for future framework migration if needed

This incremental approach delivers immediate SEO value while maintaining the flexibility to migrate to Next.js or Remix in the future if business requirements demand more advanced server-side rendering capabilities.

### Next Steps

1. **Review and approve** this plan with the development team
2. **Schedule implementation** for a 2-week sprint
3. **Set up tracking** for SEO baseline metrics
4. **Begin Phase 1** - Vike installation and configuration
5. **Monitor results** and iterate based on performance data

---

**Document Version:** 1.0
**Last Updated:** 2025-12-15
**Author:** Development Team
**Status:** Pending Review
