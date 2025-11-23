/**
 * Unified Analytics Client
 * Combines GTM data layer with server-side analytics API tracking
 */

import {
  pushToDataLayer,
  getUtmParameters,
  getClickIds,
  getStoredUtmParameters,
  getStoredClickIds,
} from './gtm-data-layer';

interface AnalyticsConfig {
  apiUrl: string; // Analytics service API URL
  gtmEnabled?: boolean;
  serverSideEnabled?: boolean;
}

interface TrackingData {
  userId?: string;
  sessionId?: string;
  [key: string]: any;
}

class AnalyticsClient {
  private config: AnalyticsConfig;
  private sessionId: string;

  constructor(config: AnalyticsConfig) {
    this.config = {
      gtmEnabled: true,
      serverSideEnabled: true,
      ...config,
    };
    this.sessionId = this.getOrCreateSessionId();
  }

  /**
   * Get or create session ID
   */
  private getOrCreateSessionId(): string {
    if (typeof window === 'undefined' || !window.sessionStorage) {
      return `session_${Date.now()}_${Math.random()}`;
    }

    let sessionId = sessionStorage.getItem('analytics_session_id');

    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      sessionStorage.setItem('analytics_session_id', sessionId);
    }

    return sessionId;
  }

  /**
   * Send event to server-side analytics API
   */
  private async sendToAPI(endpoint: string, data: any): Promise<void> {
    if (!this.config.serverSideEnabled) {
      return;
    }

    try {
      const response = await fetch(`${this.config.apiUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        console.error('Analytics API error:', response.statusText);
      }
    } catch (error) {
      console.error('Failed to send analytics event:', error);
    }
  }

  /**
   * Track event (both GTM and server-side)
   */
  async trackEvent(
    eventType: string,
    eventName: string,
    data: TrackingData = {}
  ): Promise<void> {
    const utmParams = { ...getStoredUtmParameters(), ...getUtmParameters() };
    const clickIds = { ...getStoredClickIds(), ...getClickIds() };

    const eventData = {
      sessionId: this.sessionId,
      eventType,
      eventName,
      ...data,
      ...utmParams,
      clickIds: Object.keys(clickIds).length > 0 ? clickIds : undefined,
      pageUrl: typeof window !== 'undefined' ? window.location.href : undefined,
      referrerUrl: typeof document !== 'undefined' ? document.referrer : undefined,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    };

    // Push to GTM data layer
    if (this.config.gtmEnabled) {
      pushToDataLayer(eventName, eventData);
    }

    // Send to analytics API
    if (this.config.serverSideEnabled) {
      await this.sendToAPI('/api/tracking/event', eventData);
    }
  }

  /**
   * Track page view
   */
  async trackPageView(pageUrl?: string, pageTitle?: string): Promise<void> {
    const url = pageUrl || (typeof window !== 'undefined' ? window.location.pathname : '/');
    const title = pageTitle || (typeof document !== 'undefined' ? document.title : '');

    await this.trackEvent('page_view', 'page_view', {
      pageUrl: url,
      pageTitle: title,
    });
  }

  /**
   * Track registration started
   */
  async trackRegistrationStarted(data: {
    method?: string;
    source?: string;
    campaign?: string;
  } = {}): Promise<void> {
    await this.trackEvent('registration', 'registration_started', data);

    // Create funnel entry
    if (this.config.serverSideEnabled) {
      const utmParams = { ...getStoredUtmParameters(), ...getUtmParameters() };
      await this.sendToAPI('/api/tracking/session', {
        sessionId: this.sessionId,
        utmSource: utmParams.utm_source,
        utmCampaign: utmParams.utm_campaign,
      });
    }
  }

  /**
   * Track registration completed
   */
  async trackRegistrationCompleted(data: {
    userId: string;
    method: string;
    timeSpent?: number;
  }): Promise<void> {
    await this.trackEvent('registration', 'registration_completed', data);

    // Update funnel
    if (this.config.serverSideEnabled) {
      await this.sendToAPI('/api/tracking/funnel/step', {
        sessionId: this.sessionId,
        userId: data.userId,
        step: 'registrationCompletedAt',
      });

      // Create attribution
      const utmParams = { ...getStoredUtmParameters(), ...getUtmParameters() };
      const clickIds = { ...getStoredClickIds(), ...getClickIds() };

      await this.sendToAPI('/api/tracking/attribution', {
        userId: data.userId,
        source: utmParams.utm_source,
        medium: utmParams.utm_medium,
        campaign: utmParams.utm_campaign,
        content: utmParams.utm_content,
        clickId: clickIds,
        landingPage: typeof window !== 'undefined' ? window.location.pathname : undefined,
        referrer: typeof document !== 'undefined' ? document.referrer : undefined,
      });
    }
  }

  /**
   * Track email verified
   */
  async trackEmailVerified(userId: string): Promise<void> {
    await this.trackEvent('registration', 'email_verified', { userId });

    if (this.config.serverSideEnabled) {
      await this.sendToAPI('/api/tracking/funnel/step', {
        sessionId: this.sessionId,
        userId,
        step: 'emailVerifiedAt',
      });
    }
  }

  /**
   * Track profile started
   */
  async trackProfileStarted(userId: string): Promise<void> {
    await this.trackEvent('profile', 'profile_started', { userId });

    if (this.config.serverSideEnabled) {
      await this.sendToAPI('/api/tracking/funnel/step', {
        sessionId: this.sessionId,
        userId,
        step: 'profileStartedAt',
      });
    }
  }

  /**
   * Track profile completed
   */
  async trackProfileCompleted(data: {
    userId: string;
    completeness: number;
    hasPhoto: boolean;
    timeSpent?: number;
  }): Promise<void> {
    await this.trackEvent('profile', 'profile_completed', data);

    if (this.config.serverSideEnabled) {
      await this.sendToAPI('/api/tracking/funnel/step', {
        sessionId: this.sessionId,
        userId: data.userId,
        step: 'profileCompletedAt',
      });
    }
  }

  /**
   * Track photo uploaded
   */
  async trackPhotoUploaded(data: {
    userId: string;
    photoCount: number;
  }): Promise<void> {
    await this.trackEvent('profile', 'photo_uploaded', data);

    if (this.config.serverSideEnabled) {
      await this.sendToAPI('/api/tracking/funnel/step', {
        sessionId: this.sessionId,
        userId: data.userId,
        step: 'photoUploadedAt',
      });
    }
  }

  /**
   * Track first match
   */
  async trackFirstMatch(data: {
    userId: string;
    matchId: string;
    timeSinceRegistration?: number;
  }): Promise<void> {
    await this.trackEvent('engagement', 'first_match', data);

    if (this.config.serverSideEnabled) {
      await this.sendToAPI('/api/tracking/funnel/step', {
        sessionId: this.sessionId,
        userId: data.userId,
        step: 'firstMatchAt',
      });
    }
  }

  /**
   * Track subscription purchased
   */
  async trackSubscriptionPurchased(data: {
    userId: string;
    plan: string;
    amount: number;
    currency: string;
    timeSinceRegistration?: number;
  }): Promise<void> {
    await this.trackEvent('conversion', 'subscription_purchased', {
      ...data,
      value: data.amount,
      transaction_id: `sub_${Date.now()}`,
    });

    if (this.config.serverSideEnabled) {
      await this.sendToAPI('/api/tracking/funnel/step', {
        sessionId: this.sessionId,
        userId: data.userId,
        step: 'subscriptionPurchasedAt',
      });
    }
  }

  /**
   * Track custom event
   */
  async trackCustomEvent(
    eventType: string,
    eventName: string,
    data: TrackingData = {}
  ): Promise<void> {
    await this.trackEvent(eventType, eventName, data);
  }

  /**
   * Get current session ID
   */
  getSessionId(): string {
    return this.sessionId;
  }
}

// Export singleton instance
let analyticsInstance: AnalyticsClient | null = null;

export function initializeAnalytics(config: AnalyticsConfig): AnalyticsClient {
  analyticsInstance = new AnalyticsClient(config);
  return analyticsInstance;
}

export function getAnalytics(): AnalyticsClient {
  if (!analyticsInstance) {
    throw new Error('Analytics not initialized. Call initializeAnalytics() first.');
  }
  return analyticsInstance;
}

export { AnalyticsClient };
export default AnalyticsClient;
