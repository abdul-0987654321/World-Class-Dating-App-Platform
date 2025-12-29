/**
 * Meta Pixel Integration (Facebook/Instagram)
 * Client-side pixel tracking
 */

import { createLogger } from '@flamoral/backend-shared';

const logger = createLogger('meta-pixel');

declare global {
  interface Window {
    fbq: any;
    _fbq: any;
  }
}

/**
 * Initialize Meta Pixel
 */
export function initializeMetaPixel(pixelId: string): void {
  if (typeof window === 'undefined') {
    logger.warn('Meta Pixel: Window object not available (server-side)');
    return;
  }

  // Check if pixel already initialized
  if (window.fbq) {
    logger.info('Meta Pixel already initialized');
    return;
  }

  // Meta Pixel base code
  const fbq: any = function(...args: any[]) {
    if (fbq.callMethod) {
      fbq.callMethod.apply(fbq, args);
    } else {
      fbq.queue.push(args);
    }
  };

  if (!window._fbq) {
    window._fbq = fbq;
  }

  window.fbq = fbq;
  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = '2.0';
  fbq.queue = [];

  // Load pixel script
  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://connect.facebook.net/en_US/fbevents.js';
  document.head.appendChild(script);

  // Initialize pixel
  fbq('init', pixelId);
  fbq('track', 'PageView');

  logger.info('Meta Pixel initialized:', pixelId);
}

/**
 * Track Meta Pixel event
 */
export function trackMetaPixelEvent(
  eventName: string,
  parameters: Record<string, any> = {}
): void {
  if (typeof window === 'undefined' || !window.fbq) {
    logger.warn('Meta Pixel not initialized');
    return;
  }

  window.fbq('track', eventName, parameters);
  logger.info('Meta Pixel event tracked:', eventName, parameters);
}

/**
 * Track custom Meta Pixel event
 */
export function trackMetaPixelCustomEvent(
  eventName: string,
  parameters: Record<string, any> = {}
): void {
  if (typeof window === 'undefined' || !window.fbq) {
    logger.warn('Meta Pixel not initialized');
    return;
  }

  window.fbq('trackCustom', eventName, parameters);
  logger.info('Meta Pixel custom event tracked:', eventName, parameters);
}

/**
 * Track page view
 */
export function trackMetaPageView(): void {
  trackMetaPixelEvent('PageView');
}

/**
 * Track registration started (Lead event)
 */
export function trackMetaRegistrationStarted(data: {
  content_name?: string;
  content_category?: string;
  value?: number;
  currency?: string;
} = {}): void {
  trackMetaPixelEvent('Lead', {
    content_name: data.content_name || 'User Registration',
    content_category: data.content_category || 'registration',
    value: data.value || 0,
    currency: data.currency || 'USD',
  });
}

/**
 * Track registration completed (CompleteRegistration event)
 */
export function trackMetaRegistrationCompleted(data: {
  value?: number;
  currency?: string;
  content_name?: string;
  status?: string;
} = {}): void {
  trackMetaPixelEvent('CompleteRegistration', {
    content_name: data.content_name || 'User Registration',
    value: data.value || 0,
    currency: data.currency || 'USD',
    status: data.status || 'completed',
  });
}

/**
 * Track subscription purchase (Purchase event)
 */
export function trackMetaPurchase(data: {
  value: number;
  currency: string;
  content_name?: string;
  content_type?: string;
  content_ids?: string[];
  num_items?: number;
}): void {
  trackMetaPixelEvent('Purchase', {
    value: data.value,
    currency: data.currency,
    content_name: data.content_name || 'Premium Subscription',
    content_type: data.content_type || 'subscription',
    content_ids: data.content_ids || [],
    num_items: data.num_items || 1,
  });
}

/**
 * Track profile view (ViewContent event)
 */
export function trackMetaViewContent(data: {
  content_name?: string;
  content_category?: string;
  content_ids?: string[];
  value?: number;
  currency?: string;
} = {}): void {
  trackMetaPixelEvent('ViewContent', {
    content_name: data.content_name || 'Profile View',
    content_category: data.content_category || 'profile',
    content_ids: data.content_ids || [],
    value: data.value || 0,
    currency: data.currency || 'USD',
  });
}

/**
 * Track search (Search event)
 */
export function trackMetaSearch(data: {
  search_string?: string;
  content_category?: string;
  value?: number;
  currency?: string;
} = {}): void {
  trackMetaPixelEvent('Search', {
    search_string: data.search_string || '',
    content_category: data.content_category || 'user_search',
    value: data.value || 0,
    currency: data.currency || 'USD',
  });
}

/**
 * Track add to cart (for subscription plans)
 */
export function trackMetaAddToCart(data: {
  content_name: string;
  content_type?: string;
  content_ids?: string[];
  value: number;
  currency: string;
}): void {
  trackMetaPixelEvent('AddToCart', {
    content_name: data.content_name,
    content_type: data.content_type || 'subscription',
    content_ids: data.content_ids || [],
    value: data.value,
    currency: data.currency,
  });
}

/**
 * Track initiate checkout (subscription checkout)
 */
export function trackMetaInitiateCheckout(data: {
  content_category?: string;
  content_ids?: string[];
  num_items?: number;
  value: number;
  currency: string;
}): void {
  trackMetaPixelEvent('InitiateCheckout', {
    content_category: data.content_category || 'subscription',
    content_ids: data.content_ids || [],
    num_items: data.num_items || 1,
    value: data.value,
    currency: data.currency,
  });
}

/**
 * Get Meta Pixel installation snippet
 */
export function getMetaPixelSnippet(pixelId: string): string {
  return `
<!-- Meta Pixel Code -->
<script>
  !function(f,b,e,v,n,t,s)
  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
  n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];
  s.parentNode.insertBefore(t,s)}(window, document,'script',
  'https://connect.facebook.net/en_US/fbevents.js');
  fbq('init', '${pixelId}');
  fbq('track', 'PageView');
</script>
<noscript>
  <img height="1" width="1" style="display:none"
    src="https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1"/>
</noscript>
<!-- End Meta Pixel Code -->
  `.trim();
}

/**
 * Advanced Matching - Set user data
 */
export function setMetaAdvancedMatching(userData: {
  em?: string; // email (should be hashed)
  ph?: string; // phone (should be hashed)
  fn?: string; // first name (should be hashed)
  ln?: string; // last name (should be hashed)
  ct?: string; // city (should be hashed)
  st?: string; // state (should be hashed)
  zp?: string; // zip code (should be hashed)
  country?: string; // country code (should be hashed)
  ge?: 'm' | 'f'; // gender
  db?: string; // date of birth (YYYYMMDD format, should be hashed)
}): void {
  if (typeof window === 'undefined' || !window.fbq) {
    return;
  }

  // Note: In production, hash these values using SHA-256 before sending
  window.fbq('init', window.fbq.pixelId, userData);
}

export default {
  initializeMetaPixel,
  trackMetaPixelEvent,
  trackMetaPixelCustomEvent,
  trackMetaPageView,
  trackMetaRegistrationStarted,
  trackMetaRegistrationCompleted,
  trackMetaPurchase,
  trackMetaViewContent,
  trackMetaSearch,
  trackMetaAddToCart,
  trackMetaInitiateCheckout,
  setMetaAdvancedMatching,
  getMetaPixelSnippet,
};
