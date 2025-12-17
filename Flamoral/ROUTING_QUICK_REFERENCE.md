# Routing Quick Reference Guide

## Quick Start

### Navigate Programmatically
```typescript
import { useAppNavigation } from '@/hooks/useAppNavigation';

function MyComponent() {
  const navigation = useAppNavigation();

  return (
    <button onClick={() => navigation.goToDiscover()}>
      Go to Discovery
    </button>
  );
}
```

### Use Route Constants
```typescript
import { ROUTES } from '@/utils/routing';
import { Link } from 'react-router-dom';

<Link to={ROUTES.DISCOVER}>Discover</Link>
```

### Check Route Properties
```typescript
import { isProtectedRoute, isAdminRoute } from '@/utils/routing';

if (isProtectedRoute('/discover')) {
  // Route requires authentication
}

if (isAdminRoute('/admin/users')) {
  // Route requires admin access
}
```

## Common Routes

### Public Routes
```typescript
ROUTES.HOME                    // /
ROUTES.LOGIN                   // /login
ROUTES.REGISTER                // /register
ROUTES.PRIVACY_POLICY          // /privacy-policy
ROUTES.TERMS_OF_SERVICE        // /terms-of-service
```

### Protected Routes
```typescript
ROUTES.DISCOVER                // /discover
ROUTES.MATCHES                 // /matches
ROUTES.MESSAGES                // /messages
ROUTES.PROFILE                 // /profile
ROUTES.SETTINGS                // /settings
```

### Admin Routes
```typescript
ROUTES.ADMIN                   // /admin
ROUTES.ADMIN_USERS             // /admin/users
ROUTES.ADMIN_ANALYTICS         // /admin/analytics
```

## Navigation Methods

### Basic Navigation
```typescript
const nav = useAppNavigation();

nav.goToDiscover();           // Navigate to discovery
nav.goToMatches();            // Navigate to matches
nav.goToProfile();            // Navigate to profile
nav.goBack();                 // Go back
nav.goForward();              // Go forward
```

### Navigation with Options
```typescript
// Replace current history entry
nav.goToDiscover({ replace: true });

// Navigate with state
nav.goToProfile({ state: { fromMatch: true } });
```

### Dynamic Routes
```typescript
// Video call with match ID
nav.goToVideoCall('match-123');

// Generic navigation
nav.goTo('/custom-route');
```

## Creating Protected Routes

### Standard Protected Route
```typescript
import { ProtectedRoute } from '@/components/ProtectedRoute';

<Route path="/discover" element={
  <ProtectedRoute>
    <DiscoveryPage />
  </ProtectedRoute>
} />
```

### Admin Protected Route
```typescript
<Route path="/admin" element={
  <ProtectedRoute requireAdmin={true}>
    <AdminDashboardPage />
  </ProtectedRoute>
} />
```

## Route Tracking

### Track Custom Events
```typescript
import { RouteTracker } from '@/utils/routing';

// Get current path
const currentPath = RouteTracker.getCurrentPath();

// Get previous path
const previousPath = RouteTracker.getPreviousPath();
```

## Error Handling

### Route-level Error Boundary
```typescript
import { ErrorBoundary } from '@/components/ErrorBoundary';

<ErrorBoundary fallback={<ErrorPage />}>
  <YourComponent />
</ErrorBoundary>
```

## Common Patterns

### Redirect After Login
```typescript
import { useLocation, useNavigate } from 'react-router-dom';

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();

  // Get return URL
  const from = location.state?.from?.pathname || '/discover';

  const handleLogin = async () => {
    await authService.login(email, password);
    navigate(from, { replace: true });
  };
}
```

### Conditional Navigation
```typescript
const nav = useAppNavigation();

function handleClick() {
  if (user.isVerified) {
    nav.goToDiscover();
  } else {
    nav.goToVerification();
  }
}
```

### Navigation with Confirmation
```typescript
const nav = useAppNavigation();

function handleNavigateAway() {
  if (confirm('Leave without saving?')) {
    nav.goToDiscover();
  }
}
```

## Testing Routes

### Check Route Configuration
```bash
# In browser console (dev mode)
import { ROUTES, ROUTE_CONFIG } from '@/utils/routing';
console.log(ROUTES);
console.log(ROUTE_CONFIG);
```

### Test Protected Routes
1. Access route without auth → Should redirect to login
2. Login → Should redirect to original route
3. Access admin route as non-admin → Should redirect to discover

### Test 404 Handling
Navigate to invalid route → Should show 404 page

## Performance Tips

1. **Use route constants** - Avoid magic strings
2. **Preload critical routes** - Already configured in App.tsx
3. **Lazy load pages** - Use React.lazy() for code splitting
4. **Minimize redirects** - Check auth state before rendering routes

## Common Issues

### Issue: Infinite redirect loop
**Solution:** Check that protected routes don't redirect to themselves

### Issue: 404 on refresh
**Solution:** Configure server to serve index.html for all routes (SPA fallback)

### Issue: Slow route transitions
**Solution:** Verify lazy loading is working, check bundle sizes

### Issue: Lost state on navigation
**Solution:** Use location state or URL parameters for passing data

## Best Practices

1. ✅ Always use route constants from `ROUTES`
2. ✅ Use `useAppNavigation` hook for type safety
3. ✅ Wrap protected content with `ProtectedRoute`
4. ✅ Handle loading states in route components
5. ✅ Test all route transitions
6. ✅ Add error boundaries around route content
7. ✅ Use lazy loading for non-critical routes
8. ✅ Document custom route configurations

## Quick Checklist

- [ ] Route constants defined in `src/utils/routing.ts`
- [ ] Navigation using `useAppNavigation` hook
- [ ] Protected routes wrapped with `ProtectedRoute`
- [ ] Error boundaries configured
- [ ] 404 page implemented
- [ ] Lazy loading for code splitting
- [ ] Route tracking enabled
- [ ] Type safety maintained
- [ ] Tests written for critical flows

## Need Help?

1. Check `FRONTEND_ROUTING_FIX_SUMMARY.md` for detailed documentation
2. Review `src/utils/routing.ts` for all route configurations
3. Check `src/hooks/useAppNavigation.ts` for navigation methods
4. Look at `src/components/ProtectedRoute.tsx` for route protection logic

---

Last Updated: 2025-12-15
