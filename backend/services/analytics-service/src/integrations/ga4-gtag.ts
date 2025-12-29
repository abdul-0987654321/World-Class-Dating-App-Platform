/**
 * Google Analytics 4 Client-Side Integration (gtag.js)
 * Client-side tracking using gtag.js
 */

import { createLogger } from '@flamoral/backend-shared';

const logger = createLogger('ga4-gtag');

declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

/**
 * Initialize Google Analytics 4
 */
export function initializeGA4(measurementId: string): void {
  if (typeof window === 'undefined') {
    logger.warn('GA4: Window object not available (server-side)');
    return;
  }

  // Check if gtag already initialized
  if (window.gtag) {
    logger.info('GA4 already initialized');
    return;
  }

  // Initialize dataLayer
  window.dataLayer = window.dataLayer || [];

  // Define gtag function
  function gtag(...args: any[]) {
    window.dataLayer.push(arguments);
  }

  window.gtag = gtag;

  // Configure gtag
  gtag('js', new Date());
  gtag('config', measurementId, {
    send_page_view: true,
    cookie_flags: 'SameSite=None;Secure',
  });

  // Load gtag.js script
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);

  logger.info('GA4 initialized:', measurementId);
}

/**
 * Track GA4 event
 */
export function trackGA4Event(
  eventName: string,
  eventParams: Record<string, any> = {}
): void {
  if (typeof window === 'undefined' || !window.gtag) {
    logger.warn('GA4 not initialized');
    return;
  }

  window.gtag('event', eventName, eventParams);
  logger.info('GA4 event tracked:', eventName, eventParams);
}

/**
 * Track page view
 */
export function trackGA4PageView(data: {
  pageLocation?: string;
  pageTitle?: string;
}): void {
  trackGA4Event('page_view', {
    page_location: data.pageLocation || window.location.href,
    page_title: data.pageTitle || document.title,
  });
}

/**
 * Track sign up (registration)
 */
export function trackGA4SignUp(data: { method: string }): void {
  trackGA4Event('sign_up', {
    method: data.method,
  });
}

/**
 * Track login
 */
export function trackGA4Login(data: { method: string }): void {
  trackGA4Event('login', {
    method: data.method,
  });
}

/**
 * Track purchase (subscription)
 */
export function trackGA4Purchase(data: {
  transactionId: string;
  value: number;
  currency: string;
  items: Array<{
    item_id: string;
    item_name: string;
    item_category?: string;
    price: number;
    quantity?: number;
  }>;
  coupon?: string;
}): void {
  trackGA4Event('purchase', {
    transaction_id: data.transactionId,
    value: data.value,
    currency: data.currency,
    coupon: data.coupon,
    items: data.items,
  });
}

/**
 * Track begin checkout (subscription flow)
 */
export function trackGA4BeginCheckout(data: {
  value: number;
  currency: string;
  items: Array<{
    item_id: string;
    item_name: string;
    price: number;
  }>;
}): void {
  trackGA4Event('begin_checkout', {
    value: data.value,
    currency: data.currency,
    items: data.items,
  });
}

/**
 * Track view item (profile view)
 */
export function trackGA4ViewItem(data: {
  items: Array<{
    item_id: string;
    item_name: string;
    item_category?: string;
  }>;
}): void {
  trackGA4Event('view_item', {
    items: data.items,
  });
}

/**
 * Track search
 */
export function trackGA4Search(data: { searchTerm: string }): void {
  trackGA4Event('search', {
    search_term: data.searchTerm,
  });
}

/**
 * Track add to wishlist (like/favorite)
 */
export function trackGA4AddToWishlist(data: {
  value?: number;
  currency?: string;
  items: Array<{
    item_id: string;
    item_name: string;
  }>;
}): void {
  trackGA4Event('add_to_wishlist', {
    value: data.value || 0,
    currency: data.currency || 'USD',
    items: data.items,
  });
}

/**
 * Track share (profile share)
 */
export function trackGA4Share(data: {
  method: string;
  content_type: string;
  item_id: string;
}): void {
  trackGA4Event('share', {
    method: data.method,
    content_type: data.content_type,
    item_id: data.item_id,
  });
}

/**
 * Set user ID
 */
export function setGA4UserId(userId: string): void {
  if (typeof window === 'undefined' || !window.gtag) {
    return;
  }

  window.gtag('set', 'user_id', userId);
  logger.info('GA4 user ID set:', userId);
}

/**
 * Set user properties
 */
export function setGA4UserProperties(properties: {
  [key: string]: string | number | boolean;
}): void {
  if (typeof window === 'undefined' || !window.gtag) {
    return;
  }

  window.gtag('set', 'user_properties', properties);
  logger.info('GA4 user properties set:', properties);
}

/**
 * Track conversion (for Google Ads)
 */
export function trackGA4Conversion(data: {
  sendTo: string; // AW-CONVERSION_ID/CONVERSION_LABEL
  value?: number;
  currency?: string;
  transactionId?: string;
}): void {
  if (typeof window === 'undefined' || !window.gtag) {
    return;
  }

  window.gtag('event', 'conversion', {
    send_to: data.sendTo,
    value: data.value,
    currency: data.currency,
    transaction_id: data.transactionId,
  });
}

/**
 * Track enhanced conversion (with user data)
 */
export function trackGA4EnhancedConversion(data: {
  email?: string;
  phoneNumber?: string;
  address?: {
    firstName?: string;
    lastName?: string;
    street?: string;
    city?: string;
    region?: string;
    postalCode?: string;
    country?: string;
  };
}): void {
  if (typeof window === 'undefined' || !window.gtag) {
    return;
  }

  const enhancedConversionData: any = {};

  if (data.email) {
    enhancedConversionData.email = data.email;
  }
  if (data.phoneNumber) {
    enhancedConversionData.phone_number = data.phoneNumber;
  }
  if (data.address) {
    enhancedConversionData.address = data.address;
  }

  window.gtag('set', 'user_data', enhancedConversionData);
  logger.info('GA4 enhanced conversion data set');
}

/**
 * Get GA4 client ID
 */
export function getGA4ClientId(measurementId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.gtag) {
      reject(new Error('GA4 not initialized'));
      return;
    }

    window.gtag('get', measurementId, 'client_id', (clientId: string) => {
      resolve(clientId);
    });
  });
}

/**
 * Get GA4 session ID
 */
export function getGA4SessionId(measurementId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.gtag) {
      reject(new Error('GA4 not initialized'));
      return;
    }

    window.gtag('get', measurementId, 'session_id', (sessionId: string) => {
      resolve(sessionId);
    });
  });
}

/**
 * Disable GA4 tracking (for privacy compliance)
 */
export function disableGA4Tracking(measurementId: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  // Set window property to disable GA
  (window as any)[`ga-disable-${measurementId}`] = true;
  logger.info('GA4 tracking disabled');
}

/**
 * Enable GA4 tracking
 */
export function enableGA4Tracking(measurementId: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  // Remove disable property
  delete (window as any)[`ga-disable-${measurementId}`];
  logger.info('GA4 tracking enabled');
}

/**
 * Get GA4 installation snippet
 */
export function getGA4Snippet(measurementId: string): string {
  return `
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${measurementId}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', '${measurementId}');
</script>
  `.trim();
}

export default {
  initializeGA4,
  trackGA4Event,
  trackGA4PageView,
  trackGA4SignUp,
  trackGA4Login,
  trackGA4Purchase,
  trackGA4BeginCheckout,
  trackGA4ViewItem,
  trackGA4Search,
  trackGA4AddToWishlist,
  trackGA4Share,
  setGA4UserId,
  setGA4UserProperties,
  trackGA4Conversion,
  trackGA4EnhancedConversion,
  getGA4ClientId,
  getGA4SessionId,
  disableGA4Tracking,
  enableGA4Tracking,
  getGA4Snippet,
};
