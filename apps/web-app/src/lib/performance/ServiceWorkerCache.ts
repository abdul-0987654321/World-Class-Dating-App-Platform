/**
 * ServiceWorkerCache - Intelligent Caching Strategy
 *
 * Caching Strategies:
 * - Cache-First: Static assets (JS, CSS, fonts)
 * - Network-First: API responses
 * - Stale-While-Revalidate: Images
 * - Cache-Only: App shell
 *
 * @package @flamoral/web
 */

// ============================================================================
// TYPES
// ============================================================================

interface CacheConfig {
  name: string;
  maxAge: number; // in seconds
  maxEntries?: number;
}

interface CacheStrategies {
  cacheFirst: CacheConfig;
  networkFirst: CacheConfig;
  staleWhileRevalidate: CacheConfig;
}

// ============================================================================
// CACHE CONFIGURATION
// ============================================================================

export const CACHE_CONFIG: CacheStrategies = {
  // Static assets - cache first, update in background
  cacheFirst: {
    name: 'flamoral-static-v1',
    maxAge: 7 * 24 * 60 * 60, // 7 days
    maxEntries: 100,
  },

  // API responses - network first with cache fallback
  networkFirst: {
    name: 'flamoral-api-v1',
    maxAge: 5 * 60, // 5 minutes
    maxEntries: 50,
  },

  // Images - stale while revalidate
  staleWhileRevalidate: {
    name: 'flamoral-images-v1',
    maxAge: 24 * 60 * 60, // 24 hours
    maxEntries: 200,
  },
};

// URLs to precache
export const PRECACHE_URLS = ['/', '/index.html', '/manifest.json'];

// API routes to cache
export const API_CACHE_PATTERNS = [
  '/api/v1/profiles',
  '/api/v1/matches',
  '/api/v1/conversations',
  '/api/v1/user/profile',
];

// Static asset patterns
export const STATIC_ASSET_PATTERNS = [/\.js$/, /\.css$/, /\.woff2?$/, /\.ttf$/, /\.otf$/];

// Image patterns
export const IMAGE_PATTERNS = [
  /\.png$/,
  /\.jpg$/,
  /\.jpeg$/,
  /\.webp$/,
  /\.avif$/,
  /\.gif$/,
  /\.svg$/,
];

// ============================================================================
// SERVICE WORKER REGISTRATION
// ============================================================================

/**
 * Register service worker with update handling
 */
export const registerServiceWorker = async (options?: {
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
  onError?: (error: Error) => void;
}): Promise<ServiceWorkerRegistration | null> => {
  if (!('serviceWorker' in navigator)) {
    console.log('Service Worker not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    // Check for updates
    registration.onupdatefound = () => {
      const installingWorker = registration.installing;
      if (!installingWorker) return;

      installingWorker.onstatechange = () => {
        if (installingWorker.state === 'installed') {
          if (navigator.serviceWorker.controller) {
            // New content is available, notify user
            options?.onUpdate?.(registration);
            console.log('New content available; please refresh.');
          } else {
            // Content is cached for offline use
            options?.onSuccess?.(registration);
            console.log('Content is cached for offline use.');
          }
        }
      };
    };

    return registration;
  } catch (error) {
    options?.onError?.(error as Error);
    console.error('Service Worker registration failed:', error);
    return null;
  }
};

/**
 * Unregister service worker
 */
export const unregisterServiceWorker = async (): Promise<boolean> => {
  if (!('serviceWorker' in navigator)) {
    return false;
  }

  const registration = await navigator.serviceWorker.ready;
  return registration.unregister();
};

// ============================================================================
// SERVICE WORKER COMMUNICATION
// ============================================================================

/**
 * Send message to service worker
 */
export const sendMessageToSW = <T>(message: any): Promise<T> => {
  return new Promise((resolve, reject) => {
    if (!navigator.serviceWorker.controller) {
      reject(new Error('No active service worker'));
      return;
    }

    const messageChannel = new MessageChannel();
    messageChannel.port1.onmessage = (event) => {
      if (event.data.error) {
        reject(event.data.error);
      } else {
        resolve(event.data);
      }
    };

    navigator.serviceWorker.controller.postMessage(message, [messageChannel.port2]);
  });
};

/**
 * Request cache cleanup
 */
export const cleanupCaches = (): Promise<void> => {
  return sendMessageToSW({ type: 'CLEANUP_CACHES' });
};

/**
 * Preload specific resources
 */
export const preloadResources = (urls: string[]): Promise<void> => {
  return sendMessageToSW({ type: 'PRELOAD_RESOURCES', urls });
};

/**
 * Clear all caches
 */
export const clearAllCaches = async (): Promise<boolean> => {
  if (!('caches' in window)) {
    return false;
  }

  const cacheNames = await caches.keys();
  await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));

  return true;
};

// ============================================================================
// SERVICE WORKER SCRIPT (sw.js content)
// ============================================================================

export const SERVICE_WORKER_SCRIPT = `
// Flamoral Service Worker v1

const CACHE_VERSION = 'v1';
const STATIC_CACHE = 'flamoral-static-' + CACHE_VERSION;
const API_CACHE = 'flamoral-api-' + CACHE_VERSION;
const IMAGE_CACHE = 'flamoral-images-' + CACHE_VERSION;

// Precache URLs
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// Install event - precache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name.startsWith('flamoral-') && !name.includes(CACHE_VERSION))
            .map((name) => caches.delete(name))
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - apply caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip cross-origin requests (except images)
  if (url.origin !== location.origin && !isImage(url.pathname)) return;

  // API requests - Network First
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request, API_CACHE));
    return;
  }

  // Images - Stale While Revalidate
  if (isImage(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request, IMAGE_CACHE));
    return;
  }

  // Static assets - Cache First
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // HTML pages - Network First
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirst(request, STATIC_CACHE));
    return;
  }
});

// Cache First Strategy
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    return new Response('Offline', { status: 503 });
  }
}

// Network First Strategy
async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    return cached || new Response('Offline', { status: 503 });
  }
}

// Stale While Revalidate Strategy
async function staleWhileRevalidate(request, cacheName) {
  const cached = await caches.match(request);

  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) {
      caches.open(cacheName).then((cache) => {
        cache.put(request, response.clone());
      });
    }
    return response;
  });

  return cached || fetchPromise;
}

// Helper functions
function isStaticAsset(pathname) {
  return /\\.(js|css|woff2?|ttf|otf)$/.test(pathname);
}

function isImage(pathname) {
  return /\\.(png|jpg|jpeg|webp|avif|gif|svg)$/.test(pathname);
}

// Message handling
self.addEventListener('message', (event) => {
  const { type, urls } = event.data;

  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;

    case 'CLEANUP_CACHES':
      cleanupOldEntries()
        .then(() => event.ports[0]?.postMessage({ success: true }));
      break;

    case 'PRELOAD_RESOURCES':
      preloadUrls(urls)
        .then(() => event.ports[0]?.postMessage({ success: true }));
      break;

    case 'PRELOAD_CHUNK':
      fetch(event.data.url, { mode: 'no-cors' });
      break;
  }
});

async function cleanupOldEntries() {
  const cacheNames = await caches.keys();
  for (const name of cacheNames) {
    const cache = await caches.open(name);
    const keys = await cache.keys();

    // Keep only last 100 entries
    if (keys.length > 100) {
      const toDelete = keys.slice(0, keys.length - 100);
      await Promise.all(toDelete.map((key) => cache.delete(key)));
    }
  }
}

async function preloadUrls(urls) {
  const cache = await caches.open(STATIC_CACHE);
  return cache.addAll(urls);
}
`;

// ============================================================================
// MANIFEST CONFIGURATION
// ============================================================================

export const WEB_APP_MANIFEST = {
  name: 'Flamoral',
  short_name: 'Flamoral',
  description: 'Where Passion Meets Connection',
  start_url: '/',
  display: 'standalone',
  theme_color: '#E91E63',
  background_color: '#1a1a2e',
  icons: [
    {
      src: '/icons/icon-192x192.png',
      sizes: '192x192',
      type: 'image/png',
      purpose: 'maskable any',
    },
    {
      src: '/icons/icon-512x512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'maskable any',
    },
  ],
  screenshots: [
    {
      src: '/screenshots/discovery.png',
      sizes: '1080x1920',
      type: 'image/png',
      label: 'Discovery',
    },
    {
      src: '/screenshots/messages.png',
      sizes: '1080x1920',
      type: 'image/png',
      label: 'Messages',
    },
  ],
  categories: ['social', 'lifestyle'],
  orientation: 'portrait-primary',
};

export default {
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
};
