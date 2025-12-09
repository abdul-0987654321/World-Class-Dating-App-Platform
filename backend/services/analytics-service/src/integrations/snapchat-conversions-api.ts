/**
 * Snapchat Conversions API (CAPI)
 * Server-side event tracking for Snapchat ads
 * Bypasses ad blockers and provides more accurate conversion data
 */

import crypto from 'crypto';

interface SnapchatCAPIConfig {
  pixelId: string;
  apiToken: string;
  testMode?: boolean;
}

interface SnapchatUserData {
  email?: string;
  phoneNumber?: string;
  ipAddress?: string;
  userAgent?: string;
  clickId?: string; // ScCid from URL
  clientDeduplicationId?: string;
  externalId?: string;
  uuid?: string;
}

interface SnapchatEventData {
  eventType: string; // PURCHASE, SIGN_UP, etc.
  eventConversionType: 'WEB' | 'MOBILE_APP' | 'OFFLINE';
  eventTag?: string; // Custom event identifier
  timestamp: number; // Unix timestamp in milliseconds
  userData: SnapchatUserData;
  customData?: Record<string, any>;
  pageUrl?: string;

  // E-commerce fields
  price?: string;
  currency?: string;
  transactionId?: string;
  itemIds?: string[];
  itemCategory?: string;
  numberOfItems?: number;
  description?: string;
  searchString?: string;
  signUpMethod?: string;
}

export class SnapchatConversionsAPI {
  private config: SnapchatCAPIConfig;
  private apiUrl: string;

  constructor(config: SnapchatCAPIConfig) {
    this.config = config;
    this.apiUrl = 'https://tr.snapchat.com/v2/conversion';
  }

  /**
   * Hash data with SHA-256 (lowercase)
   */
  private hashData(data: string): string {
    return crypto.createHash('sha256').update(data.toLowerCase().trim()).digest('hex');
  }

  /**
   * Normalize phone number to E.164 format
   */
  private normalizePhoneNumber(phone: string): string {
    // Remove all non-numeric characters
    return phone.replace(/\D/g, '');
  }

  /**
   * Normalize and hash user data
   */
  private normalizeUserData(userData: SnapchatUserData): Record<string, any> {
    const normalized: Record<string, any> = {};

    // Hash PII data
    if (userData.email) {
      normalized.em = [this.hashData(userData.email)];
    }
    if (userData.phoneNumber) {
      const phone = this.normalizePhoneNumber(userData.phoneNumber);
      normalized.ph = [this.hashData(phone)];
    }

    // These don't need hashing
    if (userData.ipAddress) {
      normalized.ip = userData.ipAddress;
    }
    if (userData.userAgent) {
      normalized.ua = userData.userAgent;
    }
    if (userData.clickId) {
      normalized.sc_click_id = userData.clickId;
    }
    if (userData.clientDeduplicationId) {
      normalized.client_dedup_id = userData.clientDeduplicationId;
    }
    if (userData.externalId) {
      normalized.external_id = userData.externalId;
    }
    if (userData.uuid) {
      normalized.uuid = userData.uuid;
    }

    return normalized;
  }

  /**
   * Send event to Snapchat Conversions API
   */
  async sendEvent(eventData: SnapchatEventData): Promise<{
    success: boolean;
    eventId?: string;
    error?: string;
  }> {
    try {
      const payload: any = {
        pixel_id: this.config.pixelId,
        event_type: eventData.eventType,
        event_conversion_type: eventData.eventConversionType,
        event_time: eventData.timestamp,
        user_data: this.normalizeUserData(eventData.userData),
      };

      // Add optional fields
      if (eventData.eventTag) {
        payload.event_tag = eventData.eventTag;
      }
      if (eventData.pageUrl) {
        payload.page_url = eventData.pageUrl;
      }
      if (eventData.customData) {
        payload.custom_data = eventData.customData;
      }

      // E-commerce fields
      if (eventData.price) payload.price = eventData.price;
      if (eventData.currency) payload.currency = eventData.currency;
      if (eventData.transactionId) payload.transaction_id = eventData.transactionId;
      if (eventData.itemIds) payload.item_ids = eventData.itemIds;
      if (eventData.itemCategory) payload.item_category = eventData.itemCategory;
      if (eventData.numberOfItems) payload.number_items = eventData.numberOfItems;
      if (eventData.description) payload.description = eventData.description;
      if (eventData.searchString) payload.search_string = eventData.searchString;
      if (eventData.signUpMethod) payload.sign_up_method = eventData.signUpMethod;

      // Test mode
      if (this.config.testMode) {
        payload.test = true;
      }

      // Wrap in data array
      const requestBody = {
        data: [payload],
      };

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const result: any = await response.json();

      if (!response.ok) {
        console.error('Snapchat CAPI error:', result);
        return {
          success: false,
          error: result.message || 'Unknown error',
        };
      }

      console.log('Snapchat CAPI event sent successfully:', eventData.eventType);
      return {
        success: true,
        eventId: eventData.userData.clientDeduplicationId,
      };
    } catch (error: any) {
      console.error('Snapchat CAPI request failed:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Track page view
   */
  async trackPageView(data: {
    userData: SnapchatUserData;
    pageUrl: string;
  }): Promise<any> {
    return this.sendEvent({
      eventType: 'PAGE_VIEW',
      eventConversionType: 'WEB',
      timestamp: Date.now(),
      userData: data.userData,
      pageUrl: data.pageUrl,
    });
  }

  /**
   * Track sign up (registration)
   */
  async trackSignUp(data: {
    userData: SnapchatUserData;
    pageUrl?: string;
    signUpMethod?: string;
  }): Promise<any> {
    return this.sendEvent({
      eventType: 'SIGN_UP',
      eventConversionType: 'WEB',
      timestamp: Date.now(),
      userData: data.userData,
      pageUrl: data.pageUrl,
      signUpMethod: data.signUpMethod,
    });
  }

  /**
   * Track purchase (subscription)
   */
  async trackPurchase(data: {
    userData: SnapchatUserData;
    transactionId: string;
    price: string;
    currency: string;
    itemIds?: string[];
    itemCategory?: string;
    numberOfItems?: number;
    pageUrl?: string;
  }): Promise<any> {
    return this.sendEvent({
      eventType: 'PURCHASE',
      eventConversionType: 'WEB',
      timestamp: Date.now(),
      userData: data.userData,
      transactionId: data.transactionId,
      price: data.price,
      currency: data.currency,
      itemIds: data.itemIds,
      itemCategory: data.itemCategory || 'subscription',
      numberOfItems: data.numberOfItems || 1,
      pageUrl: data.pageUrl,
    });
  }

  /**
   * Track add to cart (subscription plan selection)
   */
  async trackAddCart(data: {
    userData: SnapchatUserData;
    itemIds: string[];
    price: string;
    currency: string;
    itemCategory?: string;
    numberOfItems?: number;
    pageUrl?: string;
  }): Promise<any> {
    return this.sendEvent({
      eventType: 'ADD_CART',
      eventConversionType: 'WEB',
      timestamp: Date.now(),
      userData: data.userData,
      itemIds: data.itemIds,
      price: data.price,
      currency: data.currency,
      itemCategory: data.itemCategory || 'subscription',
      numberOfItems: data.numberOfItems || 1,
      pageUrl: data.pageUrl,
    });
  }

  /**
   * Track start checkout (subscription flow started)
   */
  async trackStartCheckout(data: {
    userData: SnapchatUserData;
    price: string;
    currency: string;
    itemIds?: string[];
    numberOfItems?: number;
    pageUrl?: string;
  }): Promise<any> {
    return this.sendEvent({
      eventType: 'START_CHECKOUT',
      eventConversionType: 'WEB',
      timestamp: Date.now(),
      userData: data.userData,
      price: data.price,
      currency: data.currency,
      itemIds: data.itemIds,
      numberOfItems: data.numberOfItems || 1,
      pageUrl: data.pageUrl,
    });
  }

  /**
   * Track add billing (payment info entered)
   */
  async trackAddBilling(data: {
    userData: SnapchatUserData;
    pageUrl?: string;
  }): Promise<any> {
    return this.sendEvent({
      eventType: 'ADD_BILLING',
      eventConversionType: 'WEB',
      timestamp: Date.now(),
      userData: data.userData,
      pageUrl: data.pageUrl,
    });
  }

  /**
   * Track subscribe (subscription started)
   */
  async trackSubscribe(data: {
    userData: SnapchatUserData;
    price: string;
    currency: string;
    pageUrl?: string;
    customData?: Record<string, any>;
  }): Promise<any> {
    return this.sendEvent({
      eventType: 'SUBSCRIBE',
      eventConversionType: 'WEB',
      timestamp: Date.now(),
      userData: data.userData,
      price: data.price,
      currency: data.currency,
      pageUrl: data.pageUrl,
      customData: data.customData,
    });
  }

  /**
   * Track view content (profile view)
   */
  async trackViewContent(data: {
    userData: SnapchatUserData;
    itemIds?: string[];
    description?: string;
    pageUrl?: string;
  }): Promise<any> {
    return this.sendEvent({
      eventType: 'VIEW_CONTENT',
      eventConversionType: 'WEB',
      timestamp: Date.now(),
      userData: data.userData,
      itemIds: data.itemIds,
      description: data.description,
      pageUrl: data.pageUrl,
    });
  }

  /**
   * Track search
   */
  async trackSearch(data: {
    userData: SnapchatUserData;
    searchString: string;
    pageUrl?: string;
  }): Promise<any> {
    return this.sendEvent({
      eventType: 'SEARCH',
      eventConversionType: 'WEB',
      timestamp: Date.now(),
      userData: data.userData,
      searchString: data.searchString,
      pageUrl: data.pageUrl,
    });
  }

  /**
   * Track save (like/favorite)
   */
  async trackSave(data: {
    userData: SnapchatUserData;
    itemIds?: string[];
    description?: string;
    pageUrl?: string;
  }): Promise<any> {
    return this.sendEvent({
      eventType: 'SAVE',
      eventConversionType: 'WEB',
      timestamp: Date.now(),
      userData: data.userData,
      itemIds: data.itemIds,
      description: data.description,
      pageUrl: data.pageUrl,
    });
  }

  /**
   * Track list view (browse matches)
   */
  async trackListView(data: {
    userData: SnapchatUserData;
    itemIds?: string[];
    itemCategory?: string;
    pageUrl?: string;
  }): Promise<any> {
    return this.sendEvent({
      eventType: 'LIST_VIEW',
      eventConversionType: 'WEB',
      timestamp: Date.now(),
      userData: data.userData,
      itemIds: data.itemIds,
      itemCategory: data.itemCategory,
      pageUrl: data.pageUrl,
    });
  }

  /**
   * Track custom event
   */
  async trackCustomEvent(data: {
    eventType: string;
    userData: SnapchatUserData;
    pageUrl?: string;
    customData?: Record<string, any>;
  }): Promise<any> {
    return this.sendEvent({
      eventType: `CUSTOM_EVENT_${data.eventType.toUpperCase()}`,
      eventConversionType: 'WEB',
      timestamp: Date.now(),
      userData: data.userData,
      pageUrl: data.pageUrl,
      customData: data.customData,
    });
  }
}

/**
 * Create Snapchat Conversions API instance
 */
export function createSnapchatConversionsAPI(config: SnapchatCAPIConfig): SnapchatConversionsAPI {
  return new SnapchatConversionsAPI(config);
}

export default SnapchatConversionsAPI;
