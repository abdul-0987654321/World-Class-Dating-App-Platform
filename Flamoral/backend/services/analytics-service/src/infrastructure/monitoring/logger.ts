/**
 * Logger utility with Application Insights integration
 */

import { appInsights } from './app-insights';

enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

class Logger {
  private serviceName: string;

  constructor(serviceName: string = 'analytics-service') {
    this.serviceName = serviceName;
  }

  /**
   * Log an error message
   */
  error(message: string, error?: Error, context?: any): void {
    const logContext = {
      service: this.serviceName,
      timestamp: new Date().toISOString(),
      ...context,
    };

    // Only log to console in non-production environments
    if (process.env.NODE_ENV !== 'production') {
      console.error(`[ERROR] ${message}`, error || '', logContext);
    }

    if (error) {
      appInsights.trackException(error, logContext);
    } else {
      appInsights.trackTrace(message, LogLevel.ERROR, logContext);
    }
  }

  /**
   * Log a warning message
   */
  warn(message: string, context?: any): void {
    const logContext = {
      service: this.serviceName,
      timestamp: new Date().toISOString(),
      ...context,
    };

    // Only log to console in non-production environments
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[WARN] ${message}`, logContext);
    }
    appInsights.trackTrace(message, LogLevel.WARN, logContext);
  }

  /**
   * Log an info message
   */
  info(message: string, context?: any): void {
    const logContext = {
      service: this.serviceName,
      timestamp: new Date().toISOString(),
      ...context,
    };

    // Only log to console in non-production environments
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[INFO] ${message}`, logContext);
    }
    appInsights.trackTrace(message, LogLevel.INFO, logContext);
  }

  /**
   * Log a debug message
   */
  debug(message: string, context?: any): void {
    // Skip debug logging in production
    if (process.env.NODE_ENV === 'production') return;

    const logContext = {
      service: this.serviceName,
      timestamp: new Date().toISOString(),
      ...context,
    };

    console.log(`[DEBUG] ${message}`, logContext);
    appInsights.trackTrace(message, LogLevel.DEBUG, logContext);
  }

  /**
   * Track a custom event
   */
  trackEvent(eventName: string, properties?: any, measurements?: any): void {
    appInsights.trackEvent(eventName, properties, measurements);
  }

  /**
   * Track a custom metric
   */
  trackMetric(metricName: string, value: number, properties?: any): void {
    appInsights.trackMetric(metricName, value, properties);
  }

  /**
   * Track API request
   */
  trackRequest(
    name: string,
    url: string,
    duration: number,
    statusCode: number,
    success: boolean,
    properties?: any
  ): void {
    appInsights.trackRequest(name, url, duration, statusCode, success, properties);
  }
}

// Export singleton instance
export const logger = new Logger();
export default logger;
