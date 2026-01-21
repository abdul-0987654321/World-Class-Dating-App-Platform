/**
 * Performance Optimization Index
 *
 * Complete performance toolkit for Flamoral web app
 *
 * @package @flamoral/web
 */

// Image optimization
export {
  OptimizedImage,
  ProfileImage,
  ImageGallery,
  ImagePreloadLinks,
  generateSrcSet,
  generateBlurDataURL,
  preloadImage,
  preloadImages,
  defaultImageLoader,
  type ImageProps,
  type ProfileImageProps,
  type GalleryImageProps,
  type ImageLoaderConfig,
} from './ImageOptimization';

// Virtual scrolling
export {
  VirtualList,
  VirtualGrid,
  VirtualConversationList,
  VirtualMatchesGrid,
  type VirtualListProps,
  type VirtualListRef,
  type VirtualGridProps,
  type Conversation,
  type ConversationListProps,
  type Match,
  type MatchesGridProps,
} from './VirtualList';

// Performance monitoring
export {
  PerformanceProvider,
  PerformanceOverlay,
  usePerformance,
  useRenderTime,
  useRoutePerformance,
  useApiPerformance,
  type PerformanceMetrics,
  type PerformanceBudget,
  type PerformanceContextValue,
} from './PerformanceMonitor';

// Code splitting
export {
  LazyRoute,
  PageLoadingFallback,
  DiscoveryLoadingFallback,
  MessagesLoadingFallback,
  ProfileLoadingFallback,
  usePreloadOnHover,
  usePreloadRoutes,
  usePredictivePreload,
  lazyWithRetry,
  createLazyComponent,
  preloadCriticalChunks,
  ROUTE_CONFIG,
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
  type LazyComponentOptions,
  type RouteConfig,
} from './CodeSplitting';

// Service worker caching
export {
  registerServiceWorker,
  unregisterServiceWorker,
  sendMessageToSW,
  cleanupCaches,
  preloadResources,
  clearAllCaches,
  CACHE_CONFIG,
  PRECACHE_URLS,
  API_CACHE_PATTERNS,
  SERVICE_WORKER_SCRIPT,
  WEB_APP_MANIFEST,
} from './ServiceWorkerCache';
