/**
 * SEO & Marketing Analytics Service
 * Unified client-side tracking for all marketing pixels and SEO analytics
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

interface PixelConfig {
  gaId?: string;
  gtmId?: string;
  metaPixelId?: string;
  tiktokPixelId?: string;
  linkedinPartnerId?: string;
  snapchatPixelId?: string;
  twitterPixelId?: string;
  pinterestTagId?: string;
  redditPixelId?: string;
  clarityId?: string;
  googleAdsId?: string;
}

const config: PixelConfig = {
  gaId: import.meta.env.VITE_GA_MEASUREMENT_ID,
  gtmId: import.meta.env.VITE_GTM_ID,
  metaPixelId: import.meta.env.VITE_META_PIXEL_ID,
  tiktokPixelId: import.meta.env.VITE_TIKTOK_PIXEL_ID,
  linkedinPartnerId: import.meta.env.VITE_LINKEDIN_PARTNER_ID,
  snapchatPixelId: import.meta.env.VITE_SNAPCHAT_PIXEL_ID,
  twitterPixelId: import.meta.env.VITE_TWITTER_PIXEL_ID,
  pinterestTagId: import.meta.env.VITE_PINTEREST_TAG_ID,
  redditPixelId: import.meta.env.VITE_REDDIT_PIXEL_ID,
  clarityId: import.meta.env.VITE_MICROSOFT_CLARITY_ID,
  googleAdsId: import.meta.env.VITE_GOOGLE_ADS_ID,
};

// ============================================================================
// GLOBAL TYPE DECLARATIONS
// ============================================================================

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
    fbq?: (...args: unknown[]) => void;
    ttq?: {
      track: (event: string, params?: Record<string, unknown>) => void;
      page: () => void;
      identify: (params: Record<string, unknown>) => void;
    };
    lintrk?: (action: string, params: Record<string, unknown>) => void;
    snaptr?: (action: string, event: string, params?: Record<string, unknown>) => void;
    twq?: (action: string, event: string, params?: Record<string, unknown>) => void;
    pintrk?: (action: string, event: string, params?: Record<string, unknown>) => void;
    rdt?: (action: string, event: string, params?: Record<string, unknown>) => void;
    clarity?: (action: string, ...args: unknown[]) => void;
  }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

let isInitialized = false;

/**
 * Initialize all marketing pixels
 */
export function initializeAnalytics(): void {
  if (isInitialized) return;

  // Initialize Google Analytics / GTM
  if (config.gaId || config.gtmId) {
    initGoogleAnalytics();
  }

  // Initialize Meta Pixel
  if (config.metaPixelId) {
    initMetaPixel();
  }

  // Initialize TikTok Pixel
  if (config.tiktokPixelId) {
    initTikTokPixel();
  }

  // Initialize LinkedIn Insight Tag
  if (config.linkedinPartnerId) {
    initLinkedInTag();
  }

  // Initialize Snapchat Pixel
  if (config.snapchatPixelId) {
    initSnapchatPixel();
  }

  // Initialize Twitter Pixel
  if (config.twitterPixelId) {
    initTwitterPixel();
  }

  // Initialize Pinterest Tag
  if (config.pinterestTagId) {
    initPinterestTag();
  }

  // Initialize Reddit Pixel
  if (config.redditPixelId) {
    initRedditPixel();
  }

  // Initialize Microsoft Clarity
  if (config.clarityId) {
    initClarity();
  }

  isInitialized = true;
}

// ============================================================================
// PIXEL INITIALIZATION FUNCTIONS
// ============================================================================

function initGoogleAnalytics(): void {
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer!.push(arguments);
  };
  window.gtag('js', new Date());

  if (config.gaId) {
    window.gtag('config', config.gaId, {
      send_page_view: false, // We'll send page views manually
    });
  }

  // Load gtag script
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${config.gaId || config.gtmId}`;
  document.head.appendChild(script);
}

function initMetaPixel(): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fbq: any = function () {
    if (fbq.callMethod) {
      fbq.callMethod.apply(fbq, arguments);
    } else {
      fbq.queue.push(arguments);
    }
  };
  fbq.queue = [];
  window.fbq = fbq;

  window.fbq!('init', config.metaPixelId);
  window.fbq!('track', 'PageView');

  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://connect.facebook.net/en_US/fbevents.js';
  document.head.appendChild(script);
}

function initTikTokPixel(): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ttq: any = (window as any).ttq || {};
  ttq.track = ttq.track || function () {};
  ttq.page = ttq.page || function () {};
  ttq.identify = ttq.identify || function () {};
  (window as any).ttq = ttq;

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://analytics.tiktok.com/i18n/pixel/events.js?sdkid=${config.tiktokPixelId}&lib=ttq`;
  document.head.appendChild(script);

  script.onload = () => {
    (window as any).ttq?.page();
  };
}

function initLinkedInTag(): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const win = window as any;
  win._linkedin_partner_id = config.linkedinPartnerId;
  win._linkedin_data_partner_ids = win._linkedin_data_partner_ids || [];
  win._linkedin_data_partner_ids.push(config.linkedinPartnerId);

  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://snap.licdn.com/li.lms-analytics/insight.min.js';
  document.head.appendChild(script);
}

function initSnapchatPixel(): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const snaptr: any = function () {
    if (snaptr.handleRequest) {
      snaptr.handleRequest.apply(snaptr, arguments);
    } else {
      snaptr.callQueue.push(arguments);
    }
  };
  snaptr.callQueue = [];
  (window as any).snaptr = snaptr;

  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://sc-static.net/scevent.min.js';
  document.head.appendChild(script);

  script.onload = () => {
    (window as any).snaptr?.('init', config.snapchatPixelId);
    (window as any).snaptr?.('track', 'PAGE_VIEW');
  };
}

function initTwitterPixel(): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const twq: any = function () {
    if (twq.exe) {
      twq.exe.apply(twq, arguments);
    } else {
      twq.queue.push(arguments);
    }
  };
  twq.queue = [];
  twq.version = '1.1';
  (window as any).twq = twq;

  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://static.ads-twitter.com/uwt.js';
  document.head.appendChild(script);

  script.onload = () => {
    (window as any).twq?.('config', config.twitterPixelId);
  };
}

function initPinterestTag(): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pintrk: any = function () {
    pintrk.queue.push(Array.prototype.slice.call(arguments));
  };
  pintrk.queue = [];
  pintrk.version = '3.0';
  (window as any).pintrk = pintrk;

  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://s.pinimg.com/ct/core.js';
  document.head.appendChild(script);

  script.onload = () => {
    (window as any).pintrk?.('load', config.pinterestTagId);
    (window as any).pintrk?.('page');
  };
}

function initRedditPixel(): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rdt: any = function () {
    if (rdt.sendEvent) {
      rdt.sendEvent.apply(rdt, arguments);
    } else {
      rdt.callQueue.push(arguments);
    }
  };
  rdt.callQueue = [];
  (window as any).rdt = rdt;

  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://www.redditstatic.com/ads/pixel.js';
  document.head.appendChild(script);

  script.onload = () => {
    (window as any).rdt?.('init', config.redditPixelId);
    (window as any).rdt?.('track', 'PageVisit');
  };
}

function initClarity(): void {
  const script = document.createElement('script');
  script.type = 'text/javascript';
  script.innerHTML = `
    (function(c,l,a,r,i,t,y){
      c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
      t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
      y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
    })(window, document, "clarity", "script", "${config.clarityId}");
  `;
  document.head.appendChild(script);
}

// ============================================================================
// TRACKING FUNCTIONS
// ============================================================================

/**
 * Track page view across all pixels
 */
export function trackPageView(path: string, title?: string): void {
  // Google Analytics
  if (window.gtag) {
    window.gtag('event', 'page_view', {
      page_path: path,
      page_title: title,
    });
  }

  // Meta Pixel
  if (window.fbq) {
    window.fbq('track', 'PageView');
  }

  // TikTok
  if (window.ttq) {
    window.ttq.page();
  }

  // Snapchat
  if (window.snaptr) {
    window.snaptr('track', 'PAGE_VIEW');
  }

  // Pinterest
  if (window.pintrk) {
    window.pintrk('track', 'pagevisit');
  }

  // Reddit
  if (window.rdt) {
    window.rdt('track', 'PageVisit');
  }
}

/**
 * Track user registration
 */
export function trackRegistration(method?: string): void {
  // Google Analytics
  if (window.gtag) {
    window.gtag('event', 'sign_up', { method });
  }

  // Meta Pixel
  if (window.fbq) {
    window.fbq('track', 'CompleteRegistration', { content_name: method });
  }

  // TikTok
  if (window.ttq) {
    window.ttq.track('CompleteRegistration');
  }

  // Snapchat
  if (window.snaptr) {
    window.snaptr('track', 'SIGN_UP', { sign_up_method: method });
  }

  // Twitter
  if (window.twq) {
    window.twq('event', 'tw-signup', {});
  }

  // Pinterest
  if (window.pintrk) {
    window.pintrk('track', 'signup');
  }

  // Reddit
  if (window.rdt) {
    window.rdt('track', 'SignUp');
  }

  // LinkedIn conversion
  if (window.lintrk) {
    window.lintrk('track', { conversion_id: 'signup' });
  }
}

/**
 * Track subscription/purchase
 */
export function trackPurchase(
  value: number,
  currency: string,
  planName: string,
  transactionId?: string
): void {
  // Google Analytics
  if (window.gtag) {
    window.gtag('event', 'purchase', {
      transaction_id: transactionId,
      value,
      currency,
      items: [{ item_name: planName, price: value }],
    });

    // Google Ads conversion
    if (config.googleAdsId) {
      window.gtag('event', 'conversion', {
        send_to: `${config.googleAdsId}/${import.meta.env.VITE_GOOGLE_ADS_CONVERSION_LABEL}`,
        value,
        currency,
        transaction_id: transactionId,
      });
    }
  }

  // Meta Pixel
  if (window.fbq) {
    window.fbq('track', 'Purchase', {
      value,
      currency,
      content_name: planName,
    });
  }

  // TikTok
  if (window.ttq) {
    window.ttq.track('CompletePayment', { value, currency, description: planName });
  }

  // Snapchat
  if (window.snaptr) {
    window.snaptr('track', 'PURCHASE', {
      price: value,
      currency,
      transaction_id: transactionId,
    });
  }

  // Twitter
  if (window.twq) {
    window.twq('event', 'tw-purchase', { value, currency });
  }

  // Pinterest
  if (window.pintrk) {
    window.pintrk('track', 'checkout', { value, currency });
  }

  // Reddit
  if (window.rdt) {
    window.rdt('track', 'Purchase', { value, currency });
  }

  // LinkedIn conversion
  if (window.lintrk) {
    window.lintrk('track', { conversion_id: 'purchase', value, currency });
  }
}

/**
 * Track subscription started
 */
export function trackSubscriptionStart(planName: string, value: number, currency: string): void {
  // Google Analytics
  if (window.gtag) {
    window.gtag('event', 'subscribe', {
      value,
      currency,
      items: [{ item_name: planName }],
    });
  }

  // Meta Pixel
  if (window.fbq) {
    window.fbq('track', 'Subscribe', { value, currency, predicted_ltv: value * 12 });
  }

  // TikTok
  if (window.ttq) {
    window.ttq.track('Subscribe', { value, currency, description: planName });
  }

  // Snapchat
  if (window.snaptr) {
    window.snaptr('track', 'SUBSCRIBE', { price: value, currency });
  }

  // Twitter
  if (window.twq) {
    window.twq('event', 'tw-subscribe', { value, currency });
  }
}

/**
 * Track lead/contact
 */
export function trackLead(leadType?: string): void {
  // Google Analytics
  if (window.gtag) {
    window.gtag('event', 'generate_lead', { lead_type: leadType });
  }

  // Meta Pixel
  if (window.fbq) {
    window.fbq('track', 'Lead', { content_category: leadType });
  }

  // TikTok
  if (window.ttq) {
    window.ttq.track('Contact');
  }

  // Twitter
  if (window.twq) {
    window.twq('event', 'tw-lead', {});
  }

  // Pinterest
  if (window.pintrk) {
    window.pintrk('track', 'lead', { lead_type: leadType });
  }

  // Reddit
  if (window.rdt) {
    window.rdt('track', 'Lead');
  }
}

/**
 * Track search event
 */
export function trackSearch(query: string): void {
  // Google Analytics
  if (window.gtag) {
    window.gtag('event', 'search', { search_term: query });
  }

  // Meta Pixel
  if (window.fbq) {
    window.fbq('track', 'Search', { search_string: query });
  }

  // TikTok
  if (window.ttq) {
    window.ttq.track('Search', { query });
  }

  // Snapchat
  if (window.snaptr) {
    window.snaptr('track', 'SEARCH', { search_string: query });
  }

  // Twitter
  if (window.twq) {
    window.twq('event', 'tw-search', { search_string: query });
  }

  // Pinterest
  if (window.pintrk) {
    window.pintrk('track', 'search', { search_query: query });
  }

  // Reddit
  if (window.rdt) {
    window.rdt('track', 'Search');
  }
}

/**
 * Track app download click
 */
export function trackAppDownload(platform: 'ios' | 'android'): void {
  // Google Analytics
  if (window.gtag) {
    window.gtag('event', 'app_download', { platform });
  }

  // Meta Pixel
  if (window.fbq) {
    window.fbq('track', 'Lead', { content_category: `app_download_${platform}` });
  }

  // TikTok
  if (window.ttq) {
    window.ttq.track('Download');
  }

  // Twitter
  if (window.twq) {
    window.twq('event', 'tw-download', { content_type: platform });
  }
}

/**
 * Track profile completion
 */
export function trackProfileCompletion(completionPercent: number): void {
  // Google Analytics
  if (window.gtag) {
    window.gtag('event', 'profile_completion', { completion_percent: completionPercent });
  }

  // Custom event for retargeting
  if (completionPercent >= 80 && window.fbq) {
    window.fbq('trackCustom', 'ProfileComplete');
  }
}

/**
 * Track first match
 */
export function trackFirstMatch(): void {
  // Google Analytics
  if (window.gtag) {
    window.gtag('event', 'first_match');
  }

  // Meta Pixel - custom event for retargeting high-intent users
  if (window.fbq) {
    window.fbq('trackCustom', 'FirstMatch');
  }
}

/**
 * Track custom event
 */
export function trackCustomEvent(eventName: string, params?: Record<string, unknown>): void {
  // Google Analytics
  if (window.gtag) {
    window.gtag('event', eventName, params);
  }

  // Meta Pixel
  if (window.fbq) {
    window.fbq('trackCustom', eventName, params);
  }

  // TikTok
  if (window.ttq) {
    window.ttq.track(eventName, params);
  }
}

/**
 * Identify user across pixels
 */
export function identifyUser(
  userId: string,
  traits?: {
    email?: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
    gender?: string;
    dateOfBirth?: string;
    city?: string;
    country?: string;
  }
): void {
  // Google Analytics
  if (window.gtag) {
    window.gtag('set', 'user_properties', {
      user_id: userId,
      ...traits,
    });
  }

  // TikTok
  if (window.ttq && traits?.email) {
    window.ttq.identify({
      email: traits.email,
      phone_number: traits.phone,
    });
  }

  // Microsoft Clarity
  if (window.clarity) {
    window.clarity('identify', userId);
    if (traits) {
      Object.entries(traits).forEach(([key, value]) => {
        if (value) window.clarity?.('set', key, String(value));
      });
    }
  }
}

/**
 * Set consent preferences
 */
export function setConsent(options: {
  analytics?: boolean;
  marketing?: boolean;
  personalization?: boolean;
}): void {
  // Google Analytics consent mode
  if (window.gtag) {
    window.gtag('consent', 'update', {
      analytics_storage: options.analytics ? 'granted' : 'denied',
      ad_storage: options.marketing ? 'granted' : 'denied',
      ad_personalization: options.personalization ? 'granted' : 'denied',
      ad_user_data: options.marketing ? 'granted' : 'denied',
    });
  }

  // Microsoft Clarity consent
  if (window.clarity) {
    window.clarity('consent', options.analytics ?? false);
  }
}

// ============================================================================
// SEO UTILITIES
// ============================================================================

/**
 * Update page meta tags dynamically
 */
export function updateMetaTags(config: {
  title: string;
  description: string;
  image?: string;
  url?: string;
  type?: string;
}): void {
  // Update title
  document.title = config.title;

  // Helper function
  const setMeta = (name: string, content: string, isProperty = false) => {
    const attr = isProperty ? 'property' : 'name';
    let tag = document.querySelector(`meta[${attr}="${name}"]`);
    if (!tag) {
      tag = document.createElement('meta');
      tag.setAttribute(attr, name);
      document.head.appendChild(tag);
    }
    tag.setAttribute('content', content);
  };

  // Basic meta
  setMeta('description', config.description);

  // Open Graph
  setMeta('og:title', config.title, true);
  setMeta('og:description', config.description, true);
  if (config.image) setMeta('og:image', config.image, true);
  if (config.url) setMeta('og:url', config.url, true);
  if (config.type) setMeta('og:type', config.type, true);

  // Twitter
  setMeta('twitter:title', config.title);
  setMeta('twitter:description', config.description);
  if (config.image) setMeta('twitter:image', config.image);
}

/**
 * Track Core Web Vitals
 */
export async function trackWebVitals(): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    // Dynamic import with fallback - web-vitals is optional
    // @ts-expect-error - web-vitals may not be installed
    const webVitals = await import('web-vitals').catch(() => null);
    if (!webVitals) {
      console.warn('web-vitals not available, skipping Core Web Vitals tracking');
      return;
    }
    const { onCLS, onFID, onLCP, onFCP, onTTFB, onINP } = webVitals;

    const sendVital = (metric: { name: string; value: number; rating: string }) => {
      // Send to Google Analytics
      if (window.gtag) {
        window.gtag('event', metric.name, {
          event_category: 'Web Vitals',
          value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
          event_label: metric.rating,
          non_interaction: true,
        });
      }

      // Send to custom endpoint for detailed analysis
      if (navigator.sendBeacon) {
        navigator.sendBeacon(
          '/api/seo/vitals',
          JSON.stringify({
            name: metric.name,
            value: metric.value,
            rating: metric.rating,
            url: window.location.href,
            timestamp: Date.now(),
          })
        );
      }
    };

    onCLS(sendVital);
    onFID(sendVital);
    onLCP(sendVital);
    onFCP(sendVital);
    onTTFB(sendVital);
    onINP(sendVital);
  } catch {
    console.warn('Web Vitals library not available');
  }
}

// Export singleton
export const seoAnalytics = {
  initialize: initializeAnalytics,
  trackPageView,
  trackRegistration,
  trackPurchase,
  trackSubscriptionStart,
  trackLead,
  trackSearch,
  trackAppDownload,
  trackProfileCompletion,
  trackFirstMatch,
  trackCustomEvent,
  identifyUser,
  setConsent,
  updateMetaTags,
  trackWebVitals,
};

export default seoAnalytics;
