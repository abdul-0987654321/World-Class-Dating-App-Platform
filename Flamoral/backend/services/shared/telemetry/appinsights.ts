import * as appInsights from 'applicationinsights';
import { Logger } from '@nestjs/common';

/**
 * Application Insights Configuration
 * Provides centralized telemetry and monitoring for the platform
 */
export class ApplicationInsightsService {
  private static instance: ApplicationInsightsService;
  private readonly logger = new Logger(ApplicationInsightsService.name);
  private client: appInsights.TelemetryClient | null = null;
  private initialized = false;

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): ApplicationInsightsService {
    if (!ApplicationInsightsService.instance) {
      ApplicationInsightsService.instance = new ApplicationInsightsService();
    }
    return ApplicationInsightsService.instance;
  }

  /**
   * Initialize Application Insights SDK
   * @param serviceName - Name of the service (e.g., 'api-gateway', 'user-service')
   * @param connectionString - Azure Application Insights connection string
   */
  public initialize(serviceName: string, connectionString?: string): void {
    if (this.initialized) {
      this.logger.warn('Application Insights already initialized');
      return;
    }

    // Skip initialization if no connection string provided
    if (!connectionString) {
      if (process.env.NODE_ENV === 'production') {
        this.logger.error(
          'CRITICAL: Application Insights connection string not provided in production. Telemetry disabled.',
        );
      } else {
        this.logger.warn(
          'Application Insights connection string not provided. Telemetry disabled.',
        );
      }
      return;
    }

    try {
      // Setup Application Insights with connection string
      const isProduction = process.env.NODE_ENV === 'production';

      appInsights
        .setup(connectionString)
        .setAutoDependencyCorrelation(true) // Enable automatic correlation of dependencies
        .setAutoCollectRequests(true) // Collect HTTP requests
        .setAutoCollectPerformance(true, true) // Collect performance metrics
        .setAutoCollectExceptions(true) // Collect exceptions
        .setAutoCollectDependencies(true) // Collect dependencies (DB, HTTP calls)
        .setAutoCollectConsole(false, false) // Disable console collection to avoid duplication
        .setAutoCollectHeartbeat(true) // Send heartbeat metrics
        .setUseDiskRetryCaching(true) // Retry failed uploads from disk
        .setSendLiveMetrics(isProduction) // Only enable live metrics in production
        .setDistributedTracingMode(appInsights.DistributedTracingModes.AI_AND_W3C) // W3C trace context
        .setInternalLogging(false, false); // Disable internal logging

      // Start Application Insights
      appInsights.start();

      this.client = appInsights.defaultClient;

      // Configure sampling for production (10% sampling to reduce costs)
      if (isProduction && this.client) {
        this.client.config.samplingPercentage = 10;
      }

      // Set cloud role name for distributed tracing
      if (this.client && this.client.context) {
        this.client.context.tags[this.client.context.keys.cloudRole] = serviceName;
        this.client.context.tags[this.client.context.keys.cloudRoleInstance] =
          `${serviceName}-${process.env.HOSTNAME || process.pid}`;
      }

      // Add default properties to all telemetry
      this.client?.addTelemetryProcessor((envelope) => {
        envelope.tags['ai.cloud.role'] = serviceName;
        if (envelope.data) {
          const baseData = envelope.data as any;
          if (baseData.baseData && baseData.baseData.properties) {
            baseData.baseData.properties.environment =
              process.env.NODE_ENV || 'development';
            baseData.baseData.properties.version =
              process.env.APP_VERSION || '1.0.0';
          }
        }
        return true;
      });

      this.initialized = true;

      // Only log initialization in non-production to reduce noise
      if (process.env.NODE_ENV !== 'production') {
        this.logger.log(
          `Application Insights initialized for service: ${serviceName}`,
        );
      }
    } catch (error) {
      this.logger.error('Failed to initialize Application Insights', error);
      if (process.env.NODE_ENV === 'production') {
        this.logger.error('CRITICAL: Service running without monitoring - Application Insights failed to initialize');
      }
    }
  }

  /**
   * Get Application Insights client
   */
  public getClient(): appInsights.TelemetryClient | null {
    if (!this.initialized) {
      this.logger.warn('Application Insights not initialized');
    }
    return this.client;
  }

  /**
   * Track custom event
   */
  public trackEvent(
    name: string,
    properties?: { [key: string]: string },
    measurements?: { [key: string]: number },
  ): void {
    if (!this.client) return;

    this.client.trackEvent({
      name,
      properties,
      measurements,
    });
  }

  /**
   * Track custom metric
   */
  public trackMetric(
    name: string,
    value: number,
    properties?: { [key: string]: string },
  ): void {
    if (!this.client) return;

    this.client.trackMetric({
      name,
      value,
      properties,
    });
  }

  /**
   * Track exception
   */
  public trackException(
    exception: Error,
    properties?: { [key: string]: string },
  ): void {
    if (!this.client) return;

    this.client.trackException({
      exception,
      properties,
    });
  }

  /**
   * Track dependency (external service call)
   */
  public trackDependency(
    dependencyTypeName: string,
    name: string,
    data: string,
    duration: number,
    success: boolean,
    resultCode?: number,
    properties?: { [key: string]: string },
  ): void {
    if (!this.client) return;

    this.client.trackDependency({
      dependencyTypeName,
      name,
      data,
      duration,
      success,
      resultCode,
      properties,
    });
  }

  /**
   * Track HTTP request
   */
  public trackRequest(
    name: string,
    url: string,
    duration: number,
    resultCode: number,
    success: boolean,
    properties?: { [key: string]: string },
    measurements?: { [key: string]: number },
  ): void {
    if (!this.client) return;

    this.client.trackRequest({
      name,
      url,
      duration,
      resultCode: String(resultCode),
      success,
      properties,
      measurements,
    });
  }

  /**
   * Track trace/log message
   */
  public trackTrace(
    message: string,
    severityLevel?: appInsights.Contracts.SeverityLevel,
    properties?: { [key: string]: string },
  ): void {
    if (!this.client) return;

    this.client.trackTrace({
      message,
      severity: severityLevel,
      properties,
    });
  }

  /**
   * Set authenticated user context
   */
  public setAuthenticatedUserContext(
    userId: string,
    accountId?: string,
  ): void {
    if (!this.client) return;

    this.client.context.user.authenticatedUserId = userId;
    if (accountId) {
      this.client.context.user.accountId = accountId;
    }
  }

  /**
   * Clear authenticated user context
   */
  public clearAuthenticatedUserContext(): void {
    if (!this.client) return;

    this.client.context.user.authenticatedUserId = undefined;
    this.client.context.user.accountId = undefined;
  }

  /**
   * Flush all pending telemetry
   */
  public async flush(): Promise<void> {
    if (!this.client) return;

    return new Promise((resolve) => {
      this.client?.flush({
        callback: () => resolve(),
      });
    });
  }

  /**
   * Check if Application Insights is initialized
   */
  public isInitialized(): boolean {
    return this.initialized;
  }
}

/**
 * Export singleton instance
 */
export const appInsightsService = ApplicationInsightsService.getInstance();

/**
 * Export severity levels for convenience
 */
export const SeverityLevel = appInsights.Contracts.SeverityLevel;
