/**
 * Routing Utilities
 * Centralized routing configuration and helpers
 */

export interface RouteConfig {
  path: string;
  name: string;
  isProtected: boolean;
  requiresAdmin?: boolean;
  preload?: boolean;
}

/**
 * Route definitions for the application
 * Centralized for easy maintenance and documentation
 */
export const ROUTES = {
  // Public routes
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  SIGNUP: '/signup',
  PRIVACY_POLICY: '/privacy-policy',
  TERMS_OF_SERVICE: '/terms-of-service',
  TIER_SHOWCASE: '/tier-showcase',

  // Protected routes
  DISCOVER: '/discover',
  MATCHES: '/matches',
  MESSAGES: '/messages',
  PROFILE: '/profile',
  PROFILE_EDIT: '/profile/edit',
  SAFETY: '/safety',
  REWARDS: '/rewards',
  COMMUNITIES: '/communities',
  SPEED_DATING: '/speed-dating',
  REFERRALS: '/referrals',
  SUBSCRIPTION: '/subscription',
  FILTERS: '/filters',
  VIDEO_CALL: '/video-call/:matchId',
  SETTINGS: '/settings',
  VERIFICATION: '/verification',
  PRIVACY_SETTINGS: '/privacy',
  NOTIFICATION_SETTINGS: '/notifications',
  HELP: '/help',

  // Admin routes
  ADMIN: '/admin',
  ADMIN_USERS: '/admin/users',
  ADMIN_VERIFICATIONS: '/admin/verifications',
  ADMIN_REPORTS: '/admin/reports',
  ADMIN_ANALYTICS: '/admin/analytics',
  ADMIN_MODERATION: '/admin/moderation',
  ADMIN_SETTINGS: '/admin/settings',
} as const;

/**
 * Route metadata configuration
 */
export const ROUTE_CONFIG: Record<string, RouteConfig> = {
  [ROUTES.HOME]: {
    path: ROUTES.HOME,
    name: 'Home',
    isProtected: false,
  },
  [ROUTES.LOGIN]: {
    path: ROUTES.LOGIN,
    name: 'Login',
    isProtected: false,
  },
  [ROUTES.REGISTER]: {
    path: ROUTES.REGISTER,
    name: 'Register',
    isProtected: false,
  },
  [ROUTES.DISCOVER]: {
    path: ROUTES.DISCOVER,
    name: 'Discover',
    isProtected: true,
    preload: true,
  },
  [ROUTES.MATCHES]: {
    path: ROUTES.MATCHES,
    name: 'Matches',
    isProtected: true,
    preload: true,
  },
  [ROUTES.MESSAGES]: {
    path: ROUTES.MESSAGES,
    name: 'Messages',
    isProtected: true,
    preload: true,
  },
  [ROUTES.PROFILE]: {
    path: ROUTES.PROFILE,
    name: 'Profile',
    isProtected: true,
    preload: true,
  },
  [ROUTES.ADMIN]: {
    path: ROUTES.ADMIN,
    name: 'Admin Dashboard',
    isProtected: true,
    requiresAdmin: true,
  },
  [ROUTES.ADMIN_USERS]: {
    path: ROUTES.ADMIN_USERS,
    name: 'User Management',
    isProtected: true,
    requiresAdmin: true,
  },
  [ROUTES.ADMIN_VERIFICATIONS]: {
    path: ROUTES.ADMIN_VERIFICATIONS,
    name: 'Verifications',
    isProtected: true,
    requiresAdmin: true,
  },
  [ROUTES.ADMIN_REPORTS]: {
    path: ROUTES.ADMIN_REPORTS,
    name: 'Reports',
    isProtected: true,
    requiresAdmin: true,
  },
  [ROUTES.ADMIN_ANALYTICS]: {
    path: ROUTES.ADMIN_ANALYTICS,
    name: 'Analytics',
    isProtected: true,
    requiresAdmin: true,
  },
  [ROUTES.ADMIN_MODERATION]: {
    path: ROUTES.ADMIN_MODERATION,
    name: 'Moderation',
    isProtected: true,
    requiresAdmin: true,
  },
  [ROUTES.ADMIN_SETTINGS]: {
    path: ROUTES.ADMIN_SETTINGS,
    name: 'Admin Settings',
    isProtected: true,
    requiresAdmin: true,
  },
};

/**
 * Check if a route requires authentication
 */
export const isProtectedRoute = (path: string): boolean => {
  const route = ROUTE_CONFIG[path];
  return route ? route.isProtected : false;
};

/**
 * Check if a route requires admin access
 */
export const isAdminRoute = (path: string): boolean => {
  const route = ROUTE_CONFIG[path];
  return route ? route.requiresAdmin === true : false;
};

/**
 * Get route name from path
 */
export const getRouteName = (path: string): string => {
  const route = ROUTE_CONFIG[path];
  return route ? route.name : 'Unknown';
};

/**
 * Check if route should be preloaded
 */
export const shouldPreloadRoute = (path: string): boolean => {
  const route = ROUTE_CONFIG[path];
  return route ? route.preload === true : false;
};

/**
 * Build a video call route with matchId
 */
export const buildVideoCallRoute = (matchId: string): string => {
  return `/video-call/${matchId}`;
};

/**
 * List of public routes (doesn't require authentication)
 */
export const PUBLIC_ROUTES = [
  ROUTES.HOME,
  ROUTES.LOGIN,
  ROUTES.REGISTER,
  ROUTES.SIGNUP,
  ROUTES.PRIVACY_POLICY,
  ROUTES.TERMS_OF_SERVICE,
  ROUTES.TIER_SHOWCASE,
];

/**
 * List of admin-only routes
 */
export const ADMIN_ROUTES = [
  ROUTES.ADMIN,
  ROUTES.ADMIN_USERS,
  ROUTES.ADMIN_VERIFICATIONS,
  ROUTES.ADMIN_REPORTS,
  ROUTES.ADMIN_ANALYTICS,
  ROUTES.ADMIN_MODERATION,
  ROUTES.ADMIN_SETTINGS,
];

/**
 * Default redirect after login
 */
export const DEFAULT_AUTH_REDIRECT = ROUTES.DISCOVER;

/**
 * Default redirect after logout
 */
export const DEFAULT_LOGOUT_REDIRECT = ROUTES.HOME;

/**
 * Route transition tracker for analytics
 */
export class RouteTracker {
  private static previousPath: string | null = null;
  private static currentPath: string | null = null;

  static track(path: string): void {
    this.previousPath = this.currentPath;
    this.currentPath = path;

    // Log route change in development
    if (import.meta.env.DEV) {
      console.log(`[Route] ${this.previousPath || 'initial'} → ${this.currentPath}`);
    }

    // You can add analytics tracking here
    // Example: analytics.trackPageView(path);
  }

  static getPreviousPath(): string | null {
    return this.previousPath;
  }

  static getCurrentPath(): string | null {
    return this.currentPath;
  }
}

/**
 * Utility to determine if we should redirect based on auth state
 */
export const getRedirectPath = (
  isAuthenticated: boolean,
  currentPath: string,
  isAdmin: boolean = false
): string | null => {
  // If authenticated and trying to access login/register, redirect to discover
  if (isAuthenticated && [ROUTES.LOGIN, ROUTES.REGISTER, ROUTES.SIGNUP].includes(currentPath)) {
    return ROUTES.DISCOVER;
  }

  // If not authenticated and trying to access protected route, redirect to login
  if (!isAuthenticated && isProtectedRoute(currentPath)) {
    return ROUTES.LOGIN;
  }

  // If trying to access admin route without admin access, redirect to discover
  if (isAuthenticated && !isAdmin && isAdminRoute(currentPath)) {
    return ROUTES.DISCOVER;
  }

  return null;
};
