/**
 * Snapchat Pixel Integration
 * Client-side pixel tracking for Snapchat ads
 */

declare global {
  interface Window {
    snaptr: any;
  }
}

/**
 * Initialize Snapchat Pixel
 */
export function initializeSnapchatPixel(pixelId: string): void {
  if (typeof window === 'undefined') {
    console.warn('Snapchat Pixel: Window object not available (server-side)');
    return;
  }

  // Check if pixel already initialized
  if (window.snaptr) {
    console.log('Snapchat Pixel already initialized');
    return;
  }

  // Snapchat Pixel base code
  (function(e: any, t: any, n: any) {
    if (e.snaptr) return;
    const a = (e.snaptr = function() {
      a.handleRequest ? a.handleRequest.apply(a, arguments) : a.queue.push(arguments);
    });
    a.queue = [];
    const s = 'script';
    const r = t.createElement(s);
    r.async = !0;
    r.src = n;
    const u = t.getElementsByTagName(s)[0];
    u.parentNode!.insertBefore(r, u);
  })(window, document, 'https://sc-static.net/scevent.min.js');

  // Initialize pixel
  window.snaptr('init', pixelId, {
    user_email: '__INSERT_USER_EMAIL__',
  });

  // Track page view
  window.snaptr('track', 'PAGE_VIEW');

  console.log('Snapchat Pixel initialized:', pixelId);
}

/**
 * Track Snapchat Pixel event
 */
export function trackSnapchatPixelEvent(
  eventName: string,
  parameters: Record<string, any> = {}
): void {
  if (typeof window === 'undefined' || !window.snaptr) {
    console.warn('Snapchat Pixel not initialized');
    return;
  }

  window.snaptr('track', eventName, parameters);
  console.log('Snapchat Pixel event tracked:', eventName, parameters);
}

/**
 * Track page view
 */
export function trackSnapchatPageView(): void {
  trackSnapchatPixelEvent('PAGE_VIEW');
}

/**
 * Track sign up (registration)
 */
export function trackSnapchatSignUp(data: {
  signUpMethod?: string;
  userEmail?: string;
}): void {
  const params: any = {};

  if (data.signUpMethod) {
    params.sign_up_method = data.signUpMethod;
  }
  if (data.userEmail) {
    params.user_email = data.userEmail;
  }

  trackSnapchatPixelEvent('SIGN_UP', params);
}

/**
 * Track purchase (subscription)
 */
export function trackSnapchatPurchase(data: {
  transactionId: string;
  price: string;
  currency: string;
  itemIds?: string[];
  itemCategory?: string;
  numberOfItems?: number;
}): void {
  trackSnapchatPixelEvent('PURCHASE', {
    transaction_id: data.transactionId,
    price: data.price,
    currency: data.currency,
    item_ids: data.itemIds || [],
    item_category: data.itemCategory || 'subscription',
    number_items: data.numberOfItems || 1,
  });
}

/**
 * Track add to cart (subscription plan selection)
 */
export function trackSnapchatAddCart(data: {
  itemIds: string[];
  price: string;
  currency: string;
  itemCategory?: string;
  numberOfItems?: number;
}): void {
  trackSnapchatPixelEvent('ADD_CART', {
    item_ids: data.itemIds,
    price: data.price,
    currency: data.currency,
    item_category: data.itemCategory || 'subscription',
    number_items: data.numberOfItems || 1,
  });
}

/**
 * Track start checkout (subscription flow started)
 */
export function trackSnapchatStartCheckout(data: {
  price: string;
  currency: string;
  itemIds?: string[];
  numberOfItems?: number;
}): void {
  trackSnapchatPixelEvent('START_CHECKOUT', {
    price: data.price,
    currency: data.currency,
    item_ids: data.itemIds || [],
    number_items: data.numberOfItems || 1,
  });
}

/**
 * Track add billing info (payment info entered)
 */
export function trackSnapchatAddBilling(): void {
  trackSnapchatPixelEvent('ADD_BILLING');
}

/**
 * Track subscribe (subscription started)
 */
export function trackSnapchatSubscribe(data: {
  price: string;
  currency: string;
  subscriptionPlan?: string;
}): void {
  const params: any = {
    price: data.price,
    currency: data.currency,
  };

  if (data.subscriptionPlan) {
    params.subscription_plan = data.subscriptionPlan;
  }

  trackSnapchatPixelEvent('SUBSCRIBE', params);
}

/**
 * Track view content (profile view)
 */
export function trackSnapchatViewContent(data: {
  itemIds?: string[];
  description?: string;
}): void {
  const params: any = {};

  if (data.itemIds) {
    params.item_ids = data.itemIds;
  }
  if (data.description) {
    params.description = data.description;
  }

  trackSnapchatPixelEvent('VIEW_CONTENT', params);
}

/**
 * Track search
 */
export function trackSnapchatSearch(data: { searchString: string }): void {
  trackSnapchatPixelEvent('SEARCH', {
    search_string: data.searchString,
  });
}

/**
 * Track save (like/favorite)
 */
export function trackSnapchatSave(data: {
  itemIds?: string[];
  description?: string;
}): void {
  const params: any = {};

  if (data.itemIds) {
    params.item_ids = data.itemIds;
  }
  if (data.description) {
    params.description = data.description;
  }

  trackSnapchatPixelEvent('SAVE', params);
}

/**
 * Track list view (browse matches)
 */
export function trackSnapchatListView(data: {
  itemIds?: string[];
  category?: string;
}): void {
  const params: any = {};

  if (data.itemIds) {
    params.item_ids = data.itemIds;
  }
  if (data.category) {
    params.category = data.category;
  }

  trackSnapchatPixelEvent('LIST_VIEW', params);
}

/**
 * Track custom event
 */
export function trackSnapchatCustomEvent(data: {
  eventType: string;
  parameters?: Record<string, any>;
}): void {
  trackSnapchatPixelEvent(`CUSTOM_EVENT_${data.eventType.toUpperCase()}`, data.parameters || {});
}

/**
 * Set user email (for advanced matching)
 */
export function setSnapchatUserEmail(email: string): void {
  if (typeof window === 'undefined' || !window.snaptr) {
    return;
  }

  window.snaptr('init', window.snaptr.pixelId, {
    user_email: email,
  });

  console.log('Snapchat user email set');
}

/**
 * Set user phone number (for advanced matching)
 */
export function setSnapchatUserPhone(phoneNumber: string): void {
  if (typeof window === 'undefined' || !window.snaptr) {
    return;
  }

  window.snaptr('init', window.snaptr.pixelId, {
    user_phone_number: phoneNumber,
  });

  console.log('Snapchat user phone set');
}

/**
 * Set user hashed email (SHA-256)
 */
export function setSnapchatUserHashedEmail(hashedEmail: string): void {
  if (typeof window === 'undefined' || !window.snaptr) {
    return;
  }

  window.snaptr('init', window.snaptr.pixelId, {
    user_hashed_email: hashedEmail,
  });

  console.log('Snapchat user hashed email set');
}

/**
 * Get Snapchat Pixel installation snippet
 */
export function getSnapchatPixelSnippet(pixelId: string): string {
  return `
<!-- Snapchat Pixel Code -->
<script type='text/javascript'>
(function(e,t,n){if(e.snaptr)return;var a=e.snaptr=function()
{a.handleRequest?a.handleRequest.apply(a,arguments):a.queue.push(arguments)};
a.queue=[];var s='script';r=t.createElement(s);r.async=!0;
r.src=n;var u=t.getElementsByTagName(s)[0];
u.parentNode.insertBefore(r,u);})(window,document,
'https://sc-static.net/scevent.min.js');

snaptr('init', '${pixelId}', {
'user_email': '__INSERT_USER_EMAIL__'
});

snaptr('track', 'PAGE_VIEW');
</script>
<!-- End Snapchat Pixel Code -->
  `.trim();
}

export default {
  initializeSnapchatPixel,
  trackSnapchatPixelEvent,
  trackSnapchatPageView,
  trackSnapchatSignUp,
  trackSnapchatPurchase,
  trackSnapchatAddCart,
  trackSnapchatStartCheckout,
  trackSnapchatAddBilling,
  trackSnapchatSubscribe,
  trackSnapchatViewContent,
  trackSnapchatSearch,
  trackSnapchatSave,
  trackSnapchatListView,
  trackSnapchatCustomEvent,
  setSnapchatUserEmail,
  setSnapchatUserPhone,
  setSnapchatUserHashedEmail,
  getSnapchatPixelSnippet,
};
