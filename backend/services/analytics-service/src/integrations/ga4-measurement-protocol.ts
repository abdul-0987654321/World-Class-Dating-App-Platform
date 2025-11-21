/**
 * Google Analytics 4 Measurement Protocol
 * Server-side event tracking for GA4
 * Bypasses ad blockers and provides more accurate data
 */

interface GA4Config {
  measurementId: string; // GA4 Measurement ID (G-XXXXXXXXXX)
  apiSecret: string; // API Secret from GA4 Admin
}

interface GA4UserProperties {
  userId?: string;
  sessionId?: string;
  [key: string]: any;
}

interface GA4EventParams {
  [key: string]: any;
}

interface GA4Event {
  name: string;
  params: GA4EventParams;
}

interface GA4MeasurementRequest {
  clientId: string; // Unique client identifier
  userId?: string;
  timestampMicros?: string;
  userProperties?: GA4UserProperties;
  events: GA4Event[];
}

export class GA4MeasurementProtocol {
  private config: GA4Config;
  private apiUrl: string;
  private validationUrl: string;

  constructor(config: GA4Config) {
    this.config = config;
    this.apiUrl = `https://www.google-analytics.com/mp/collect?measurement_id=${config.measurementId}&api_secret=${config.apiSecret}`;
    this.validationUrl = `https://www.google-analytics.com/debug/mp/collect?measurement_id=${config.measurementId}&api_secret=${config.apiSecret}`;
  }

  /**
   * Send event(s) to GA4
   */
  async sendEvent(
    clientId: string,
    events: GA4Event[],
    options?: {
      userId?: string;
      sessionId?: string;
      userProperties?: GA4UserProperties;
      validate?: boolean;
    }
  ): Promise<{
    success: boolean;
    validationMessages?: any[];
    error?: string;
  }> {
    try {
      const payload: GA4MeasurementRequest = {
        client_id: clientId,
        events: events,
      };

      // Add optional fields
      if (options?.userId) {
        payload.user_id = options.userId;
      }

      if (options?.userProperties) {
        payload.user_properties = {};
        Object.keys(options.userProperties).forEach((key) => {
          payload.user_properties![key] = {
            value: options.userProperties![key],
          };
        });
      }

      const url = options?.validate ? this.validationUrl : this.apiUrl;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (options?.validate) {
        const result = await response.json();
        console.log('GA4 Validation Result:', result);
        return {
          success: result.validationMessages?.length === 0,
          validationMessages: result.validationMessages,
        };
      }

      if (!response.ok) {
        console.error('GA4 Measurement Protocol error:', response.statusText);
        return {
          success: false,
          error: response.statusText,
        };
      }

      console.log('GA4 events sent successfully:', events.map((e) => e.name).join(', '));
      return { success: true };
    } catch (error: any) {
      console.error('GA4 Measurement Protocol request failed:', error);
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
    clientId: string;
    userId?: string;
    sessionId?: string;
    pageLocation: string;
    pageTitle?: string;
    pageReferrer?: string;
  }): Promise<any> {
    return this.sendEvent(
      data.clientId,
      [
        {
          name: 'page_view',
          params: {
            page_location: data.pageLocation,
            page_title: data.pageTitle || '',
            page_referrer: data.pageReferrer || '',
            engagement_time_msec: 100,
          },
        },
      ],
      {
        userId: data.userId,
        sessionId: data.sessionId,
      }
    );
  }

  /**
   * Track sign up (registration started)
   */
  async trackSignUp(data: {
    clientId: string;
    userId?: string;
    sessionId?: string;
    method: string;
  }): Promise<any> {
    return this.sendEvent(
      data.clientId,
      [
        {
          name: 'sign_up',
          params: {
            method: data.method,
          },
        },
      ],
      {
        userId: data.userId,
        sessionId: data.sessionId,
      }
    );
  }

  /**
   * Track login
   */
  async trackLogin(data: {
    clientId: string;
    userId: string;
    sessionId?: string;
    method: string;
  }): Promise<any> {
    return this.sendEvent(
      data.clientId,
      [
        {
          name: 'login',
          params: {
            method: data.method,
          },
        },
      ],
      {
        userId: data.userId,
        sessionId: data.sessionId,
      }
    );
  }

  /**
   * Track purchase (subscription)
   */
  async trackPurchase(data: {
    clientId: string;
    userId: string;
    sessionId?: string;
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
  }): Promise<any> {
    return this.sendEvent(
      data.clientId,
      [
        {
          name: 'purchase',
          params: {
            transaction_id: data.transactionId,
            value: data.value,
            currency: data.currency,
            coupon: data.coupon,
            items: data.items,
          },
        },
      ],
      {
        userId: data.userId,
        sessionId: data.sessionId,
      }
    );
  }

  /**
   * Track begin checkout (subscription flow started)
   */
  async trackBeginCheckout(data: {
    clientId: string;
    userId: string;
    sessionId?: string;
    value: number;
    currency: string;
    items: Array<{
      item_id: string;
      item_name: string;
      price: number;
    }>;
  }): Promise<any> {
    return this.sendEvent(
      data.clientId,
      [
        {
          name: 'begin_checkout',
          params: {
            value: data.value,
            currency: data.currency,
            items: data.items,
          },
        },
      ],
      {
        userId: data.userId,
        sessionId: data.sessionId,
      }
    );
  }

  /**
   * Track view item (profile view)
   */
  async trackViewItem(data: {
    clientId: string;
    userId?: string;
    sessionId?: string;
    items: Array<{
      item_id: string;
      item_name: string;
      item_category?: string;
    }>;
  }): Promise<any> {
    return this.sendEvent(
      data.clientId,
      [
        {
          name: 'view_item',
          params: {
            items: data.items,
          },
        },
      ],
      {
        userId: data.userId,
        sessionId: data.sessionId,
      }
    );
  }

  /**
   * Track search
   */
  async trackSearch(data: {
    clientId: string;
    userId?: string;
    sessionId?: string;
    searchTerm: string;
  }): Promise<any> {
    return this.sendEvent(
      data.clientId,
      [
        {
          name: 'search',
          params: {
            search_term: data.searchTerm,
          },
        },
      ],
      {
        userId: data.userId,
        sessionId: data.sessionId,
      }
    );
  }

  /**
   * Track user engagement
   */
  async trackUserEngagement(data: {
    clientId: string;
    userId?: string;
    sessionId?: string;
    engagementTimeMsec: number;
  }): Promise<any> {
    return this.sendEvent(
      data.clientId,
      [
        {
          name: 'user_engagement',
          params: {
            engagement_time_msec: data.engagementTimeMsec,
          },
        },
      ],
      {
        userId: data.userId,
        sessionId: data.sessionId,
      }
    );
  }

  /**
   * Track custom event
   */
  async trackCustomEvent(data: {
    clientId: string;
    userId?: string;
    sessionId?: string;
    eventName: string;
    eventParams?: GA4EventParams;
    userProperties?: GA4UserProperties;
  }): Promise<any> {
    return this.sendEvent(
      data.clientId,
      [
        {
          name: data.eventName,
          params: data.eventParams || {},
        },
      ],
      {
        userId: data.userId,
        sessionId: data.sessionId,
        userProperties: data.userProperties,
      }
    );
  }

  /**
   * Track multiple events in a batch
   */
  async trackBatch(data: {
    clientId: string;
    userId?: string;
    sessionId?: string;
    events: GA4Event[];
    userProperties?: GA4UserProperties;
  }): Promise<any> {
    return this.sendEvent(data.clientId, data.events, {
      userId: data.userId,
      sessionId: data.sessionId,
      userProperties: data.userProperties,
    });
  }

  /**
   * Set user properties
   */
  async setUserProperties(data: {
    clientId: string;
    userId: string;
    properties: {
      [key: string]: string | number | boolean;
    };
  }): Promise<any> {
    return this.sendEvent(
      data.clientId,
      [
        {
          name: 'user_engagement',
          params: {
            engagement_time_msec: 1,
          },
        },
      ],
      {
        userId: data.userId,
        userProperties: data.properties,
      }
    );
  }
}

/**
 * Create GA4 Measurement Protocol instance
 */
export function createGA4MeasurementProtocol(config: GA4Config): GA4MeasurementProtocol {
  return new GA4MeasurementProtocol(config);
}

export default GA4MeasurementProtocol;
