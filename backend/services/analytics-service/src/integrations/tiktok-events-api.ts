/**
 * TikTok Events API - Server-Side Tracking
 * Bypasses ad blockers and provides more accurate conversion data
 */

import crypto from 'crypto';

interface TikTokEventsAPIConfig {
  pixelId: string;
  accessToken: string;
  testEventCode?: string; // For testing in TikTok Events Manager
}

interface TikTokUserData {
  email?: string;
  phone?: string;
  externalId?: string; // Your internal user ID
  ttclid?: string; // TikTok click ID
  ttp?: string; // TikTok cookie
  ipAddress?: string;
  userAgent?: string;
}

interface TikTokEventData {
  event: string;
  eventTime: number; // Unix timestamp in seconds
  eventId: string; // Deduplication ID
  pageUrl?: string;
  referrerUrl?: string;
  userData?: TikTokUserData;
  properties?: Record<string, any>;
}

export class TikTokEventsAPI {
  private config: TikTokEventsAPIConfig;
  private apiUrl: string;

  constructor(config: TikTokEventsAPIConfig) {
    this.config = config;
    this.apiUrl = 'https://business-api.tiktok.com/open_api/v1.3/event/track/';
  }

  /**
   * Hash user data with SHA-256
   */
  private hashData(data: string): string {
    return crypto.createHash('sha256').update(data.toLowerCase().trim()).digest('hex');
  }

  /**
   * Normalize and hash user data
   */
  private normalizeUserData(userData?: TikTokUserData): Record<string, any> {
    if (!userData) return {};

    const normalized: Record<string, any> = {};

    // Hash PII data
    if (userData.email) {
      normalized.email = this.hashData(userData.email);
    }
    if (userData.phone) {
      // Remove non-numeric characters
      const phone = userData.phone.replace(/\D/g, '');
      normalized.phone = this.hashData(phone);
    }
    if (userData.externalId) {
      normalized.external_id = this.hashData(userData.externalId);
    }

    // These don't need hashing
    if (userData.ttclid) {
      normalized.ttclid = userData.ttclid;
    }
    if (userData.ttp) {
      normalized.ttp = userData.ttp;
    }
    if (userData.ipAddress) {
      normalized.ip = userData.ipAddress;
    }
    if (userData.userAgent) {
      normalized.user_agent = userData.userAgent;
    }

    return normalized;
  }

  /**
   * Send event to TikTok Events API
   */
  async sendEvent(eventData: TikTokEventData): Promise<{
    success: boolean;
    eventId: string;
    error?: string;
  }> {
    try {
      const payload = {
        pixel_code: this.config.pixelId,
        event: eventData.event,
        event_time: eventData.eventTime,
        event_id: eventData.eventId,
        context: {
          ad: {},
          page: {
            url: eventData.pageUrl,
            referrer: eventData.referrerUrl,
          },
          user: this.normalizeUserData(eventData.userData),
        },
        properties: eventData.properties || {},
        ...(this.config.testEventCode && { test_event_code: this.config.testEventCode }),
      };

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Access-Token': this.config.accessToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || result.code !== 0) {
        console.error('TikTok Events API error:', result);
        return {
          success: false,
          eventId: eventData.eventId,
          error: result.message || 'Unknown error',
        };
      }

      console.log('TikTok Events API event sent successfully:', eventData.event);
      return {
        success: true,
        eventId: eventData.eventId,
      };
    } catch (error: any) {
      console.error('TikTok Events API request failed:', error);
      return {
        success: false,
        eventId: eventData.eventId,
        error: error.message,
      };
    }
  }

  /**
   * Track page view
   */
  async trackPageView(data: {
    eventId: string;
    pageUrl: string;
    referrerUrl?: string;
    userData?: TikTokUserData;
  }): Promise<any> {
    return this.sendEvent({
      event: 'PageView',
      eventTime: Math.floor(Date.now() / 1000),
      eventId: data.eventId,
      pageUrl: data.pageUrl,
      referrerUrl: data.referrerUrl,
      userData: data.userData,
    });
  }

  /**
   * Track registration started (InitiateCheckout)
   */
  async trackRegistrationStarted(data: {
    eventId: string;
    pageUrl: string;
    userData?: TikTokUserData;
  }): Promise<any> {
    return this.sendEvent({
      event: 'InitiateCheckout',
      eventTime: Math.floor(Date.now() / 1000),
      eventId: data.eventId,
      pageUrl: data.pageUrl,
      userData: data.userData,
      properties: {
        content_type: 'registration',
        value: 0,
        currency: 'USD',
      },
    });
  }

  /**
   * Track registration completed
   */
  async trackRegistrationCompleted(data: {
    eventId: string;
    pageUrl: string;
    userData?: TikTokUserData;
    value?: number;
    currency?: string;
  }): Promise<any> {
    return this.sendEvent({
      event: 'CompleteRegistration',
      eventTime: Math.floor(Date.now() / 1000),
      eventId: data.eventId,
      pageUrl: data.pageUrl,
      userData: data.userData,
      properties: {
        content_type: 'registration',
        value: data.value || 0,
        currency: data.currency || 'USD',
      },
    });
  }

  /**
   * Track subscription purchase (CompletePayment)
   */
  async trackPurchase(data: {
    eventId: string;
    pageUrl: string;
    userData?: TikTokUserData;
    value: number;
    currency: string;
    contentType?: string;
    contentId?: string;
    quantity?: number;
  }): Promise<any> {
    return this.sendEvent({
      event: 'CompletePayment',
      eventTime: Math.floor(Date.now() / 1000),
      eventId: data.eventId,
      pageUrl: data.pageUrl,
      userData: data.userData,
      properties: {
        content_type: data.contentType || 'subscription',
        content_id: data.contentId,
        value: data.value,
        currency: data.currency,
        quantity: data.quantity || 1,
      },
    });
  }

  /**
   * Track profile view (ViewContent)
   */
  async trackViewContent(data: {
    eventId: string;
    pageUrl: string;
    userData?: TikTokUserData;
    contentType?: string;
    contentId?: string;
    contentName?: string;
  }): Promise<any> {
    return this.sendEvent({
      event: 'ViewContent',
      eventTime: Math.floor(Date.now() / 1000),
      eventId: data.eventId,
      pageUrl: data.pageUrl,
      userData: data.userData,
      properties: {
        content_type: data.contentType || 'profile',
        content_id: data.contentId,
        content_name: data.contentName || 'Profile View',
      },
    });
  }

  /**
   * Track search
   */
  async trackSearch(data: {
    eventId: string;
    pageUrl: string;
    userData?: TikTokUserData;
    searchString?: string;
  }): Promise<any> {
    return this.sendEvent({
      event: 'Search',
      eventTime: Math.floor(Date.now() / 1000),
      eventId: data.eventId,
      pageUrl: data.pageUrl,
      userData: data.userData,
      properties: {
        query: data.searchString || '',
        content_type: 'user_search',
      },
    });
  }

  /**
   * Track add to cart (subscription plan)
   */
  async trackAddToCart(data: {
    eventId: string;
    pageUrl: string;
    userData?: TikTokUserData;
    contentType: string;
    contentId?: string;
    contentName: string;
    value: number;
    currency: string;
    quantity?: number;
  }): Promise<any> {
    return this.sendEvent({
      event: 'AddToCart',
      eventTime: Math.floor(Date.now() / 1000),
      eventId: data.eventId,
      pageUrl: data.pageUrl,
      userData: data.userData,
      properties: {
        content_type: data.contentType,
        content_id: data.contentId,
        content_name: data.contentName,
        value: data.value,
        currency: data.currency,
        quantity: data.quantity || 1,
      },
    });
  }

  /**
   * Track subscription (Subscribe)
   */
  async trackSubscribe(data: {
    eventId: string;
    pageUrl: string;
    userData?: TikTokUserData;
    value: number;
    currency: string;
  }): Promise<any> {
    return this.sendEvent({
      event: 'Subscribe',
      eventTime: Math.floor(Date.now() / 1000),
      eventId: data.eventId,
      pageUrl: data.pageUrl,
      userData: data.userData,
      properties: {
        content_type: 'premium_subscription',
        value: data.value,
        currency: data.currency,
      },
    });
  }

  /**
   * Track contact
   */
  async trackContact(data: {
    eventId: string;
    pageUrl: string;
    userData?: TikTokUserData;
  }): Promise<any> {
    return this.sendEvent({
      event: 'Contact',
      eventTime: Math.floor(Date.now() / 1000),
      eventId: data.eventId,
      pageUrl: data.pageUrl,
      userData: data.userData,
    });
  }

  /**
   * Track download (app download)
   */
  async trackDownload(data: {
    eventId: string;
    pageUrl: string;
    userData?: TikTokUserData;
    contentType?: string;
    contentId?: string;
  }): Promise<any> {
    return this.sendEvent({
      event: 'Download',
      eventTime: Math.floor(Date.now() / 1000),
      eventId: data.eventId,
      pageUrl: data.pageUrl,
      userData: data.userData,
      properties: {
        content_type: data.contentType || 'mobile_app',
        content_id: data.contentId,
      },
    });
  }

  /**
   * Track custom event
   */
  async trackCustomEvent(data: {
    event: string;
    eventId: string;
    pageUrl: string;
    userData?: TikTokUserData;
    properties?: Record<string, any>;
  }): Promise<any> {
    return this.sendEvent({
      event: data.event,
      eventTime: Math.floor(Date.now() / 1000),
      eventId: data.eventId,
      pageUrl: data.pageUrl,
      userData: data.userData,
      properties: data.properties,
    });
  }
}

/**
 * Create TikTok Events API instance
 */
export function createTikTokEventsAPI(config: TikTokEventsAPIConfig): TikTokEventsAPI {
  return new TikTokEventsAPI(config);
}

export default TikTokEventsAPI;
