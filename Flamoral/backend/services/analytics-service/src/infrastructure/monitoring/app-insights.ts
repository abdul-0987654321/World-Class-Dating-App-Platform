/**
 * Azure Application Insights Integration
 * Provides telemetry tracking for the analytics service
 */

import config from '../../config';

interface TelemetryClient {
  trackEvent(event: { name: string; properties?: any; measurements?: any }): void;
  trackMetric(metric: { name: string; value: number; properties?: any }): void;
  trackException(exception: { exception: Error; properties?: any }): void;
  trackTrace(trace: { message: string; severity?: number; properties?: any }): void;
  trackRequest(request: {
    name: string;
    url: string;
    duration: number;
    resultCode: number;
    success: boolean;
    properties?: any;
  }): void;
  flush(): void;
}

class ApplicationInsights {
  private client: TelemetryClient | null = null;
  private enabled: boolean = false;

  /**
   * Initialize Application Insights
   */
  initialize(): void {
    const connectionString = config.monitoring?.appInsightsConnectionString;

    if (!connectionString) {
      if (process.env.NODE_ENV === 'production') {
        console.warn('Application Insights connection string not configured - telemetry disabled in production');
      }
      return;
    }

    try {
      // Dynamically import applicationinsights only if connection string is provided
      // This allows the service to run without Application Insights installed
      const appInsights = require('applicationinsights');

      appInsights.setup(connectionString)
        .setAutoDependencyCorrelation(true)
        .setAutoCollectRequests(true)
        .setAutoCollectPerformance(true, true)
        .setAutoCollectExceptions(true)
        .setAutoCollectDependencies(true)
        .setAutoCollectConsole(false) // Disable console collection to avoid duplication
        .setUseDiskRetryCaching(true)
        .setSendLiveMetrics(process.env.NODE_ENV === 'production') // Only enable live metrics in production
        .setInternalLogging(false, false) // Disable internal logging
        .start();

      this.client = appInsights.defaultClient;

      // Configure sampling for production
      if (process.env.NODE_ENV === 'production' && this.client) {
        this.client.config.samplingPercentage = 10; // Sample 10% of telemetry in production
      }

      this.enabled = true;

      if (process.env.NODE_ENV !== 'production') {
        console.log('Application Insights initialized successfully');
      }
    } catch (error) {
      console.error('Failed to initialize Application Insights:', error);
      if (process.env.NODE_ENV === 'production') {
        // In production, log this as a critical error since monitoring is essential
        console.error('CRITICAL: Service running without telemetry monitoring');
      }
    }
  }

  /**
   * Track a custom event
   */
  trackEvent(name: string, properties?: any, measurements?: any): void {
    if (!this.enabled || !this.client) return;

    try {
      this.client.trackEvent({ name, properties, measurements });
    } catch (error) {
      console.error('Failed to track event:', error);
    }
  }

  /**
   * Track a custom metric
   */
  trackMetric(name: string, value: number, properties?: any): void {
    if (!this.enabled || !this.client) return;

    try {
      this.client.trackMetric({ name, value, properties });
    } catch (error) {
      console.error('Failed to track metric:', error);
    }
  }

  /**
   * Track an exception
   */
  trackException(exception: Error, properties?: any): void {
    if (!this.enabled || !this.client) return;

    try {
      this.client.trackException({ exception, properties });
    } catch (error) {
      console.error('Failed to track exception:', error);
    }
  }

  /**
   * Track a trace/log message
   */
  trackTrace(message: string, severity: number = 1, properties?: any): void {
    if (!this.enabled || !this.client) return;

    try {
      this.client.trackTrace({ message, severity, properties });
    } catch (error) {
      console.error('Failed to track trace:', error);
    }
  }

  /**
   * Track a custom request
   */
  trackRequest(
    name: string,
    url: string,
    duration: number,
    resultCode: number,
    success: boolean,
    properties?: any
  ): void {
    if (!this.enabled || !this.client) return;

    try {
      this.client.trackRequest({
        name,
        url,
        duration,
        resultCode,
        success,
        properties,
      });
    } catch (error) {
      console.error('Failed to track request:', error);
    }
  }

  /**
   * Flush all pending telemetry
   */
  flush(): void {
    if (!this.enabled || !this.client) return;

    try {
      this.client.flush();
    } catch (error) {
      console.error('Failed to flush telemetry:', error);
    }
  }

  /**
   * Check if Application Insights is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}

// Export singleton instance
export const appInsights = new ApplicationInsights();
export default appInsights;
