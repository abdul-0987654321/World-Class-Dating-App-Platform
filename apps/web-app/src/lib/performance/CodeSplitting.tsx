/**
 * CodeSplitting - Route-based Code Splitting & Lazy Loading
 *
 * Bundle Size Targets:
 * - Initial bundle: < 100KB (gzipped)
 * - Per-route chunk: < 50KB (gzipped)
 * - Total app size: < 500KB (gzipped)
 *
 * Features:
 * - Route-based code splitting
 * - Component-level lazy loading
 * - Preloading for instant navigation
 * - Loading states with skeleton UI
 *
 * @package @flamoral/web
 */

import React, { Suspense, lazy, useEffect, useCallback, ComponentType } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface LazyComponentOptions {
  preload?: boolean;
  fallback?: React.ReactNode;
  errorFallback?: React.ComponentType<{ error: Error; retry: () => void }>;
}

export interface RouteConfig {
  path: string;
  component: React.LazyExoticComponent<ComponentType<any>>;
  preload?: () => Promise<any>;
  chunkName?: string;
}

// ============================================================================
// LAZY LOADING UTILITIES
// ============================================================================

/**
 * Enhanced lazy loading with retry and preload support
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  options: { retries?: number; delay?: number } = {}
): React.LazyExoticComponent<T> {
  const { retries = 3, delay = 1000 } = options;

  return lazy(async () => {
    let lastError: Error | undefined;

    for (let i = 0; i < retries; i++) {
      try {
        return await factory();
      } catch (error) {
        lastError = error as Error;
        if (i < retries - 1) {
          await new Promise((resolve) => setTimeout(resolve, delay * (i + 1)));
        }
      }
    }

    throw lastError;
  });
}

/**
 * Create a lazy component with preload capability
 */
export function createLazyComponent<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>
) {
  let componentPromise: Promise<{ default: T }> | null = null;

  const Component = lazy(() => {
    if (!componentPromise) {
      componentPromise = factory();
    }
    return componentPromise;
  });

  const preload = () => {
    if (!componentPromise) {
      componentPromise = factory();
    }
    return componentPromise;
  };

  return { Component, preload };
}

// ============================================================================
// ROUTE LAZY COMPONENTS
// ============================================================================

// Landing & Auth
export const LandingPage = createLazyComponent(
  () => import(/* webpackChunkName: "landing" */ '../../pages/Landing/AnimatedLandingPage')
);

export const LoginPage = createLazyComponent(
  () => import(/* webpackChunkName: "auth" */ '../../pages/Auth/LoginPage')
);

export const SignupPage = createLazyComponent(
  () => import(/* webpackChunkName: "auth" */ '../../pages/Auth/SignupPage')
);

// Core Features
export const DiscoveryPage = createLazyComponent(
  () => import(/* webpackChunkName: "discovery" */ '../../pages/Discovery/DiscoveryPage')
);

export const MessagesPage = createLazyComponent(
  () => import(/* webpackChunkName: "messages" */ '../../pages/Messages/MessagesPage')
);

export const ProfilePage = createLazyComponent(
  () => import(/* webpackChunkName: "profile" */ '../../pages/Profile/ProfilePage')
);

export const MatchesPage = createLazyComponent(
  () => import(/* webpackChunkName: "matches" */ '../../pages/Matches/MatchesPage')
);

// Settings & Premium
export const SettingsPage = createLazyComponent(
  () => import(/* webpackChunkName: "settings" */ '../../pages/Settings/SettingsPage')
);

export const SubscriptionPage = createLazyComponent(
  () => import(/* webpackChunkName: "subscription" */ '../../pages/Subscription/SubscriptionPage')
);

// Heavy components (load separately)
export const VideoCallModal = createLazyComponent(
  () => import(/* webpackChunkName: "video-call" */ '../../components/VideoCall/VideoCallModal')
);

export const PhotoEditor = createLazyComponent(
  () => import(/* webpackChunkName: "photo-editor" */ '../../components/Photo/PhotoGallery')
);

// ============================================================================
// LOADING FALLBACKS
// ============================================================================

/**
 * Full page loading skeleton
 */
export const PageLoadingFallback: React.FC = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 rounded-full border-4 border-pink-200 border-t-pink-500 animate-spin" />
      <p className="text-gray-500 text-sm">Loading...</p>
    </div>
  </div>
);

/**
 * Discovery page skeleton
 */
export const DiscoveryLoadingFallback: React.FC = () => (
  <div className="min-h-screen bg-gray-100 flex flex-col">
    {/* Header skeleton */}
    <div className="h-16 bg-white shadow-sm flex items-center justify-between px-4">
      <div className="w-24 h-8 bg-gray-200 rounded animate-pulse" />
      <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse" />
    </div>

    {/* Card skeleton */}
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="w-[340px] h-[500px] bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="h-[350px] bg-gray-200 animate-pulse" />
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-32 h-6 bg-gray-200 rounded animate-pulse" />
            <div className="w-6 h-6 bg-gray-200 rounded-full animate-pulse" />
          </div>
          <div className="w-24 h-4 bg-gray-200 rounded animate-pulse" />
          <div className="w-full h-4 bg-gray-200 rounded animate-pulse" />
          <div className="flex gap-2 pt-2">
            <div className="w-16 h-7 bg-gray-200 rounded-full animate-pulse" />
            <div className="w-16 h-7 bg-gray-200 rounded-full animate-pulse" />
            <div className="w-16 h-7 bg-gray-200 rounded-full animate-pulse" />
          </div>
        </div>
      </div>
    </div>

    {/* Action buttons skeleton */}
    <div className="h-20 bg-white flex items-center justify-center gap-4">
      <div className="w-14 h-14 bg-gray-200 rounded-full animate-pulse" />
      <div className="w-16 h-16 bg-gray-200 rounded-full animate-pulse" />
      <div className="w-14 h-14 bg-gray-200 rounded-full animate-pulse" />
    </div>
  </div>
);

/**
 * Messages page skeleton
 */
export const MessagesLoadingFallback: React.FC = () => (
  <div className="min-h-screen bg-white flex flex-col">
    {/* Header */}
    <div className="h-16 border-b border-gray-100 flex items-center px-4">
      <div className="w-28 h-6 bg-gray-200 rounded animate-pulse" />
    </div>

    {/* Conversation list skeleton */}
    <div className="flex-1 overflow-hidden">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center gap-3 p-4 border-b border-gray-50">
          <div className="w-14 h-14 bg-gray-200 rounded-full animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="w-24 h-4 bg-gray-200 rounded animate-pulse" />
            <div className="w-48 h-3 bg-gray-200 rounded animate-pulse" />
          </div>
          <div className="w-10 h-3 bg-gray-200 rounded animate-pulse" />
        </div>
      ))}
    </div>
  </div>
);

/**
 * Profile page skeleton
 */
export const ProfileLoadingFallback: React.FC = () => (
  <div className="min-h-screen bg-white">
    {/* Header with avatar */}
    <div className="h-48 bg-gradient-to-br from-pink-500 to-rose-500 relative">
      <div className="absolute -bottom-16 left-1/2 -translate-x-1/2">
        <div className="w-32 h-32 bg-gray-200 rounded-full border-4 border-white animate-pulse" />
      </div>
    </div>

    {/* Content */}
    <div className="pt-20 px-4 space-y-4">
      <div className="flex flex-col items-center gap-2">
        <div className="w-36 h-6 bg-gray-200 rounded animate-pulse" />
        <div className="w-24 h-4 bg-gray-200 rounded animate-pulse" />
      </div>

      <div className="grid grid-cols-3 gap-4 py-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="aspect-square bg-gray-200 rounded-lg animate-pulse" />
        ))}
      </div>

      <div className="space-y-3">
        <div className="w-full h-4 bg-gray-200 rounded animate-pulse" />
        <div className="w-3/4 h-4 bg-gray-200 rounded animate-pulse" />
        <div className="w-1/2 h-4 bg-gray-200 rounded animate-pulse" />
      </div>
    </div>
  </div>
);

// ============================================================================
// LAZY COMPONENT WRAPPER
// ============================================================================

interface LazyRouteProps {
  component: React.LazyExoticComponent<ComponentType<any>>;
  fallback?: React.ReactNode;
}

export const LazyRoute: React.FC<LazyRouteProps> = ({
  component: Component,
  fallback = <PageLoadingFallback />,
}) => (
  <Suspense fallback={fallback}>
    <Component />
  </Suspense>
);

// ============================================================================
// PRELOADING HOOKS
// ============================================================================

/**
 * Preload a route when user hovers over a link
 */
export const usePreloadOnHover = (preloadFn: () => Promise<any>) => {
  const preloaded = React.useRef(false);

  const handleMouseEnter = useCallback(() => {
    if (!preloaded.current) {
      preloadFn();
      preloaded.current = true;
    }
  }, [preloadFn]);

  return { onMouseEnter: handleMouseEnter };
};

/**
 * Preload routes when user is likely to navigate
 */
export const usePreloadRoutes = (routes: Array<{ preload: () => Promise<any> }>) => {
  useEffect(() => {
    // Preload after initial render
    const timeoutId = setTimeout(() => {
      routes.forEach((route) => {
        route.preload().catch(() => {
          // Silently fail preload
        });
      });
    }, 2000);

    return () => clearTimeout(timeoutId);
  }, [routes]);
};

/**
 * Preload next page based on user behavior
 */
export const usePredictivePreload = () => {
  useEffect(() => {
    // Preload discovery page (most likely next action after login)
    DiscoveryPage.preload();

    // Preload messages (common navigation)
    const timer = setTimeout(() => {
      MessagesPage.preload();
    }, 3000);

    return () => clearTimeout(timer);
  }, []);
};

// ============================================================================
// ROUTE CONFIGURATION
// ============================================================================

export const ROUTE_CONFIG: RouteConfig[] = [
  {
    path: '/',
    component: LandingPage.Component,
    preload: LandingPage.preload,
    chunkName: 'landing',
  },
  {
    path: '/login',
    component: LoginPage.Component,
    preload: LoginPage.preload,
    chunkName: 'auth',
  },
  {
    path: '/signup',
    component: SignupPage.Component,
    preload: SignupPage.preload,
    chunkName: 'auth',
  },
  {
    path: '/discovery',
    component: DiscoveryPage.Component,
    preload: DiscoveryPage.preload,
    chunkName: 'discovery',
  },
  {
    path: '/messages',
    component: MessagesPage.Component,
    preload: MessagesPage.preload,
    chunkName: 'messages',
  },
  {
    path: '/profile',
    component: ProfilePage.Component,
    preload: ProfilePage.preload,
    chunkName: 'profile',
  },
  {
    path: '/matches',
    component: MatchesPage.Component,
    preload: MatchesPage.preload,
    chunkName: 'matches',
  },
  {
    path: '/settings',
    component: SettingsPage.Component,
    preload: SettingsPage.preload,
    chunkName: 'settings',
  },
  {
    path: '/subscription',
    component: SubscriptionPage.Component,
    preload: SubscriptionPage.preload,
    chunkName: 'subscription',
  },
];

// ============================================================================
// SERVICE WORKER PRELOADING
// ============================================================================

/**
 * Preload critical chunks via service worker
 */
export const preloadCriticalChunks = () => {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    const criticalChunks = [
      '/assets/discovery.js',
      '/assets/messages.js',
    ];

    criticalChunks.forEach((chunk) => {
      navigator.serviceWorker.controller?.postMessage({
        type: 'PRELOAD_CHUNK',
        url: chunk,
      });
    });
  }
};

export default {
  LazyRoute,
  PageLoadingFallback,
  DiscoveryLoadingFallback,
  MessagesLoadingFallback,
  ProfileLoadingFallback,
  usePreloadOnHover,
  usePreloadRoutes,
  usePredictivePreload,
  ROUTE_CONFIG,
  preloadCriticalChunks,
  // Lazy components
  LandingPage,
  LoginPage,
  SignupPage,
  DiscoveryPage,
  MessagesPage,
  ProfilePage,
  MatchesPage,
  SettingsPage,
  SubscriptionPage,
  VideoCallModal,
  PhotoEditor,
};
