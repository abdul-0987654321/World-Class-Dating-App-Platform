/**
 * Application Insights Integration Helper
 * Integrates Winston logger with Azure Application Insights
 */

import winston from 'winston';
import { appInsightsService, SeverityLevel } from '../telemetry/appinsights';

/**
 * Application Insights Transport for Winston
 * Sends logs to Azure Application Insights
 */
export class ApplicationInsightsTransport extends winston.Transport {
  constructor(options?: winston.TransportStreamOptions) {
    super(options);
  }

  log(info: any, callback: () => void): void {
    setImmediate(() => {
      this.emit('logged', info);
    });

    const client = appInsightsService.getClient();
    if (!client) {
      callback();
      return;
    }

    // Map Winston levels to Application Insights severity levels
    const severityMap: Record<string, any> = {
      error: SeverityLevel.Error,
      warn: SeverityLevel.Warning,
      info: SeverityLevel.Information,
      debug: SeverityLevel.Verbose,
    };

    const severity = severityMap[info.level] || SeverityLevel.Information;

    // Prepare properties
    const properties: Record<string, string> = {
      service: info.service || 'unknown',
      environment: info.environment || 'development',
      version: info.version || '1.0.0',
    };

    // Add correlation ID if present
    if (info.correlationId) {
      properties.correlationId = info.correlationId;
    }

    // Add custom metadata
    Object.keys(info).forEach(key => {
      if (!['level', 'message', 'timestamp', 'service', 'environment', 'version', 'stack'].includes(key)) {
        properties[key] = typeof info[key] === 'object' ? JSON.stringify(info[key]) : String(info[key]);
      }
    });

    // Track trace
    appInsightsService.trackTrace(info.message, severity, properties);

    // Track exception if present
    if (info.stack) {
      const error = new Error(info.message);
      error.stack = info.stack;
      appInsightsService.trackException(error, properties);
    }

    callback();
  }
}

/**
 * Initialize Application Insights for a service
 * @param serviceName - Name of the service
 * @param connectionString - Application Insights connection string
 */
export function initializeAppInsights(serviceName: string, connectionString?: string): void {
  const connString = connectionString || process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;
  appInsightsService.initialize(serviceName, connString);
}

/**
 * Add Application Insights transport to existing Winston logger
 * @param logger - Winston logger instance
 */
export function addAppInsightsToLogger(logger: winston.Logger): winston.Logger {
  if (appInsightsService.isInitialized()) {
    const aiTransport = new ApplicationInsightsTransport({
      level: 'info', // Only send info and above to Application Insights
    });

    logger.add(aiTransport);
  }

  return logger;
}

/**
 * Flush Application Insights telemetry
 * Call this before process exit
 */
export async function flushAppInsights(): Promise<void> {
  await appInsightsService.flush();
}

export { appInsightsService };
