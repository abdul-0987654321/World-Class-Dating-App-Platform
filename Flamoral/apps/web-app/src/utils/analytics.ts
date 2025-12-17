/**
 * Analytics Tracking Utility
 * Integrates Google Analytics and backend event tracking
 */

import axios from 'axios';

interface AnalyticsEvent {
  eventName: string;
  properties?: Record<string, any>;
  timestamp?: string;
}

interface PageViewEvent {
  page: string;
  title?: string;
  referrer?: string;
}

interface UserActionEvent {
  action: string;
  category?: string;
  label?: string;
  value?: number;
}

class Analytics {
  private apiUrl: string;
  private gaId: string | undefined;
  private enabled: boolean;
  private initialized: boolean = false;

  constructor() {
    this.apiUrl = import.meta.env.VITE_API_URL || 'https://api.flamoral.com';
    this.gaId = import.meta.env.VITE_GA_MEASUREMENT_ID;
    this.enabled = import.meta.env.VITE_ANALYTICS_ENABLED === 'true' || import.meta.env.MODE === 'production';
  }

  /**
   * Initialize Google Analytics
   * Call this once when the app loads
   */
  init(): void {
    if (this.initialized) return;

    if (!this.enabled) {
      console.info('[Analytics] Disabled in current environment');
      return;
    }

    // Initialize Google Analytics if ID is provided
    if (this.gaId) {
      this.initGoogleAnalytics();
    }

    this.initialized = true;
    console.info('[Analytics] Initialized successfully');
  }

  /**
   * Initialize Google Analytics gtag
   */
  private initGoogleAnalytics(): void {
    // Load gtag script
    const script = document.createElement('script');
    script.src = `https://www.googletagmanager.com/gtag/js?id=${this.gaId}`;
    script.async = true;
    document.head.appendChild(script);

    // Initialize gtag
    window.dataLayer = window.dataLayer || [];
    function gtag(...args: any[]) {
      window.dataLayer.push(args);
    }
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', this.gaId!);

    console.info('[Analytics] Google Analytics initialized:', this.gaId);
  }

  /**
   * Track page view
   * @param page - Page path
   * @param title - Page title (optional)
   */
  async trackPageView(page: string, title?: string): Promise<void> {
    if (!this.enabled) return;

    const event: PageViewEvent = {
      page,
      title: title || document.title,
      referrer: document.referrer,
    };

    // Google Analytics
    if (window.gtag) {
      window.gtag('event', 'page_view', {
        page_path: page,
        page_title: event.title,
      });
    }

    // Backend tracking
    try {
      await this.trackEvent('page_view', event);
    } catch (error) {
      console.error('[Analytics] Page view tracking error:', error);
    }
  }

  /**
   * Track custom event
   * @param eventName - Name of the event
   * @param properties - Event properties
   */
  async trackEvent(eventName: string, properties?: Record<string, any>): Promise<void> {
    if (!this.enabled) return;

    const event: AnalyticsEvent = {
      eventName,
      properties,
      timestamp: new Date().toISOString(),
    };

    // Google Analytics
    if (window.gtag) {
      window.gtag('event', eventName, properties);
    }

    // Backend tracking
    try {
      await axios.post(
        `${this.apiUrl}/api/v1/api/analytics/events`,
        event,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    } catch (error) {
      // Silently fail - don't disrupt user experience
      console.debug('[Analytics] Event tracking error:', error);
    }
  }

  /**
   * Track user action
   * @param action - Action name
   * @param category - Action category (optional)
   * @param label - Action label (optional)
   * @param value - Numeric value (optional)
   */
  async trackAction(
    action: string,
    category?: string,
    label?: string,
    value?: number
  ): Promise<void> {
    if (!this.enabled) return;

    const event: UserActionEvent = {
      action,
      category,
      label,
      value,
    };

    // Google Analytics
    if (window.gtag) {
      window.gtag('event', action, {
        event_category: category,
        event_label: label,
        value: value,
      });
    }

    // Backend tracking
    try {
      await axios.post(`${this.apiUrl}/api/v1/api/analytics/actions`, {
        action,
        category,
        label,
        value,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.debug('[Analytics] Action tracking error:', error);
    }
  }

  /**
   * Track match event (swipe, match created, etc.)
   * @param matchedUserId - ID of the matched user
   * @param action - Type of match action
   */
  async trackMatch(
    matchedUserId: string,
    action: 'swipe_right' | 'swipe_left' | 'match_created' | 'match_deleted'
  ): Promise<void> {
    return this.trackEvent(`match_${action}`, {
      matchedUserId,
      action,
    });
  }

  /**
   * Track message event
   * @param conversationId - ID of the conversation
   * @param action - Type of message action
   */
  async trackMessage(
    conversationId: string,
    action: 'sent' | 'received' | 'read'
  ): Promise<void> {
    return this.trackEvent(`message_${action}`, {
      conversationId,
      action,
    });
  }

  /**
   * Track profile view
   * @param profileId - ID of the viewed profile
   * @param source - Where the view came from
   */
  async trackProfileView(profileId: string, source?: string): Promise<void> {
    return this.trackEvent('profile_view', {
      profileId,
      source,
    });
  }

  /**
   * Track subscription event
   * @param planId - ID of the subscription plan
   * @param action - Type of subscription action
   */
  async trackSubscription(
    planId: string,
    action: 'started' | 'upgraded' | 'downgraded' | 'cancelled'
  ): Promise<void> {
    return this.trackEvent(`subscription_${action}`, {
      planId,
      action,
    });
  }

  /**
   * Track conversion event
   * @param conversionType - Type of conversion
   * @param value - Conversion value (optional)
   */
  async trackConversion(conversionType: string, value?: number): Promise<void> {
    return this.trackEvent('conversion', {
      conversionType,
      value,
    });
  }

  /**
   * Track error event
   * @param error - Error object or message
   * @param context - Additional context
   */
  async trackError(error: Error | string, context?: Record<string, any>): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : error;
    const errorStack = error instanceof Error ? error.stack : undefined;

    return this.trackEvent('error', {
      message: errorMessage,
      stack: errorStack,
      ...context,
    });
  }

  /**
   * Track search event
   * @param query - Search query
   * @param results - Number of results (optional)
   */
  async trackSearch(query: string, results?: number): Promise<void> {
    return this.trackEvent('search', {
      query,
      results,
    });
  }

  /**
   * Track timing event (for performance monitoring)
   * @param category - Timing category
   * @param variable - Timing variable name
   * @param time - Time in milliseconds
   */
  async trackTiming(category: string, variable: string, time: number): Promise<void> {
    if (window.gtag) {
      window.gtag('event', 'timing_complete', {
        name: variable,
        value: time,
        event_category: category,
      });
    }

    return this.trackEvent('timing', {
      category,
      variable,
      time,
    });
  }

  /**
   * Set user ID for tracking
   * @param userId - User ID
   */
  setUserId(userId: string): void {
    if (!this.enabled) return;

    if (window.gtag && this.gaId) {
      window.gtag('config', this.gaId, {
        user_id: userId,
      });
    }
  }

  /**
   * Set user properties
   * @param properties - User properties
   */
  setUserProperties(properties: Record<string, any>): void {
    if (!this.enabled) return;

    if (window.gtag) {
      window.gtag('set', 'user_properties', properties);
    }
  }
}

// Export singleton instance
export const analytics = new Analytics();

// Type declarations for Google Analytics
declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

// Export types for use in other files
export type {
  AnalyticsEvent,
  PageViewEvent,
  UserActionEvent,
};
