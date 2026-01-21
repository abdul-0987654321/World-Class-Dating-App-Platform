/**
 * Marketing Pixels Integration Service
 * Handles TikTok, LinkedIn, Snapchat, Twitter/X, Pinterest, and other ad platform pixels
 */

// ============================================================================
// TIKTOK PIXEL INTEGRATION
// ============================================================================

export interface TikTokPixelConfig {
  pixelId: string;
  advancedMatching?: boolean;
}

export interface TikTokEvent {
  event: string;
  eventId?: string;
  contents?: Array<{
    contentId: string;
    contentType?: string;
    contentName?: string;
    price?: number;
    quantity?: number;
  }>;
  value?: number;
  currency?: string;
  query?: string;
  description?: string;
}

export const TikTokPixel = {
  /**
   * Generate TikTok Pixel base code
   */
  getBaseCode(config: TikTokPixelConfig): string {
    return `
<!-- TikTok Pixel Code -->
<script>
!function (w, d, t) {
  w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
  ttq.load('${config.pixelId}');
  ttq.page();
}(window, document, 'ttq');
</script>
<!-- End TikTok Pixel Code -->`;
  },

  /**
   * Generate TikTok event tracking code
   */
  trackEvent(event: TikTokEvent): string {
    const eventData: Record<string, unknown> = {};

    if (event.contents) eventData.contents = event.contents;
    if (event.value) eventData.value = event.value;
    if (event.currency) eventData.currency = event.currency;
    if (event.query) eventData.query = event.query;
    if (event.description) eventData.description = event.description;
    if (event.eventId) eventData.event_id = event.eventId;

    return `ttq.track('${event.event}', ${JSON.stringify(eventData)});`;
  },

  /**
   * TikTok standard events
   */
  events: {
    PAGE_VIEW: 'PageView',
    VIEW_CONTENT: 'ViewContent',
    CLICK_BUTTON: 'ClickButton',
    SEARCH: 'Search',
    ADD_TO_WISHLIST: 'AddToWishlist',
    ADD_TO_CART: 'AddToCart',
    INITIATE_CHECKOUT: 'InitiateCheckout',
    ADD_PAYMENT_INFO: 'AddPaymentInfo',
    COMPLETE_PAYMENT: 'CompletePayment',
    PLACE_AN_ORDER: 'PlaceAnOrder',
    CONTACT: 'Contact',
    DOWNLOAD: 'Download',
    SUBMIT_FORM: 'SubmitForm',
    COMPLETE_REGISTRATION: 'CompleteRegistration',
    SUBSCRIBE: 'Subscribe',
  },
};

// ============================================================================
// LINKEDIN INSIGHT TAG INTEGRATION
// ============================================================================

export interface LinkedInConfig {
  partnerId: string;
}

export interface LinkedInConversion {
  conversionId: string;
  value?: number;
  currency?: string;
}

export const LinkedInInsightTag = {
  /**
   * Generate LinkedIn Insight Tag base code
   */
  getBaseCode(config: LinkedInConfig): string {
    return `
<!-- LinkedIn Insight Tag -->
<script type="text/javascript">
_linkedin_partner_id = "${config.partnerId}";
window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
window._linkedin_data_partner_ids.push(_linkedin_partner_id);
</script>
<script type="text/javascript">
(function(l) {
if (!l){window.lintrk = function(a,b){window.lintrk.q.push([a,b])};
window.lintrk.q=[]}
var s = document.getElementsByTagName("script")[0];
var b = document.createElement("script");
b.type = "text/javascript";b.async = true;
b.src = "https://snap.licdn.com/li.lms-analytics/insight.min.js";
s.parentNode.insertBefore(b, s);})(window.lintrk);
</script>
<noscript>
<img height="1" width="1" style="display:none;" alt="" src="https://px.ads.linkedin.com/collect/?pid=${config.partnerId}&fmt=gif" />
</noscript>
<!-- End LinkedIn Insight Tag -->`;
  },

  /**
   * Track LinkedIn conversion event
   */
  trackConversion(conversion: LinkedInConversion): string {
    const conversionData: Record<string, unknown> = {
      conversion_id: conversion.conversionId,
    };

    if (conversion.value) conversionData.value = conversion.value;
    if (conversion.currency) conversionData.currency = conversion.currency;

    return `window.lintrk('track', ${JSON.stringify(conversionData)});`;
  },
};

// ============================================================================
// SNAPCHAT PIXEL INTEGRATION
// ============================================================================

export interface SnapchatPixelConfig {
  pixelId: string;
  userEmail?: string;
  userPhoneNumber?: string;
}

export interface SnapchatEvent {
  event: string;
  eventId?: string;
  itemCategory?: string;
  itemIds?: string[];
  description?: string;
  numberOfItems?: number;
  paymentInfoAvailable?: boolean;
  price?: number;
  currency?: string;
  transactionId?: string;
  searchString?: string;
  signUpMethod?: string;
}

export const SnapchatPixel = {
  /**
   * Generate Snapchat Pixel base code
   */
  getBaseCode(config: SnapchatPixelConfig): string {
    const userParams: string[] = [];
    if (config.userEmail) userParams.push(`user_email: '${config.userEmail}'`);
    if (config.userPhoneNumber) userParams.push(`user_phone_number: '${config.userPhoneNumber}'`);

    const userParamStr = userParams.length > 0 ? `, {${userParams.join(', ')}}` : '';

    return `
<!-- Snapchat Pixel Code -->
<script type='text/javascript'>
(function(e,t,n){if(e.snaptr)return;var a=e.snaptr=function()
{a.handleRequest?a.handleRequest.apply(a,arguments):a.queue.push(arguments)};
a.queue=[];var s='script';r=t.createElement(s);r.async=!0;
r.src=n;var u=t.getElementsByTagName(s)[0];
u.parentNode.insertBefore(r,u);})(window,document,
'https://sc-static.net/scevent.min.js');

snaptr('init', '${config.pixelId}'${userParamStr});
snaptr('track', 'PAGE_VIEW');
</script>
<!-- End Snapchat Pixel Code -->`;
  },

  /**
   * Track Snapchat event
   */
  trackEvent(event: SnapchatEvent): string {
    const eventData: Record<string, unknown> = {};

    if (event.eventId) eventData.client_dedup_id = event.eventId;
    if (event.itemCategory) eventData.item_category = event.itemCategory;
    if (event.itemIds) eventData.item_ids = event.itemIds;
    if (event.description) eventData.description = event.description;
    if (event.numberOfItems) eventData.number_items = event.numberOfItems;
    if (event.paymentInfoAvailable !== undefined)
      eventData.payment_info_available = event.paymentInfoAvailable;
    if (event.price) eventData.price = event.price;
    if (event.currency) eventData.currency = event.currency;
    if (event.transactionId) eventData.transaction_id = event.transactionId;
    if (event.searchString) eventData.search_string = event.searchString;
    if (event.signUpMethod) eventData.sign_up_method = event.signUpMethod;

    return `snaptr('track', '${event.event}', ${JSON.stringify(eventData)});`;
  },

  /**
   * Snapchat standard events
   */
  events: {
    PAGE_VIEW: 'PAGE_VIEW',
    VIEW_CONTENT: 'VIEW_CONTENT',
    ADD_CART: 'ADD_CART',
    ADD_BILLING: 'ADD_BILLING',
    ADD_TO_WISHLIST: 'ADD_TO_WISHLIST',
    START_CHECKOUT: 'START_CHECKOUT',
    PURCHASE: 'PURCHASE',
    SEARCH: 'SEARCH',
    SIGN_UP: 'SIGN_UP',
    SUBSCRIBE: 'SUBSCRIBE',
    COMPLETE_TUTORIAL: 'COMPLETE_TUTORIAL',
    LEVEL_COMPLETE: 'LEVEL_COMPLETE',
    AD_CLICK: 'AD_CLICK',
    AD_VIEW: 'AD_VIEW',
    APP_OPEN: 'APP_OPEN',
    CUSTOM_EVENT_1: 'CUSTOM_EVENT_1',
    CUSTOM_EVENT_2: 'CUSTOM_EVENT_2',
    CUSTOM_EVENT_3: 'CUSTOM_EVENT_3',
    CUSTOM_EVENT_4: 'CUSTOM_EVENT_4',
    CUSTOM_EVENT_5: 'CUSTOM_EVENT_5',
  },
};

// ============================================================================
// TWITTER/X PIXEL INTEGRATION
// ============================================================================

export interface TwitterPixelConfig {
  pixelId: string;
}

export interface TwitterEvent {
  event: string;
  eventId?: string;
  value?: number;
  currency?: string;
  numItems?: number;
  contentType?: string;
  contentIds?: string[];
  contentName?: string;
  contentCategory?: string;
  searchString?: string;
  status?: string;
}

export const TwitterPixel = {
  /**
   * Generate Twitter Pixel base code
   */
  getBaseCode(config: TwitterPixelConfig): string {
    return `
<!-- Twitter Universal Website Tag -->
<script>
!function(e,t,n,s,u,a){e.twq||(s=e.twq=function(){s.exe?s.exe.apply(s,arguments):s.queue.push(arguments);
},s.version='1.1',s.queue=[],u=t.createElement(n),u.async=!0,u.src='https://static.ads-twitter.com/uwt.js',
a=t.getElementsByTagName(n)[0],a.parentNode.insertBefore(u,a))}(window,document,'script');
twq('config','${config.pixelId}');
</script>
<!-- End Twitter Universal Website Tag -->`;
  },

  /**
   * Track Twitter conversion event
   */
  trackEvent(event: TwitterEvent): string {
    const eventData: Record<string, unknown> = {};

    if (event.eventId) eventData.event_id = event.eventId;
    if (event.value) eventData.value = event.value;
    if (event.currency) eventData.currency = event.currency;
    if (event.numItems) eventData.num_items = event.numItems;
    if (event.contentType) eventData.content_type = event.contentType;
    if (event.contentIds) eventData.content_ids = event.contentIds;
    if (event.contentName) eventData.content_name = event.contentName;
    if (event.contentCategory) eventData.content_category = event.contentCategory;
    if (event.searchString) eventData.search_string = event.searchString;
    if (event.status) eventData.status = event.status;

    return `twq('event', '${event.event}', ${JSON.stringify(eventData)});`;
  },

  /**
   * Twitter standard events
   */
  events: {
    PAGE_VIEW: 'PageView',
    PURCHASE: 'Purchase',
    SIGN_UP: 'Signup',
    DOWNLOAD: 'Download',
    CUSTOM: 'Custom',
    ADD_TO_CART: 'AddToCart',
    ADD_TO_WISHLIST: 'AddToWishlist',
    CHECKOUT_INITIATED: 'CheckoutInitiated',
    CONTENT_VIEW: 'ContentView',
    SEARCH: 'Search',
    SUBSCRIBE: 'Subscribe',
    START_TRIAL: 'StartTrial',
    LEAD: 'Lead',
    ADD_PAYMENT_INFO: 'AddPaymentInfo',
  },
};

// ============================================================================
// PINTEREST TAG INTEGRATION
// ============================================================================

export interface PinterestTagConfig {
  tagId: string;
  em?: string; // Hashed email
  hashed_maids?: string[]; // Hashed mobile ad IDs
}

export interface PinterestEvent {
  event: string;
  eventId?: string;
  value?: number;
  currency?: string;
  orderQuantity?: number;
  productId?: string;
  productName?: string;
  productCategory?: string;
  productBrand?: string;
  productPrice?: number;
  searchQuery?: string;
  leadType?: string;
}

export const PinterestTag = {
  /**
   * Generate Pinterest Tag base code
   */
  getBaseCode(config: PinterestTagConfig): string {
    const initParams: string[] = [`tid: '${config.tagId}'`];
    if (config.em) initParams.push(`em: '${config.em}'`);
    if (config.hashed_maids)
      initParams.push(`hashed_maids: ${JSON.stringify(config.hashed_maids)}`);

    return `
<!-- Pinterest Tag -->
<script>
!function(e){if(!window.pintrk){window.pintrk = function () {
window.pintrk.queue.push(Array.prototype.slice.call(arguments))};var
n=window.pintrk;n.queue=[],n.version="3.0";var
t=document.createElement("script");t.async=!0,t.src=e;var
r=document.getElementsByTagName("script")[0];
r.parentNode.insertBefore(t,r)}}("https://s.pinimg.com/ct/core.js");
pintrk('load', '${config.tagId}', {${initParams.slice(1).join(', ')}});
pintrk('page');
</script>
<noscript>
<img height="1" width="1" style="display:none;" alt=""
  src="https://ct.pinterest.com/v3/?event=init&tid=${config.tagId}&noscript=1" />
</noscript>
<!-- End Pinterest Tag -->`;
  },

  /**
   * Track Pinterest event
   */
  trackEvent(event: PinterestEvent): string {
    const eventData: Record<string, unknown> = {};

    if (event.eventId) eventData.event_id = event.eventId;
    if (event.value) eventData.value = event.value;
    if (event.currency) eventData.currency = event.currency;
    if (event.orderQuantity) eventData.order_quantity = event.orderQuantity;
    if (event.productId) eventData.product_id = event.productId;
    if (event.productName) eventData.product_name = event.productName;
    if (event.productCategory) eventData.product_category = event.productCategory;
    if (event.productBrand) eventData.product_brand = event.productBrand;
    if (event.productPrice) eventData.product_price = event.productPrice;
    if (event.searchQuery) eventData.search_query = event.searchQuery;
    if (event.leadType) eventData.lead_type = event.leadType;

    return `pintrk('track', '${event.event}', ${JSON.stringify(eventData)});`;
  },

  /**
   * Pinterest standard events
   */
  events: {
    PAGE_VISIT: 'pagevisit',
    VIEW_CATEGORY: 'viewcategory',
    SEARCH: 'search',
    ADD_TO_CART: 'addtocart',
    CHECKOUT: 'checkout',
    WATCH_VIDEO: 'watchvideo',
    SIGNUP: 'signup',
    LEAD: 'lead',
    CUSTOM: 'custom',
  },
};

// ============================================================================
// MICROSOFT CLARITY INTEGRATION
// ============================================================================

export interface ClarityConfig {
  projectId: string;
}

export const MicrosoftClarity = {
  /**
   * Generate Microsoft Clarity base code
   */
  getBaseCode(config: ClarityConfig): string {
    return `
<!-- Microsoft Clarity -->
<script type="text/javascript">
(function(c,l,a,r,i,t,y){
    c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
    t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
    y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
})(window, document, "clarity", "script", "${config.projectId}");
</script>
<!-- End Microsoft Clarity -->`;
  },

  /**
   * Set Clarity custom tags
   */
  setCustomTag(key: string, value: string): string {
    return `clarity("set", "${key}", "${value}");`;
  },

  /**
   * Identify user in Clarity
   */
  identifyUser(customId: string, customSessionId?: string, customPageId?: string): string {
    const params = [customId];
    if (customSessionId) params.push(customSessionId);
    if (customPageId) params.push(customPageId);
    return `clarity("identify", ${params.map((p) => `"${p}"`).join(', ')});`;
  },

  /**
   * Consent management
   */
  setConsent(hasConsent: boolean): string {
    return `clarity("consent", ${hasConsent});`;
  },
};

// ============================================================================
// REDDIT PIXEL INTEGRATION
// ============================================================================

export interface RedditPixelConfig {
  pixelId: string;
  optOut?: boolean;
  useDecimalCurrencyValues?: boolean;
}

export interface RedditEvent {
  event: string;
  conversionId?: string;
  customEventName?: string;
  itemCount?: number;
  currency?: string;
  value?: number;
}

export const RedditPixel = {
  /**
   * Generate Reddit Pixel base code
   */
  getBaseCode(config: RedditPixelConfig): string {
    const options: string[] = [];
    if (config.optOut) options.push(`optOut: ${config.optOut}`);
    if (config.useDecimalCurrencyValues)
      options.push(`useDecimalCurrencyValues: ${config.useDecimalCurrencyValues}`);
    const optionsStr = options.length > 0 ? `, {${options.join(', ')}}` : '';

    return `
<!-- Reddit Pixel -->
<script>
!function(w,d){if(!w.rdt){var p=w.rdt=function(){p.sendEvent?p.sendEvent.apply(p,arguments):p.callQueue.push(arguments)};p.callQueue=[];var t=d.createElement("script");t.src="https://www.redditstatic.com/ads/pixel.js",t.async=!0;var s=d.getElementsByTagName("script")[0];s.parentNode.insertBefore(t,s)}}(window,document);
rdt('init','${config.pixelId}'${optionsStr});
rdt('track', 'PageVisit');
</script>
<!-- End Reddit Pixel -->`;
  },

  /**
   * Track Reddit event
   */
  trackEvent(event: RedditEvent): string {
    const eventData: Record<string, unknown> = {};

    if (event.conversionId) eventData.conversionId = event.conversionId;
    if (event.customEventName) eventData.customEventName = event.customEventName;
    if (event.itemCount) eventData.itemCount = event.itemCount;
    if (event.currency) eventData.currency = event.currency;
    if (event.value) eventData.value = event.value;

    return `rdt('track', '${event.event}', ${JSON.stringify(eventData)});`;
  },

  /**
   * Reddit standard events
   */
  events: {
    PAGE_VISIT: 'PageVisit',
    VIEW_CONTENT: 'ViewContent',
    SEARCH: 'Search',
    ADD_TO_CART: 'AddToCart',
    ADD_TO_WISHLIST: 'AddToWishlist',
    PURCHASE: 'Purchase',
    LEAD: 'Lead',
    SIGN_UP: 'SignUp',
    CUSTOM: 'Custom',
  },
};

// ============================================================================
// QUORA PIXEL INTEGRATION
// ============================================================================

export interface QuoraPixelConfig {
  pixelId: string;
}

export const QuoraPixel = {
  /**
   * Generate Quora Pixel base code
   */
  getBaseCode(config: QuoraPixelConfig): string {
    return `
<!-- Quora Pixel -->
<script>
!function(q,e,v,n,t,s){if(q.qp) return; n=q.qp=function(){n.qp?n.qp.apply(n,arguments):n.queue.push(arguments);}; n.queue=[];t=document.createElement(e);t.async=!0;t.src=v; s=document.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t,s);}(window, 'script', 'https://a.quora.com/qevents.js');
qp('init', '${config.pixelId}');
qp('track', 'ViewContent');
</script>
<noscript><img height="1" width="1" style="display:none" src="https://q.quora.com/_/ad/${config.pixelId}/pixel?tag=ViewContent&noscript=1"/></noscript>
<!-- End Quora Pixel -->`;
  },

  /**
   * Track Quora event
   */
  trackEvent(event: string, revenue?: number): string {
    if (revenue) {
      return `qp('track', '${event}', {revenue: ${revenue}});`;
    }
    return `qp('track', '${event}');`;
  },

  /**
   * Quora standard events
   */
  events: {
    VIEW_CONTENT: 'ViewContent',
    COMPLETE_REGISTRATION: 'CompleteRegistration',
    ADD_TO_CART: 'AddToCart',
    PURCHASE: 'Purchase',
    GENERATE_LEAD: 'GenerateLead',
    SEARCH: 'Search',
    GENERIC: 'Generic',
  },
};

// ============================================================================
// UNIFIED MARKETING PIXEL MANAGER
// ============================================================================

export interface MarketingPixelsConfig {
  tiktok?: TikTokPixelConfig;
  linkedin?: LinkedInConfig;
  snapchat?: SnapchatPixelConfig;
  twitter?: TwitterPixelConfig;
  pinterest?: PinterestTagConfig;
  clarity?: ClarityConfig;
  reddit?: RedditPixelConfig;
  quora?: QuoraPixelConfig;
}

export class MarketingPixelManager {
  private config: MarketingPixelsConfig;

  constructor(config: MarketingPixelsConfig) {
    this.config = config;
  }

  /**
   * Generate all pixel base codes
   */
  getAllBaseCodes(): string {
    let codes = '';

    if (this.config.tiktok) {
      codes += TikTokPixel.getBaseCode(this.config.tiktok);
    }
    if (this.config.linkedin) {
      codes += LinkedInInsightTag.getBaseCode(this.config.linkedin);
    }
    if (this.config.snapchat) {
      codes += SnapchatPixel.getBaseCode(this.config.snapchat);
    }
    if (this.config.twitter) {
      codes += TwitterPixel.getBaseCode(this.config.twitter);
    }
    if (this.config.pinterest) {
      codes += PinterestTag.getBaseCode(this.config.pinterest);
    }
    if (this.config.clarity) {
      codes += MicrosoftClarity.getBaseCode(this.config.clarity);
    }
    if (this.config.reddit) {
      codes += RedditPixel.getBaseCode(this.config.reddit);
    }
    if (this.config.quora) {
      codes += QuoraPixel.getBaseCode(this.config.quora);
    }

    return codes;
  }

  /**
   * Track signup event across all pixels
   */
  trackSignup(userId?: string, method?: string): string[] {
    const events: string[] = [];

    if (this.config.tiktok) {
      events.push(TikTokPixel.trackEvent({ event: TikTokPixel.events.COMPLETE_REGISTRATION }));
    }
    if (this.config.snapchat) {
      events.push(
        SnapchatPixel.trackEvent({ event: SnapchatPixel.events.SIGN_UP, signUpMethod: method })
      );
    }
    if (this.config.twitter) {
      events.push(TwitterPixel.trackEvent({ event: TwitterPixel.events.SIGN_UP }));
    }
    if (this.config.pinterest) {
      events.push(PinterestTag.trackEvent({ event: PinterestTag.events.SIGNUP }));
    }
    if (this.config.reddit) {
      events.push(RedditPixel.trackEvent({ event: RedditPixel.events.SIGN_UP }));
    }
    if (this.config.quora) {
      events.push(QuoraPixel.trackEvent(QuoraPixel.events.COMPLETE_REGISTRATION));
    }

    return events;
  }

  /**
   * Track purchase event across all pixels
   */
  trackPurchase(value: number, currency: string, transactionId?: string): string[] {
    const events: string[] = [];

    if (this.config.tiktok) {
      events.push(
        TikTokPixel.trackEvent({
          event: TikTokPixel.events.COMPLETE_PAYMENT,
          value,
          currency,
        })
      );
    }
    if (this.config.snapchat) {
      events.push(
        SnapchatPixel.trackEvent({
          event: SnapchatPixel.events.PURCHASE,
          price: value,
          currency,
          transactionId,
        })
      );
    }
    if (this.config.twitter) {
      events.push(
        TwitterPixel.trackEvent({
          event: TwitterPixel.events.PURCHASE,
          value,
          currency,
        })
      );
    }
    if (this.config.pinterest) {
      events.push(
        PinterestTag.trackEvent({
          event: PinterestTag.events.CHECKOUT,
          value,
          currency,
        })
      );
    }
    if (this.config.reddit) {
      events.push(
        RedditPixel.trackEvent({
          event: RedditPixel.events.PURCHASE,
          value,
          currency,
        })
      );
    }
    if (this.config.quora) {
      events.push(QuoraPixel.trackEvent(QuoraPixel.events.PURCHASE, value));
    }

    return events;
  }

  /**
   * Track subscription event across all pixels
   */
  trackSubscription(planName: string, value: number, currency: string): string[] {
    const events: string[] = [];

    if (this.config.tiktok) {
      events.push(
        TikTokPixel.trackEvent({
          event: TikTokPixel.events.SUBSCRIBE,
          value,
          currency,
          description: planName,
        })
      );
    }
    if (this.config.snapchat) {
      events.push(
        SnapchatPixel.trackEvent({
          event: SnapchatPixel.events.SUBSCRIBE,
          price: value,
          currency,
          description: planName,
        })
      );
    }
    if (this.config.twitter) {
      events.push(
        TwitterPixel.trackEvent({
          event: TwitterPixel.events.SUBSCRIBE,
          value,
          currency,
          contentName: planName,
        })
      );
    }

    return events;
  }

  /**
   * Track search event across all pixels
   */
  trackSearch(query: string): string[] {
    const events: string[] = [];

    if (this.config.tiktok) {
      events.push(
        TikTokPixel.trackEvent({
          event: TikTokPixel.events.SEARCH,
          query,
        })
      );
    }
    if (this.config.snapchat) {
      events.push(
        SnapchatPixel.trackEvent({
          event: SnapchatPixel.events.SEARCH,
          searchString: query,
        })
      );
    }
    if (this.config.twitter) {
      events.push(
        TwitterPixel.trackEvent({
          event: TwitterPixel.events.SEARCH,
          searchString: query,
        })
      );
    }
    if (this.config.pinterest) {
      events.push(
        PinterestTag.trackEvent({
          event: PinterestTag.events.SEARCH,
          searchQuery: query,
        })
      );
    }
    if (this.config.reddit) {
      events.push(RedditPixel.trackEvent({ event: RedditPixel.events.SEARCH }));
    }
    if (this.config.quora) {
      events.push(QuoraPixel.trackEvent(QuoraPixel.events.SEARCH));
    }

    return events;
  }

  /**
   * Track lead/contact event across all pixels
   */
  trackLead(leadType?: string): string[] {
    const events: string[] = [];

    if (this.config.tiktok) {
      events.push(
        TikTokPixel.trackEvent({
          event: TikTokPixel.events.CONTACT,
        })
      );
    }
    if (this.config.pinterest) {
      events.push(
        PinterestTag.trackEvent({
          event: PinterestTag.events.LEAD,
          leadType,
        })
      );
    }
    if (this.config.reddit) {
      events.push(RedditPixel.trackEvent({ event: RedditPixel.events.LEAD }));
    }
    if (this.config.quora) {
      events.push(QuoraPixel.trackEvent(QuoraPixel.events.GENERATE_LEAD));
    }
    if (this.config.twitter) {
      events.push(TwitterPixel.trackEvent({ event: TwitterPixel.events.LEAD }));
    }

    return events;
  }
}
