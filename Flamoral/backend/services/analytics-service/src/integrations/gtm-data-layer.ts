/**
 * Google Tag Manager (GTM) Data Layer Integration
 * Client-side tracking helper for pushing events to GTM
 */

// Extend Window interface for dataLayer
declare global {
  interface Window {
    dataLayer: any[];
  }
}

/**
 * Initialize GTM data layer
 */
export function initializeDataLayer(): void {
  if (typeof window === 'undefined') {
    console.warn('GTM: Window object not available (server-side)');
    return;
  }

  window.dataLayer = window.dataLayer || [];
  console.log('GTM Data Layer initialized');
}

/**
 * Push event to GTM data layer
 */
export function pushToDataLayer(event: string, data: Record<string, any> = {}): void {
  if (typeof window === 'undefined') {
    console.warn('GTM: Window object not available');
    return;
  }

  if (!window.dataLayer) {
    initializeDataLayer();
  }

  const eventData = {
    event,
    timestamp: new Date().toISOString(),
    ...data,
  };

  window.dataLayer.push(eventData);
  console.log('GTM Event pushed:', event, eventData);
}

/**
 * Track page view
 */
export function trackPageView(pageUrl: string, pageTitle?: string): void {
  pushToDataLayer('page_view', {
    page_url: pageUrl,
    page_title: pageTitle || document.title,
    page_location: window.location.href,
    page_path: window.location.pathname,
  });
}

/**
 * Track registration started
 */
export function trackRegistrationStarted(data: {
  method?: string; // email, phone, social
  source?: string;
  campaign?: string;
}): void {
  pushToDataLayer('registration_started', {
    registration_method: data.method || 'email',
    utm_source: data.source,
    utm_campaign: data.campaign,
  });
}

/**
 * Track registration completed
 */
export function trackRegistrationCompleted(data: {
  userId: string;
  method: string;
  timeSpent?: number;
  source?: string;
  campaign?: string;
}): void {
  pushToDataLayer('registration_completed', {
    user_id: data.userId,
    registration_method: data.method,
    time_spent: data.timeSpent,
    utm_source: data.source,
    utm_campaign: data.campaign,
    value: 0,
    currency: 'USD',
  });
}

/**
 * Track email verification
 */
export function trackEmailVerified(userId: string): void {
  pushToDataLayer('email_verified', {
    user_id: userId,
  });
}

/**
 * Track profile started
 */
export function trackProfileStarted(userId: string): void {
  pushToDataLayer('profile_started', {
    user_id: userId,
  });
}

/**
 * Track profile completed
 */
export function trackProfileCompleted(data: {
  userId: string;
  completeness: number;
  hasPhoto: boolean;
  timeSpent?: number;
}): void {
  pushToDataLayer('profile_completed', {
    user_id: data.userId,
    profile_completeness: data.completeness,
    has_photo: data.hasPhoto,
    time_spent: data.timeSpent,
  });
}

/**
 * Track photo uploaded
 */
export function trackPhotoUploaded(data: {
  userId: string;
  photoCount: number;
}): void {
  pushToDataLayer('photo_uploaded', {
    user_id: data.userId,
    photo_count: data.photoCount,
  });
}

/**
 * Track first match
 */
export function trackFirstMatch(data: {
  userId: string;
  matchId: string;
  timeSinceRegistration?: number;
}): void {
  pushToDataLayer('first_match', {
    user_id: data.userId,
    match_id: data.matchId,
    time_since_registration: data.timeSinceRegistration,
  });
}

/**
 * Track subscription purchase
 */
export function trackSubscriptionPurchased(data: {
  userId: string;
  plan: string;
  amount: number;
  currency: string;
  timeSinceRegistration?: number;
}): void {
  pushToDataLayer('subscription_purchased', {
    user_id: data.userId,
    subscription_plan: data.plan,
    value: data.amount,
    currency: data.currency,
    time_since_registration: data.timeSinceRegistration,
    transaction_id: `sub_${Date.now()}`,
  });
}

/**
 * Track custom event
 */
export function trackCustomEvent(eventName: string, data: Record<string, any> = {}): void {
  pushToDataLayer(eventName, data);
}

/**
 * Get UTM parameters from URL
 */
export function getUtmParameters(): {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
} {
  if (typeof window === 'undefined') {
    return {};
  }

  const params = new URLSearchParams(window.location.search);

  return {
    utm_source: params.get('utm_source') || undefined,
    utm_medium: params.get('utm_medium') || undefined,
    utm_campaign: params.get('utm_campaign') || undefined,
    utm_content: params.get('utm_content') || undefined,
    utm_term: params.get('utm_term') || undefined,
  };
}

/**
 * Get click IDs from URL (fbclid, gclid, etc.)
 */
export function getClickIds(): {
  fbclid?: string;
  gclid?: string;
  ttclid?: string;
  snapchat_click_id?: string;
  reddit_click_id?: string;
} {
  if (typeof window === 'undefined') {
    return {};
  }

  const params = new URLSearchParams(window.location.search);

  return {
    fbclid: params.get('fbclid') || undefined,
    gclid: params.get('gclid') || undefined,
    ttclid: params.get('ttclid') || undefined,
    snapchat_click_id: params.get('ScCid') || undefined,
    reddit_click_id: params.get('rdt_cid') || undefined,
  };
}

/**
 * Store UTM parameters in session storage
 */
export function storeUtmParameters(): void {
  if (typeof window === 'undefined' || !window.sessionStorage) {
    return;
  }

  const utmParams = getUtmParameters();
  const clickIds = getClickIds();

  if (Object.keys(utmParams).length > 0) {
    sessionStorage.setItem('utm_params', JSON.stringify(utmParams));
  }

  if (Object.keys(clickIds).length > 0) {
    sessionStorage.setItem('click_ids', JSON.stringify(clickIds));
  }
}

/**
 * Get stored UTM parameters from session storage
 */
export function getStoredUtmParameters(): {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
} {
  if (typeof window === 'undefined' || !window.sessionStorage) {
    return {};
  }

  const stored = sessionStorage.getItem('utm_params');
  return stored ? JSON.parse(stored) : {};
}

/**
 * Get stored click IDs from session storage
 */
export function getStoredClickIds(): Record<string, string> {
  if (typeof window === 'undefined' || !window.sessionStorage) {
    return {};
  }

  const stored = sessionStorage.getItem('click_ids');
  return stored ? JSON.parse(stored) : {};
}

/**
 * Initialize GTM tracking on page load
 */
export function initializeGTMTracking(): void {
  if (typeof window === 'undefined') {
    return;
  }

  // Initialize data layer
  initializeDataLayer();

  // Store UTM parameters and click IDs
  storeUtmParameters();

  // Track initial page view
  trackPageView(window.location.pathname, document.title);

  console.log('GTM Tracking initialized');
}

// Export all tracking functions
export default {
  initializeDataLayer,
  initializeGTMTracking,
  pushToDataLayer,
  trackPageView,
  trackRegistrationStarted,
  trackRegistrationCompleted,
  trackEmailVerified,
  trackProfileStarted,
  trackProfileCompleted,
  trackPhotoUploaded,
  trackFirstMatch,
  trackSubscriptionPurchased,
  trackCustomEvent,
  getUtmParameters,
  getClickIds,
  storeUtmParameters,
  getStoredUtmParameters,
  getStoredClickIds,
};
