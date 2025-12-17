# Routing Test Plan

## Quick Start
```bash
# 1. Build the application
npm run build

# 2. Preview the production build
npm run preview

# 3. Open browser to http://localhost:4173
```

## Test Cases

### Public Routes (Should work without authentication)

1. **Landing Page**
   - URL: `http://localhost:4173/`
   - Expected: Futuristic landing page loads
   - Test: Navigate, refresh page, back button

2. **Login Page**
   - URL: `http://localhost:4173/login`
   - Expected: Login form loads
   - Test: Navigate, refresh page, direct URL

3. **Signup Pages**
   - URL: `http://localhost:4173/signup`
   - URL: `http://localhost:4173/register`
   - Expected: Signup form loads
   - Test: Both URLs work, redirect to same component

4. **Legal Pages**
   - URL: `http://localhost:4173/privacy-policy`
   - URL: `http://localhost:4173/terms-of-service`
   - Expected: Policy pages load (lazy loaded)
   - Test: Loading spinner, then content

5. **Tier Showcase**
   - URL: `http://localhost:4173/tier-showcase`
   - Expected: Tier showcase loads (lazy loaded)
   - Test: Loading spinner, then content

### Protected Routes (Require authentication)

**Note:** These should redirect to `/login` if not authenticated

1. **Discovery Page**
   - URL: `http://localhost:4173/discover`
   - Expected: Redirect to login OR discovery page if authenticated
   - Test: Direct URL, refresh

2. **Matches Page**
   - URL: `http://localhost:4173/matches`
   - Expected: Redirect to login OR matches page if authenticated
   - Test: Direct URL, refresh

3. **Messages Page**
   - URL: `http://localhost:4173/messages`
   - Expected: Redirect to login OR messages page if authenticated
   - Test: Direct URL, refresh

4. **Profile Pages**
   - URL: `http://localhost:4173/profile`
   - URL: `http://localhost:4173/profile/edit`
   - Expected: Redirect to login OR profile pages if authenticated
   - Test: Direct URL, refresh

5. **Settings Pages**
   - URL: `http://localhost:4173/settings`
   - URL: `http://localhost:4173/privacy`
   - URL: `http://localhost:4173/notifications`
   - Expected: Redirect to login OR settings pages if authenticated
   - Test: Direct URL, refresh

### Admin Routes (Require admin role)

**Note:** Should redirect to `/discover` if authenticated but not admin

1. **Admin Dashboard**
   - URL: `http://localhost:4173/admin`
   - Expected: Redirect to login → redirect to discover if not admin
   - Test: Direct URL, refresh

2. **Admin Subpages**
   - URL: `http://localhost:4173/admin/users`
   - URL: `http://localhost:4173/admin/analytics`
   - Expected: Redirect to login → redirect to discover if not admin
   - Test: Direct URL, refresh

### 404 Testing

1. **Invalid Routes**
   - URL: `http://localhost:4173/this-does-not-exist`
   - URL: `http://localhost:4173/random/path/here`
   - Expected: 404 Not Found page
   - Test: Shows custom 404 with navigation options

### Lazy Loading Testing

**Open Network Tab in DevTools**

1. Navigate to `/tier-showcase`
   - Expected: See chunk loading (e.g., `TierShowcase-[hash].js`)
   - Verify: Loading spinner shows briefly

2. Navigate to `/privacy-policy`
   - Expected: See chunk loading (e.g., `PrivacyPolicy-[hash].js`)
   - Verify: Loading spinner shows briefly

3. Login and navigate to `/discover`
   - Expected: See chunk loading (e.g., `DiscoveryPage-[hash].js`)
   - Verify: Loading spinner shows briefly

### Error Boundary Testing

**Method 1: Simulate Network Error**
1. Open DevTools → Network tab
2. Set throttling to "Offline"
3. Navigate to a lazy-loaded route
4. Expected: Error boundary shows error UI

**Method 2: Console Test**
```javascript
// In browser console after app loads:
throw new Error('Test Error');
// Expected: Error boundary catches and shows error UI
```

### Performance Testing

1. **Initial Bundle Size**
   - Check: `dist/assets/js/index-[hash].js`
   - Expected: ~250KB (gzipped: ~80KB)

2. **Vendor Chunks**
   - Check: `dist/assets/js/react-vendor-[hash].js`
   - Check: `dist/assets/js/ui-vendor-[hash].js`
   - Check: `dist/assets/js/state-vendor-[hash].js`
   - Check: `dist/assets/js/utils-vendor-[hash].js`
   - Expected: 4 vendor chunks created

3. **Route Chunks**
   - Check: `dist/assets/js/` directory
   - Expected: 30+ route-specific chunks

4. **Lighthouse Audit**
   - Run: DevTools → Lighthouse → Generate report
   - Expected: Score 85+ for Performance

### Browser Testing Matrix

| Browser | Landing | Login | Protected | Admin | 404 | Lazy Load |
|---------|---------|-------|-----------|-------|-----|-----------|
| Chrome  | [ ]     | [ ]   | [ ]       | [ ]   | [ ] | [ ]       |
| Firefox | [ ]     | [ ]   | [ ]       | [ ]   | [ ] | [ ]       |
| Safari  | [ ]     | [ ]   | [ ]       | [ ]   | [ ] | [ ]       |
| Edge    | [ ]     | [ ]   | [ ]       | [ ]   | [ ] | [ ]       |

### Mobile Testing

1. **Chrome DevTools Device Emulation**
   - Device: iPhone 12 Pro
   - Test: All routes work
   - Test: Touch navigation works

2. **Firefox Responsive Design Mode**
   - Device: Samsung Galaxy S20
   - Test: All routes work
   - Test: Touch navigation works

### Deep Linking Testing

1. **Share Link Test**
   - Copy URL from address bar: `http://localhost:4173/matches`
   - Paste in new tab
   - Expected: Direct load (or redirect if not authenticated)

2. **Refresh Test**
   - Navigate to any route
   - Press F5 or Ctrl+R
   - Expected: Page reloads successfully

3. **Back/Forward Test**
   - Navigate through multiple routes
   - Use browser back/forward buttons
   - Expected: Correct pages load

### Authentication Flow Testing

1. **Login Redirect**
   - Go to: `http://localhost:4173/matches` (protected)
   - Expected: Redirect to `/login?from=/matches`
   - Login with valid credentials
   - Expected: Redirect back to `/matches`

2. **Logged In Redirect**
   - Log in
   - Try to access: `http://localhost:4173/login`
   - Expected: Redirect to `/discover`

3. **Admin Check**
   - Log in as non-admin user
   - Try to access: `http://localhost:4173/admin`
   - Expected: Redirect to `/discover`

### Scroll Restoration Testing

1. **Scroll Position**
   - Navigate to a long page
   - Scroll down
   - Navigate to another route
   - Expected: New page loads at top

2. **Hash Navigation**
   - Navigate to: `http://localhost:4173/#section`
   - Expected: Page scrolls to section (if exists)

## Automated Testing Script

Create a simple test script:

```javascript
// test-routes.js
const routes = [
  '/',
  '/login',
  '/signup',
  '/privacy-policy',
  '/tier-showcase',
  '/discover',
  '/matches',
  '/admin',
  '/invalid-route'
];

async function testRoutes() {
  for (const route of routes) {
    const response = await fetch(`http://localhost:4173${route}`);
    console.log(`${route}: ${response.status} ${response.ok ? '✅' : '❌'}`);
  }
}

testRoutes();
```

Run with: `node test-routes.js` (requires Node.js fetch or node-fetch)

## Expected Results Summary

### ✅ Success Criteria

- [ ] All public routes accessible
- [ ] All protected routes redirect to login
- [ ] Admin routes check admin role
- [ ] 404 page shows for invalid routes
- [ ] Lazy loading works (chunks load on demand)
- [ ] Error boundary catches errors
- [ ] Loading states show during chunk loads
- [ ] Refresh works on all routes
- [ ] Deep linking works
- [ ] Authentication flow works
- [ ] Scroll restoration works
- [ ] No console errors
- [ ] Bundle size reduced
- [ ] Lighthouse score improved

### ❌ Failure Indicators

- Console errors on route navigation
- White screen on route access
- 404 from server instead of React 404
- Missing chunks in dist/assets/js/
- Slow loading without loading indicator
- Errors not caught by error boundary
- Routes not accessible via direct URL
- Refresh causes 404 error

## Troubleshooting

### Issue: 404 on Refresh
**Cause:** Server not configured for SPA fallback
**Fix:** Check deployment platform configuration (nginx.conf, vercel.json, etc.)

### Issue: Chunk Loading Failed
**Cause:** Network error or missing chunk file
**Fix:** Check Network tab, verify build output, check error boundary

### Issue: Infinite Loading
**Cause:** Lazy import path incorrect
**Fix:** Check console for import errors, verify file paths

### Issue: No Lazy Loading
**Cause:** All routes being imported directly
**Fix:** Verify lazy() calls in App.tsx

### Issue: Error Boundary Not Working
**Cause:** Error boundary not wrapping routes
**Fix:** Verify ErrorBoundary wraps BrowserRouter in App.tsx

## Notes

- Test with clean browser cache (Ctrl+Shift+R)
- Use Network tab to verify chunk loading
- Check Console for errors
- Use React DevTools to verify component hierarchy
- Monitor bundle sizes in dist/ directory
