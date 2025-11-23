/**
 * Google Ads Conversion Tracking
 * Track conversions and remarketing for Google Ads campaigns
 * Uses gtag.js (same as GA4)
 */

declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
  }
}

interface GoogleAdsConfig {
  conversionId: string; // AW-XXXXXXXXX
  conversionLabels: {
    registration?: string;
    purchase?: string;
    signUp?: string;
    subscribe?: string;
    addToCart?: string;
    pageView?: string;
  };
}

/**
 * Initialize Google Ads tracking
 * Note: This assumes gtag.js is already loaded (via GA4 initialization)
 */
export function initializeGoogleAds(config: GoogleAdsConfig): void {
  if (typeof window === 'undefined') {
    console.warn('Google Ads: Window object not available (server-side)');
    return;
  }

  if (!window.gtag) {
    console.warn('Google Ads: gtag not initialized. Initialize GA4 first.');
    return;
  }

  // Configure Google Ads
  window.gtag('config', config.conversionId);

  console.log('Google Ads initialized:', config.conversionId);
}

/**
 * Track Google Ads conversion
 */
export function trackGoogleAdsConversion(data: {
  conversionId: string;
  conversionLabel: string;
  value?: number;
  currency?: string;
  transactionId?: string;
}): void {
  if (typeof window === 'undefined' || !window.gtag) {
    console.warn('Google Ads not initialized');
    return;
  }

  const sendTo = `${data.conversionId}/${data.conversionLabel}`;

  window.gtag('event', 'conversion', {
    send_to: sendTo,
    value: data.value,
    currency: data.currency,
    transaction_id: data.transactionId,
  });

  console.log('Google Ads conversion tracked:', sendTo);
}

/**
 * Track registration conversion
 */
export function trackGoogleAdsRegistration(data: {
  conversionId: string;
  conversionLabel: string;
}): void {
  trackGoogleAdsConversion({
    conversionId: data.conversionId,
    conversionLabel: data.conversionLabel,
    value: 0,
    currency: 'USD',
  });
}

/**
 * Track purchase conversion
 */
export function trackGoogleAdsPurchase(data: {
  conversionId: string;
  conversionLabel: string;
  value: number;
  currency: string;
  transactionId: string;
}): void {
  trackGoogleAdsConversion(data);
}

/**
 * Track sign up conversion (lead)
 */
export function trackGoogleAdsSignUp(data: {
  conversionId: string;
  conversionLabel: string;
}): void {
  trackGoogleAdsConversion({
    conversionId: data.conversionId,
    conversionLabel: data.conversionLabel,
    value: 0,
    currency: 'USD',
  });
}

/**
 * Track subscription conversion
 */
export function trackGoogleAdsSubscribe(data: {
  conversionId: string;
  conversionLabel: string;
  value: number;
  currency: string;
  transactionId?: string;
}): void {
  trackGoogleAdsConversion(data);
}

/**
 * Track page view remarketing
 */
export function trackGoogleAdsPageView(data: {
  conversionId: string;
  conversionLabel?: string;
}): void {
  if (typeof window === 'undefined' || !window.gtag) {
    return;
  }

  if (data.conversionLabel) {
    const sendTo = `${data.conversionId}/${data.conversionLabel}`;
    window.gtag('event', 'page_view', {
      send_to: sendTo,
    });
  } else {
    window.gtag('event', 'page_view', {
      send_to: data.conversionId,
    });
  }
}

/**
 * Set enhanced conversion data (user data for better matching)
 */
export function setGoogleAdsEnhancedConversion(data: {
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
    enhancedConversionData.address = {
      first_name: data.address.firstName,
      last_name: data.address.lastName,
      street: data.address.street,
      city: data.address.city,
      region: data.address.region,
      postal_code: data.address.postalCode,
      country: data.address.country,
    };
  }

  window.gtag('set', 'user_data', enhancedConversionData);
  console.log('Google Ads enhanced conversion data set');
}

/**
 * Track dynamic remarketing event
 */
export function trackGoogleAdsDynamicRemarketing(data: {
  conversionId: string;
  value: number;
  items: Array<{
    id: string;
    googleBusinessVertical?: string;
  }>;
}): void {
  if (typeof window === 'undefined' || !window.gtag) {
    return;
  }

  window.gtag('event', 'view_item', {
    send_to: data.conversionId,
    value: data.value,
    items: data.items,
  });
}

/**
 * Track custom conversion event
 */
export function trackGoogleAdsCustomEvent(data: {
  conversionId: string;
  conversionLabel: string;
  eventName: string;
  value?: number;
  currency?: string;
  parameters?: Record<string, any>;
}): void {
  if (typeof window === 'undefined' || !window.gtag) {
    return;
  }

  const sendTo = `${data.conversionId}/${data.conversionLabel}`;

  window.gtag('event', data.eventName, {
    send_to: sendTo,
    value: data.value,
    currency: data.currency,
    ...data.parameters,
  });

  console.log('Google Ads custom event tracked:', data.eventName);
}

/**
 * Track remarketing tag (for audience building)
 */
export function trackGoogleAdsRemarketingTag(data: {
  conversionId: string;
  conversionLabel?: string;
  customParameters?: Record<string, any>;
}): void {
  if (typeof window === 'undefined' || !window.gtag) {
    return;
  }

  const params: any = {
    send_to: data.conversionId,
  };

  if (data.conversionLabel) {
    params.send_to = `${data.conversionId}/${data.conversionLabel}`;
  }

  if (data.customParameters) {
    Object.assign(params, data.customParameters);
  }

  window.gtag('event', 'page_view', params);
}

/**
 * Get Google Ads conversion tracking snippet
 */
export function getGoogleAdsSnippet(data: {
  conversionId: string;
  conversionLabel: string;
}): string {
  const sendTo = `${data.conversionId}/${data.conversionLabel}`;

  return `
<!-- Google Ads Conversion Tracking -->
<script>
  gtag('event', 'conversion', {
    'send_to': '${sendTo}'
  });
</script>
  `.trim();
}

/**
 * Track call conversion (for phone call tracking)
 */
export function trackGoogleAdsCallConversion(data: {
  conversionId: string;
  conversionLabel: string;
  phoneNumber?: string;
}): void {
  if (typeof window === 'undefined' || !window.gtag) {
    return;
  }

  const sendTo = `${data.conversionId}/${data.conversionLabel}`;

  window.gtag('event', 'conversion', {
    send_to: sendTo,
    phone_number: data.phoneNumber,
  });

  console.log('Google Ads call conversion tracked');
}

/**
 * Track add to cart for remarketing
 */
export function trackGoogleAdsAddToCart(data: {
  conversionId: string;
  value: number;
  currency: string;
  items: Array<{
    id: string;
    name: string;
    category?: string;
    price: number;
    quantity: number;
  }>;
}): void {
  if (typeof window === 'undefined' || !window.gtag) {
    return;
  }

  window.gtag('event', 'add_to_cart', {
    send_to: data.conversionId,
    value: data.value,
    currency: data.currency,
    items: data.items,
  });
}

/**
 * Track begin checkout for remarketing
 */
export function trackGoogleAdsBeginCheckout(data: {
  conversionId: string;
  value: number;
  currency: string;
  items: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
  }>;
}): void {
  if (typeof window === 'undefined' || !window.gtag) {
    return;
  }

  window.gtag('event', 'begin_checkout', {
    send_to: data.conversionId,
    value: data.value,
    currency: data.currency,
    items: data.items,
  });
}

/**
 * Track purchase for remarketing (in addition to conversion)
 */
export function trackGoogleAdsPurchaseRemarketing(data: {
  conversionId: string;
  transactionId: string;
  value: number;
  currency: string;
  items: Array<{
    id: string;
    name: string;
    category?: string;
    price: number;
    quantity: number;
  }>;
}): void {
  if (typeof window === 'undefined' || !window.gtag) {
    return;
  }

  window.gtag('event', 'purchase', {
    send_to: data.conversionId,
    transaction_id: data.transactionId,
    value: data.value,
    currency: data.currency,
    items: data.items,
  });
}

/**
 * Disable Google Ads conversion tracking
 */
export function disableGoogleAdsTracking(conversionId: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  // Set window property to disable Google Ads
  (window as any)[`google_conversion_${conversionId}`] = null;
  console.log('Google Ads tracking disabled');
}

export default {
  initializeGoogleAds,
  trackGoogleAdsConversion,
  trackGoogleAdsRegistration,
  trackGoogleAdsPurchase,
  trackGoogleAdsSignUp,
  trackGoogleAdsSubscribe,
  trackGoogleAdsPageView,
  setGoogleAdsEnhancedConversion,
  trackGoogleAdsDynamicRemarketing,
  trackGoogleAdsCustomEvent,
  trackGoogleAdsRemarketingTag,
  getGoogleAdsSnippet,
  trackGoogleAdsCallConversion,
  trackGoogleAdsAddToCart,
  trackGoogleAdsBeginCheckout,
  trackGoogleAdsPurchaseRemarketing,
  disableGoogleAdsTracking,
};
