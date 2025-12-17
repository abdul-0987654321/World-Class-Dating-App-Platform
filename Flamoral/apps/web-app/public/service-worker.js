/**
 * Flamoral Service Worker
 * Provides offline support, caching, and PWA capabilities
 * Version: 1.1.1
 */

const CACHE_VERSION = 'v1.1.1';
const CACHE_NAME = `flamoral-cache-${CACHE_VERSION}`;
const PRECACHE_NAME = `flamoral-precache-${CACHE_VERSION}`;
const RUNTIME_CACHE = `flamoral-runtime-${CACHE_VERSION}`;
const TIMESTAMP_CACHE = `cache-timestamps-${CACHE_VERSION}`;

// Cache expiration times (in milliseconds)
const CACHE_MAX_AGE = {
  STATIC: 30 * 24 * 60 * 60 * 1000, // 30 days
  IMAGES: 7 * 24 * 60 * 60 * 1000,  // 7 days
  API: 5 * 60 * 1000,                // 5 minutes
  HTML: 1 * 60 * 60 * 1000,          // 1 hour
};

// Maximum cache entries
const MAX_CACHE_SIZE = {
  RUNTIME: 100,
  IMAGES: 50,
};

// Assets to precache on install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/flamoral-icon.svg',
  '/manifest.json',
];

// Cache strategies
const CACHE_STRATEGIES = {
  NETWORK_FIRST: 'network-first',
  CACHE_FIRST: 'cache-first',
  STALE_WHILE_REVALIDATE: 'stale-while-revalidate',
  NETWORK_ONLY: 'network-only',
  CACHE_ONLY: 'cache-only',
};

// Route-based cache strategy mapping
const getCacheStrategy = (url) => {
  const pathname = new URL(url).pathname;

  // API requests - network first
  if (pathname.startsWith('/api/')) {
    return CACHE_STRATEGIES.NETWORK_FIRST;
  }

  // Static assets - cache first
  if (
    pathname.match(/\.(js|css|woff2|woff|ttf|eot|otf)$/) ||
    pathname.startsWith('/assets/')
  ) {
    return CACHE_STRATEGIES.CACHE_FIRST;
  }

  // Images - stale while revalidate for better UX
  if (pathname.match(/\.(jpg|jpeg|png|gif|webp|avif|svg|ico)$/)) {
    return CACHE_STRATEGIES.STALE_WHILE_REVALIDATE;
  }

  // HTML pages - network first with fallback
  if (pathname.match(/\.html?$/i) || pathname === '/' || !pathname.includes('.')) {
    return CACHE_STRATEGIES.NETWORK_FIRST;
  }

  // Default - stale while revalidate
  return CACHE_STRATEGIES.STALE_WHILE_REVALIDATE;
};

/**
 * Install Event - Precache critical assets
 */
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');

  event.waitUntil(
    caches.open(PRECACHE_NAME)
      .then(cache => {
        console.log('[SW] Precaching assets');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => {
        console.log('[SW] Skip waiting');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('[SW] Precaching failed:', error);
      })
  );
});

/**
 * Activate Event - Cleanup old caches
 */
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');

  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(name => {
              // Remove old caches from all cache types
              return (
                name.startsWith('flamoral-cache-') ||
                name.startsWith('flamoral-precache-') ||
                name.startsWith('flamoral-runtime-') ||
                name.startsWith('cache-timestamps-')
              ) && name !== CACHE_NAME && name !== PRECACHE_NAME && name !== RUNTIME_CACHE && name !== TIMESTAMP_CACHE;
            })
            .map(name => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[SW] Claiming clients');
        return self.clients.claim();
      })
  );
});

/**
 * Fetch Event - Handle requests with appropriate caching strategy
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests
  if (!request.url.startsWith(self.location.origin)) {
    return;
  }

  const strategy = getCacheStrategy(request.url);

  if (strategy === CACHE_STRATEGIES.NETWORK_FIRST) {
    event.respondWith(networkFirst(request));
  } else if (strategy === CACHE_STRATEGIES.CACHE_FIRST) {
    event.respondWith(cacheFirst(request));
  } else if (strategy === CACHE_STRATEGIES.STALE_WHILE_REVALIDATE) {
    event.respondWith(staleWhileRevalidate(request));
  } else if (strategy === CACHE_STRATEGIES.NETWORK_ONLY) {
    event.respondWith(fetch(request));
  } else if (strategy === CACHE_STRATEGIES.CACHE_ONLY) {
    event.respondWith(caches.match(request));
  }
});

/**
 * Network First Strategy
 * Try network first, fall back to cache
 */
async function networkFirst(request) {
  try {
    const response = await fetch(request);

    // Clone response for caching
    const responseClone = response.clone();

    // Cache successful responses
    if (response.status === 200) {
      caches.open(CACHE_NAME).then(cache => {
        cache.put(request, responseClone);
      });
    }

    return response;
  } catch (error) {
    console.log('[SW] Network request failed, trying cache:', request.url);

    // Network failed, try cache
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    // No cache, return offline page or error
    if (request.destination === 'document') {
      return caches.match('/index.html');
    }

    throw error;
  }
}

/**
 * Cache First Strategy
 * Try cache first, fall back to network
 */
async function cacheFirst(request) {
  // Try cache first
  const cachedResponse = await caches.match(request);

  if (cachedResponse) {
    // Check if cache is expired
    const cacheTime = await getCacheTimestamp(request);
    const isExpired = cacheTime && (Date.now() - cacheTime > CACHE_MAX_AGE.STATIC);

    if (!isExpired) {
      console.log('[SW] Cache hit:', request.url);
      return cachedResponse;
    }
  }

  console.log('[SW] Cache miss or expired, fetching from network:', request.url);

  try {
    const response = await fetch(request);

    // Clone response for caching
    const responseClone = response.clone();

    // Cache successful responses
    if (response.status === 200) {
      const cache = await caches.open(RUNTIME_CACHE);
      await cache.put(request, responseClone);
      await setCacheTimestamp(request, Date.now());

      // Trim cache if needed
      await trimCache(RUNTIME_CACHE, MAX_CACHE_SIZE.RUNTIME);
    }

    return response;
  } catch (error) {
    console.error('[SW] Network request failed:', request.url, error);

    // Return stale cache if available
    if (cachedResponse) {
      console.log('[SW] Returning stale cache due to network error');
      return cachedResponse;
    }

    throw error;
  }
}

/**
 * Stale While Revalidate Strategy
 * Return cached response immediately, update cache in background
 */
async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cachedResponse = await cache.match(request);

  // Fetch fresh response in background
  const fetchPromise = fetch(request).then(async (response) => {
    if (response.status === 200) {
      const responseClone = response.clone();
      await cache.put(request, responseClone);
      await setCacheTimestamp(request, Date.now());

      // Trim cache if needed
      await trimCache(RUNTIME_CACHE, MAX_CACHE_SIZE.RUNTIME);
    }
    return response;
  }).catch((error) => {
    console.error('[SW] Background fetch failed:', request.url, error);
    return null;
  });

  // Return cached response immediately if available
  if (cachedResponse) {
    console.log('[SW] Returning cached response, revalidating in background');
    return cachedResponse;
  }

  // Wait for network response if no cache available
  console.log('[SW] No cache available, waiting for network');
  const networkResponse = await fetchPromise;
  if (networkResponse) {
    return networkResponse;
  }

  // Return offline page or error
  if (request.destination === 'document') {
    return cache.match('/index.html');
  }

  return new Response('Offline', { status: 503 });
}

/**
 * Trim cache to max size
 */
async function trimCache(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();

  if (keys.length > maxItems) {
    // Remove oldest entries (FIFO)
    const toDelete = keys.slice(0, keys.length - maxItems);
    await Promise.all(toDelete.map(key => cache.delete(key)));
    console.log(`[SW] Trimmed ${toDelete.length} entries from ${cacheName}`);
  }
}

/**
 * Set cache timestamp for expiration tracking
 */
async function setCacheTimestamp(request, timestamp) {
  const cache = await caches.open(TIMESTAMP_CACHE);
  const url = typeof request === 'string' ? request : request.url;
  await cache.put(url, new Response(timestamp.toString()));
}

/**
 * Get cache timestamp
 */
async function getCacheTimestamp(request) {
  try {
    const cache = await caches.open(TIMESTAMP_CACHE);
    const url = typeof request === 'string' ? request : request.url;
    const response = await cache.match(url);
    if (response) {
      const text = await response.text();
      return parseInt(text, 10);
    }
  } catch (error) {
    console.error('[SW] Error getting cache timestamp:', error);
  }
  return null;
}

/**
 * Message Event - Handle messages from clients
 */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(name => caches.delete(name))
        );
      })
    );
  }
});

/**
 * Sync Event - Background sync
 */
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-messages') {
    event.waitUntil(syncMessages());
  }
});

/**
 * Push Event - Push notifications
 */
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};

  const options = {
    body: data.body || 'You have a new notification',
    icon: '/flamoral-icon.svg',
    badge: '/flamoral-icon.svg',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/',
    },
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Flamoral', options)
  );
});

/**
 * Notification Click Event
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  );
});

/**
 * Background sync for messages
 */
async function syncMessages() {
  // Implement background sync logic
  console.log('[SW] Syncing messages...');
}

console.log('[SW] Service worker loaded');
