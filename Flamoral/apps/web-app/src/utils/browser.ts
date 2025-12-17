/**
 * Browser Detection and Compatibility Utilities
 * Provides utilities for detecting browser capabilities and applying browser-specific fixes
 */

export interface BrowserInfo {
  name: string;
  version: string;
  isIOS: boolean;
  isSafari: boolean;
  isChrome: boolean;
  isFirefox: boolean;
  isEdge: boolean;
  isMobile: boolean;
  supportsWebRTC: boolean;
  supportsWebSocket: boolean;
  supportsServiceWorker: boolean;
  supportsWebP: boolean;
}

/**
 * Detect current browser and its capabilities
 */
export function detectBrowser(): BrowserInfo {
  const ua = navigator.userAgent;

  // Detect mobile
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);

  // Detect iOS
  const isIOS = /iPad|iPhone|iPod/.test(ua);

  // Detect Safari (but not Chrome on iOS)
  const isSafari = /^((?!chrome|android).)*safari/i.test(ua);

  // Detect Chrome
  const isChrome = /Chrome/.test(ua) && /Google Inc/.test(navigator.vendor);

  // Detect Firefox
  const isFirefox = /Firefox/.test(ua);

  // Detect Edge
  const isEdge = /Edg/.test(ua);

  // Determine browser name
  let name = 'Unknown';
  if (isEdge) name = 'Edge';
  else if (isChrome) name = 'Chrome';
  else if (isSafari) name = 'Safari';
  else if (isFirefox) name = 'Firefox';

  // Extract version
  let version = 'Unknown';
  if (isEdge) {
    const match = ua.match(/Edg\/(\d+)/);
    if (match) version = match[1];
  } else if (isChrome) {
    const match = ua.match(/Chrome\/(\d+)/);
    if (match) version = match[1];
  } else if (isSafari) {
    const match = ua.match(/Version\/(\d+)/);
    if (match) version = match[1];
  } else if (isFirefox) {
    const match = ua.match(/Firefox\/(\d+)/);
    if (match) version = match[1];
  }

  // Check capabilities
  const supportsWebRTC = !!(
    (window as any).RTCPeerConnection ||
    (window as any).webkitRTCPeerConnection ||
    (window as any).mozRTCPeerConnection
  );

  const supportsWebSocket = 'WebSocket' in window;

  const supportsServiceWorker = 'serviceWorker' in navigator;

  // Check WebP support
  const supportsWebP = document.createElement('canvas').toDataURL('image/webp').indexOf('data:image/webp') === 0;

  return {
    name,
    version,
    isIOS,
    isSafari,
    isChrome,
    isFirefox,
    isEdge,
    isMobile,
    supportsWebRTC,
    supportsWebSocket,
    supportsServiceWorker,
    supportsWebP,
  };
}

/**
 * Get optimal WebSocket transport order based on browser
 * Safari and iOS have known WebSocket issues, so we prefer polling first
 */
export function getOptimalTransports(): ('websocket' | 'polling')[] {
  const browser = detectBrowser();

  if (browser.isIOS || browser.isSafari) {
    // Safari and iOS: start with polling, upgrade to websocket
    return ['polling', 'websocket'];
  }

  // Other browsers: websocket first, fallback to polling
  return ['websocket', 'polling'];
}

/**
 * Check if browser needs specific polyfills
 */
export function needsPolyfills(): {
  promise: boolean;
  fetch: boolean;
  intersectionObserver: boolean;
  resizeObserver: boolean;
} {
  return {
    promise: typeof Promise === 'undefined',
    fetch: typeof fetch === 'undefined',
    intersectionObserver: typeof IntersectionObserver === 'undefined',
    resizeObserver: typeof ResizeObserver === 'undefined',
  };
}

/**
 * Get WebRTC configuration adjusted for browser
 */
export function getWebRTCConfig(): RTCConfiguration {
  const browser = detectBrowser();

  const config: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
    iceCandidatePoolSize: 10,
  };

  // Safari specific adjustments
  if (browser.isSafari) {
    config.bundlePolicy = 'max-bundle';
    config.rtcpMuxPolicy = 'require';
  }

  return config;
}

/**
 * Check if browser is supported
 */
export function isBrowserSupported(): { supported: boolean; reason?: string } {
  const browser = detectBrowser();

  // Check minimum requirements
  if (!browser.supportsServiceWorker) {
    return {
      supported: false,
      reason: 'Your browser does not support Service Workers. Please upgrade to a modern browser.',
    };
  }

  if (!browser.supportsWebSocket) {
    return {
      supported: false,
      reason: 'Your browser does not support WebSockets. Please upgrade to a modern browser.',
    };
  }

  // All checks passed
  return { supported: true };
}

/**
 * Log browser information for debugging
 */
export function logBrowserInfo(): void {
  const browser = detectBrowser();
  console.log('[Browser Detection]', {
    name: browser.name,
    version: browser.version,
    isMobile: browser.isMobile,
    isIOS: browser.isIOS,
    supportsWebRTC: browser.supportsWebRTC,
    supportsWebSocket: browser.supportsWebSocket,
    supportsServiceWorker: browser.supportsServiceWorker,
    supportsWebP: browser.supportsWebP,
    userAgent: navigator.userAgent,
  });
}

export default {
  detectBrowser,
  getOptimalTransports,
  needsPolyfills,
  getWebRTCConfig,
  isBrowserSupported,
  logBrowserInfo,
};
