/**
 * TikTok Pixel Integration
 * Client-side pixel tracking for TikTok ads
 */

declare global {
  interface Window {
    ttq: any;
  }
}

/**
 * Initialize TikTok Pixel
 */
export function initializeTikTokPixel(pixelId: string): void {
  if (typeof window === 'undefined') {
    console.warn('TikTok Pixel: Window object not available (server-side)');
    return;
  }

  // Check if pixel already initialized
  if (window.ttq) {
    console.log('TikTok Pixel already initialized');
    return;
  }

  // TikTok Pixel base code
  const ttq: any = function(...args: any[]) {
    if (ttq.methods) {
      ttq.methods.forEach((method: string) => {
        if (ttq[method]) {
          ttq[method].apply(ttq, args);
        }
      });
    } else {
      ttq.queue.push(args);
    }
  };

  ttq.methods = ['page', 'track', 'identify', 'instances', 'debug', 'on', 'off', 'once', 'ready', 'alias', 'group', 'enableCookie', 'disableCookie'];
  ttq.setAndDefer = function(obj: any, method: string) {
    obj[method] = function(...args: any[]) {
      obj.push([method].concat(Array.prototype.slice.call(args, 0)));
    };
  };

  ttq.instance = function(id: string) {
    const instance: any = function(...args: any[]) {
      instance.push(args);
    };
    instance._i = id;
    instance.queue = [];
    ttq.methods.forEach((method: string) => {
      ttq.setAndDefer(instance, method);
    });
    return instance;
  };

  window.ttq = ttq;
  ttq.queue = [];
  ttq.version = '1.1';

  // Load pixel script
  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://analytics.tiktok.com/i18n/pixel/events.js?sdkid=' + pixelId + '&lib=ttq';
  document.head.appendChild(script);

  // Initialize pixel
  ttq.load(pixelId);
  ttq.page();

  console.log('TikTok Pixel initialized:', pixelId);
}

/**
 * Track TikTok Pixel event
 */
export function trackTikTokPixelEvent(
  eventName: string,
  properties: Record<string, any> = {}
): void {
  if (typeof window === 'undefined' || !window.ttq) {
    console.warn('TikTok Pixel not initialized');
    return;
  }

  window.ttq.track(eventName, properties);
  console.log('TikTok Pixel event tracked:', eventName, properties);
}

/**
 * Track page view
 */
export function trackTikTokPageView(): void {
  if (typeof window === 'undefined' || !window.ttq) {
    return;
  }

  window.ttq.page();
}

/**
 * Track registration started (InitiateCheckout for registration)
 */
export function trackTikTokRegistrationStarted(data: {
  value?: number;
  currency?: string;
  content_type?: string;
} = {}): void {
  trackTikTokPixelEvent('InitiateCheckout', {
    content_type: data.content_type || 'registration',
    value: data.value || 0,
    currency: data.currency || 'USD',
  });
}

/**
 * Track registration completed (CompleteRegistration event)
 */
export function trackTikTokRegistrationCompleted(data: {
  value?: number;
  currency?: string;
  content_type?: string;
} = {}): void {
  trackTikTokPixelEvent('CompleteRegistration', {
    content_type: data.content_type || 'registration',
    value: data.value || 0,
    currency: data.currency || 'USD',
  });
}

/**
 * Track subscription purchase (CompletePayment event)
 */
export function trackTikTokPurchase(data: {
  value: number;
  currency: string;
  content_type?: string;
  content_id?: string;
  quantity?: number;
}): void {
  trackTikTokPixelEvent('CompletePayment', {
    content_type: data.content_type || 'subscription',
    content_id: data.content_id,
    value: data.value,
    currency: data.currency,
    quantity: data.quantity || 1,
  });
}

/**
 * Track profile view (ViewContent event)
 */
export function trackTikTokViewContent(data: {
  content_type?: string;
  content_id?: string;
  content_name?: string;
  value?: number;
  currency?: string;
} = {}): void {
  trackTikTokPixelEvent('ViewContent', {
    content_type: data.content_type || 'profile',
    content_id: data.content_id,
    content_name: data.content_name || 'Profile View',
    value: data.value || 0,
    currency: data.currency || 'USD',
  });
}

/**
 * Track search (Search event)
 */
export function trackTikTokSearch(data: {
  search_string?: string;
  content_type?: string;
} = {}): void {
  trackTikTokPixelEvent('Search', {
    query: data.search_string || '',
    content_type: data.content_type || 'user_search',
  });
}

/**
 * Track add to cart (AddToCart event - for subscription plans)
 */
export function trackTikTokAddToCart(data: {
  content_type: string;
  content_id?: string;
  content_name: string;
  value: number;
  currency: string;
  quantity?: number;
}): void {
  trackTikTokPixelEvent('AddToCart', {
    content_type: data.content_type,
    content_id: data.content_id,
    content_name: data.content_name,
    value: data.value,
    currency: data.currency,
    quantity: data.quantity || 1,
  });
}

/**
 * Track subscription (Subscribe event)
 */
export function trackTikTokSubscribe(data: {
  value: number;
  currency: string;
  content_type?: string;
}): void {
  trackTikTokPixelEvent('Subscribe', {
    content_type: data.content_type || 'premium_subscription',
    value: data.value,
    currency: data.currency,
  });
}

/**
 * Track contact (Contact event - for customer support)
 */
export function trackTikTokContact(): void {
  trackTikTokPixelEvent('Contact', {});
}

/**
 * Track download (Download event - for app download)
 */
export function trackTikTokDownload(data: {
  content_type?: string;
  content_id?: string;
} = {}): void {
  trackTikTokPixelEvent('Download', {
    content_type: data.content_type || 'mobile_app',
    content_id: data.content_id,
  });
}

/**
 * Identify user (for advanced matching)
 */
export function identifyTikTokUser(data: {
  email?: string;
  phone?: string;
  external_id?: string;
}): void {
  if (typeof window === 'undefined' || !window.ttq) {
    return;
  }

  const userData: Record<string, any> = {};

  // Note: TikTok requires SHA-256 hashed values for PII
  // In production, hash these values before sending
  if (data.email) {
    userData.email = data.email; // Should be hashed
  }
  if (data.phone) {
    userData.phone_number = data.phone; // Should be hashed
  }
  if (data.external_id) {
    userData.external_id = data.external_id;
  }

  window.ttq.identify(userData);
}

/**
 * Get TikTok Pixel installation snippet
 */
export function getTikTokPixelSnippet(pixelId: string): string {
  return `
<!-- TikTok Pixel Code -->
<script>
!function (w, d, t) {
  w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};

  ttq.load('${pixelId}');
  ttq.page();
}(window, document, 'ttq');
</script>
<!-- End TikTok Pixel Code -->
  `.trim();
}

export default {
  initializeTikTokPixel,
  trackTikTokPixelEvent,
  trackTikTokPageView,
  trackTikTokRegistrationStarted,
  trackTikTokRegistrationCompleted,
  trackTikTokPurchase,
  trackTikTokViewContent,
  trackTikTokSearch,
  trackTikTokAddToCart,
  trackTikTokSubscribe,
  trackTikTokContact,
  trackTikTokDownload,
  identifyTikTokUser,
  getTikTokPixelSnippet,
};
