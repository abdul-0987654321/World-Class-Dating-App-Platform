/**
 * Meta Conversions API (CAPI) - Server-Side Tracking
 * Bypasses ad blockers and provides more accurate conversion data
 */

import crypto from 'crypto';

interface MetaCAPIConfig {
  pixelId: string;
  accessToken: string;
  testEventCode?: string; // For testing in Events Manager
}

interface UserData {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  gender?: 'm' | 'f';
  dateOfBirth?: string; // YYYYMMDD format
  externalId?: string; // Your internal user ID
  clientIpAddress?: string;
  clientUserAgent?: string;
  fbc?: string; // Facebook click ID cookie
  fbp?: string; // Facebook browser ID cookie
}

interface EventData {
  eventName: string;
  eventTime: number; // Unix timestamp in seconds
  eventId: string; // Deduplication ID
  eventSourceUrl: string;
  actionSource: 'website' | 'email' | 'app' | 'phone_call' | 'chat' | 'physical_store' | 'system_generated' | 'other';
  userData: UserData;
  customData?: Record<string, any>;
}

export class MetaConversionsAPI {
  private config: MetaCAPIConfig;
  private apiUrl: string;

  constructor(config: MetaCAPIConfig) {
    this.config = config;
    this.apiUrl = `https://graph.facebook.com/v18.0/${config.pixelId}/events`;
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
  private normalizeUserData(userData: UserData): Record<string, any> {
    const normalized: Record<string, any> = {};

    if (userData.email) {
      normalized.em = this.hashData(userData.email);
    }
    if (userData.phone) {
      // Remove non-numeric characters
      const phone = userData.phone.replace(/\D/g, '');
      normalized.ph = this.hashData(phone);
    }
    if (userData.firstName) {
      normalized.fn = this.hashData(userData.firstName);
    }
    if (userData.lastName) {
      normalized.ln = this.hashData(userData.lastName);
    }
    if (userData.city) {
      normalized.ct = this.hashData(userData.city);
    }
    if (userData.state) {
      normalized.st = this.hashData(userData.state);
    }
    if (userData.zipCode) {
      normalized.zp = this.hashData(userData.zipCode);
    }
    if (userData.country) {
      normalized.country = this.hashData(userData.country);
    }
    if (userData.gender) {
      normalized.ge = this.hashData(userData.gender);
    }
    if (userData.dateOfBirth) {
      normalized.db = this.hashData(userData.dateOfBirth);
    }
    if (userData.externalId) {
      normalized.external_id = this.hashData(userData.externalId);
    }

    // These don't need hashing
    if (userData.clientIpAddress) {
      normalized.client_ip_address = userData.clientIpAddress;
    }
    if (userData.clientUserAgent) {
      normalized.client_user_agent = userData.clientUserAgent;
    }
    if (userData.fbc) {
      normalized.fbc = userData.fbc;
    }
    if (userData.fbp) {
      normalized.fbp = userData.fbp;
    }

    return normalized;
  }

  /**
   * Send event to Meta Conversions API
   */
  async sendEvent(eventData: EventData): Promise<{
    success: boolean;
    eventId: string;
    error?: string;
  }> {
    try {
      const payload = {
        data: [
          {
            event_name: eventData.eventName,
            event_time: eventData.eventTime,
            event_id: eventData.eventId,
            event_source_url: eventData.eventSourceUrl,
            action_source: eventData.actionSource,
            user_data: this.normalizeUserData(eventData.userData),
            custom_data: eventData.customData || {},
          },
        ],
        access_token: this.config.accessToken,
        ...(this.config.testEventCode && { test_event_code: this.config.testEventCode }),
      };

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('Meta CAPI error:', result);
        return {
          success: false,
          eventId: eventData.eventId,
          error: result.error?.message || 'Unknown error',
        };
      }

      console.log('Meta CAPI event sent successfully:', eventData.eventName);
      return {
        success: true,
        eventId: eventData.eventId,
      };
    } catch (error: any) {
      console.error('Meta CAPI request failed:', error);
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
    eventSourceUrl: string;
    userData: UserData;
  }): Promise<any> {
    return this.sendEvent({
      eventName: 'PageView',
      eventTime: Math.floor(Date.now() / 1000),
      eventId: data.eventId,
      eventSourceUrl: data.eventSourceUrl,
      actionSource: 'website',
      userData: data.userData,
    });
  }

  /**
   * Track registration started (Lead)
   */
  async trackRegistrationStarted(data: {
    eventId: string;
    eventSourceUrl: string;
    userData: UserData;
  }): Promise<any> {
    return this.sendEvent({
      eventName: 'Lead',
      eventTime: Math.floor(Date.now() / 1000),
      eventId: data.eventId,
      eventSourceUrl: data.eventSourceUrl,
      actionSource: 'website',
      userData: data.userData,
      customData: {
        content_name: 'User Registration',
        content_category: 'registration',
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
    eventSourceUrl: string;
    userData: UserData;
    value?: number;
    currency?: string;
  }): Promise<any> {
    return this.sendEvent({
      eventName: 'CompleteRegistration',
      eventTime: Math.floor(Date.now() / 1000),
      eventId: data.eventId,
      eventSourceUrl: data.eventSourceUrl,
      actionSource: 'website',
      userData: data.userData,
      customData: {
        content_name: 'User Registration',
        value: data.value || 0,
        currency: data.currency || 'USD',
        status: 'completed',
      },
    });
  }

  /**
   * Track subscription purchase
   */
  async trackPurchase(data: {
    eventId: string;
    eventSourceUrl: string;
    userData: UserData;
    value: number;
    currency: string;
    contentName?: string;
    contentIds?: string[];
  }): Promise<any> {
    return this.sendEvent({
      eventName: 'Purchase',
      eventTime: Math.floor(Date.now() / 1000),
      eventId: data.eventId,
      eventSourceUrl: data.eventSourceUrl,
      actionSource: 'website',
      userData: data.userData,
      customData: {
        content_name: data.contentName || 'Premium Subscription',
        content_type: 'subscription',
        content_ids: data.contentIds || [],
        value: data.value,
        currency: data.currency,
        num_items: 1,
      },
    });
  }

  /**
   * Track profile view
   */
  async trackViewContent(data: {
    eventId: string;
    eventSourceUrl: string;
    userData: UserData;
    contentName?: string;
    contentIds?: string[];
  }): Promise<any> {
    return this.sendEvent({
      eventName: 'ViewContent',
      eventTime: Math.floor(Date.now() / 1000),
      eventId: data.eventId,
      eventSourceUrl: data.eventSourceUrl,
      actionSource: 'website',
      userData: data.userData,
      customData: {
        content_name: data.contentName || 'Profile View',
        content_category: 'profile',
        content_ids: data.contentIds || [],
        value: 0,
        currency: 'USD',
      },
    });
  }

  /**
   * Track search
   */
  async trackSearch(data: {
    eventId: string;
    eventSourceUrl: string;
    userData: UserData;
    searchString?: string;
  }): Promise<any> {
    return this.sendEvent({
      eventName: 'Search',
      eventTime: Math.floor(Date.now() / 1000),
      eventId: data.eventId,
      eventSourceUrl: data.eventSourceUrl,
      actionSource: 'website',
      userData: data.userData,
      customData: {
        search_string: data.searchString || '',
        content_category: 'user_search',
      },
    });
  }

  /**
   * Track add to cart (subscription plan)
   */
  async trackAddToCart(data: {
    eventId: string;
    eventSourceUrl: string;
    userData: UserData;
    contentName: string;
    value: number;
    currency: string;
    contentIds?: string[];
  }): Promise<any> {
    return this.sendEvent({
      eventName: 'AddToCart',
      eventTime: Math.floor(Date.now() / 1000),
      eventId: data.eventId,
      eventSourceUrl: data.eventSourceUrl,
      actionSource: 'website',
      userData: data.userData,
      customData: {
        content_name: data.contentName,
        content_type: 'subscription',
        content_ids: data.contentIds || [],
        value: data.value,
        currency: data.currency,
      },
    });
  }

  /**
   * Track initiate checkout
   */
  async trackInitiateCheckout(data: {
    eventId: string;
    eventSourceUrl: string;
    userData: UserData;
    value: number;
    currency: string;
    contentIds?: string[];
  }): Promise<any> {
    return this.sendEvent({
      eventName: 'InitiateCheckout',
      eventTime: Math.floor(Date.now() / 1000),
      eventId: data.eventId,
      eventSourceUrl: data.eventSourceUrl,
      actionSource: 'website',
      userData: data.userData,
      customData: {
        content_category: 'subscription',
        content_ids: data.contentIds || [],
        num_items: 1,
        value: data.value,
        currency: data.currency,
      },
    });
  }

  /**
   * Track custom event
   */
  async trackCustomEvent(data: {
    eventName: string;
    eventId: string;
    eventSourceUrl: string;
    userData: UserData;
    customData?: Record<string, any>;
  }): Promise<any> {
    return this.sendEvent({
      eventName: data.eventName,
      eventTime: Math.floor(Date.now() / 1000),
      eventId: data.eventId,
      eventSourceUrl: data.eventSourceUrl,
      actionSource: 'website',
      userData: data.userData,
      customData: data.customData,
    });
  }
}

/**
 * Create Meta CAPI instance
 */
export function createMetaCAPI(config: MetaCAPIConfig): MetaConversionsAPI {
  return new MetaConversionsAPI(config);
}

export default MetaConversionsAPI;
