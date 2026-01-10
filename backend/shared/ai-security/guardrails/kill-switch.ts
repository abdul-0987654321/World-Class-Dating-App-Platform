/**
 * AI Kill Switch Service
 *
 * Provides emergency disable functionality for AI features across all services.
 * Uses AWS SSM Parameter Store for configuration to enable real-time control
 * without service restarts.
 *
 * Features:
 * - Per-service AI enable/disable control
 * - Audit logging of all kill switch operations
 * - CloudWatch metrics and alarms integration
 * - Caching with configurable TTL for performance
 * - Graceful degradation when SSM is unavailable
 */

import { SSMClient, GetParameterCommand, PutParameterCommand, GetParametersByPathCommand } from '@aws-sdk/client-ssm';
import { CloudWatchLogsClient, PutLogEventsCommand, CreateLogStreamCommand, DescribeLogStreamsCommand } from '@aws-sdk/client-cloudwatch-logs';
import { CloudWatchClient, PutMetricDataCommand } from '@aws-sdk/client-cloudwatch';

// AI-enabled services in the platform
export const AI_ENABLED_SERVICES = [
  'matching',
  'moderation',
  'recommendation',
  'media',
  'verification',
] as const;

export type AIServiceName = typeof AI_ENABLED_SERVICES[number];

export interface KillSwitchConfig {
  // AWS region for SSM Parameter Store
  region?: string;
  // Project name prefix for parameters
  projectName: string;
  // Environment (dev, staging, prod)
  environment: string;
  // SSM parameter prefix (default: /{projectName}/{environment}/ai)
  parameterPrefix?: string;
  // Cache TTL in milliseconds (default: 30000 - 30 seconds)
  cacheTtlMs?: number;
  // CloudWatch log group for audit logs
  logGroupName?: string;
  // Enable CloudWatch metrics
  enableMetrics?: boolean;
  // Fallback behavior when SSM is unavailable (default: true - AI enabled)
  fallbackEnabled?: boolean;
}

export interface KillSwitchStatus {
  serviceName: AIServiceName;
  enabled: boolean;
  lastUpdated: Date;
  disabledReason?: string;
  disabledBy?: string;
}

interface CacheEntry {
  value: boolean;
  timestamp: number;
  reason?: string;
}

/**
 * AI Kill Switch - Emergency control system for AI features
 */
export class AIKillSwitch {
  private readonly ssmClient: SSMClient;
  private readonly cloudWatchLogsClient: CloudWatchLogsClient;
  private readonly cloudWatchClient: CloudWatchClient;
  private readonly config: Required<KillSwitchConfig>;
  private readonly cache: Map<string, CacheEntry> = new Map();
  private logStreamName: string | null = null;
  private sequenceToken: string | undefined;

  constructor(config: KillSwitchConfig) {
    // Validate required config
    if (!config.projectName) {
      throw new Error('KillSwitchConfig: projectName is required');
    }
    if (!config.environment) {
      throw new Error('KillSwitchConfig: environment is required');
    }

    this.config = {
      region: config.region || process.env.AWS_REGION || 'us-east-1',
      projectName: config.projectName,
      environment: config.environment,
      parameterPrefix: config.parameterPrefix || `/${config.projectName}/${config.environment}/ai`,
      cacheTtlMs: config.cacheTtlMs || 30000, // 30 seconds default
      logGroupName: config.logGroupName || `/flamoral/${config.environment}/ai-kill-switch`,
      enableMetrics: config.enableMetrics ?? true,
      fallbackEnabled: config.fallbackEnabled ?? true,
    };

    this.ssmClient = new SSMClient({ region: this.config.region });
    this.cloudWatchLogsClient = new CloudWatchLogsClient({ region: this.config.region });
    this.cloudWatchClient = new CloudWatchClient({ region: this.config.region });
  }

  /**
   * Get the SSM parameter name for a service
   */
  private getParameterName(serviceName: AIServiceName): string {
    return `${this.config.parameterPrefix}/${serviceName}/enabled`;
  }

  /**
   * Get the reason parameter name for a service
   */
  private getReasonParameterName(serviceName: AIServiceName): string {
    return `${this.config.parameterPrefix}/${serviceName}/disabled_reason`;
  }

  /**
   * Check if cached value is still valid
   */
  private isCacheValid(entry: CacheEntry | undefined): boolean {
    if (!entry) return false;
    return Date.now() - entry.timestamp < this.config.cacheTtlMs;
  }

  /**
   * Check if AI is enabled for a specific service
   *
   * @param serviceName - The AI service to check
   * @returns Promise<boolean> - true if AI is enabled, false if disabled
   */
  async isAIEnabled(serviceName: AIServiceName): Promise<boolean> {
    // Validate service name
    if (!AI_ENABLED_SERVICES.includes(serviceName)) {
      throw new Error(`Invalid AI service name: ${serviceName}. Valid services: ${AI_ENABLED_SERVICES.join(', ')}`);
    }

    // Check cache first
    const cacheKey = this.getParameterName(serviceName);
    const cached = this.cache.get(cacheKey);
    if (this.isCacheValid(cached)) {
      return cached!.value;
    }

    try {
      const command = new GetParameterCommand({
        Name: this.getParameterName(serviceName),
        WithDecryption: false,
      });

      const response = await this.ssmClient.send(command);
      const enabled = response.Parameter?.Value?.toLowerCase() === 'true';

      // Update cache
      this.cache.set(cacheKey, {
        value: enabled,
        timestamp: Date.now(),
      });

      return enabled;
    } catch (error: any) {
      // Handle parameter not found - default to enabled
      if (error.name === 'ParameterNotFound') {
        this.cache.set(cacheKey, {
          value: true,
          timestamp: Date.now(),
        });
        return true;
      }

      // Log error and use fallback
      console.error(`[AIKillSwitch] Failed to check AI status for ${serviceName}:`, error.message);

      // Emit metric for SSM failure
      await this.emitMetric('SSMAccessFailure', 1, serviceName);

      // Return fallback value
      return this.config.fallbackEnabled;
    }
  }

  /**
   * Emergency disable AI for a specific service
   *
   * @param serviceName - The AI service to disable
   * @param reason - Reason for disabling (required for audit)
   * @param disabledBy - Identifier of who disabled (optional, defaults to 'system')
   */
  async disableAI(
    serviceName: AIServiceName,
    reason: string,
    disabledBy: string = 'system'
  ): Promise<void> {
    // Validate service name
    if (!AI_ENABLED_SERVICES.includes(serviceName)) {
      throw new Error(`Invalid AI service name: ${serviceName}`);
    }

    // Validate reason
    if (!reason || reason.trim().length === 0) {
      throw new Error('Reason is required when disabling AI');
    }

    const timestamp = new Date().toISOString();

    try {
      // Set enabled = false
      await this.ssmClient.send(new PutParameterCommand({
        Name: this.getParameterName(serviceName),
        Value: 'false',
        Type: 'String',
        Overwrite: true,
        Description: `AI enabled flag for ${serviceName} service`,
      }));

      // Store the reason
      await this.ssmClient.send(new PutParameterCommand({
        Name: this.getReasonParameterName(serviceName),
        Value: JSON.stringify({
          reason,
          disabledBy,
          timestamp,
        }),
        Type: 'String',
        Overwrite: true,
        Description: `Reason for AI disable on ${serviceName} service`,
      }));

      // Invalidate cache
      this.cache.delete(this.getParameterName(serviceName));

      // Log to CloudWatch
      await this.logKillSwitchEvent({
        action: 'DISABLE',
        serviceName,
        reason,
        disabledBy,
        timestamp,
      });

      // Emit metrics
      await this.emitMetric('AIServiceDisabled', 1, serviceName);

      console.warn(`[AIKillSwitch] AI DISABLED for ${serviceName} by ${disabledBy}: ${reason}`);
    } catch (error: any) {
      console.error(`[AIKillSwitch] Failed to disable AI for ${serviceName}:`, error.message);
      await this.emitMetric('DisableOperationFailure', 1, serviceName);
      throw new Error(`Failed to disable AI for ${serviceName}: ${error.message}`);
    }
  }

  /**
   * Re-enable AI for a specific service
   *
   * @param serviceName - The AI service to enable
   * @param enabledBy - Identifier of who enabled (optional, defaults to 'system')
   */
  async enableAI(serviceName: AIServiceName, enabledBy: string = 'system'): Promise<void> {
    // Validate service name
    if (!AI_ENABLED_SERVICES.includes(serviceName)) {
      throw new Error(`Invalid AI service name: ${serviceName}`);
    }

    const timestamp = new Date().toISOString();

    try {
      // Set enabled = true
      await this.ssmClient.send(new PutParameterCommand({
        Name: this.getParameterName(serviceName),
        Value: 'true',
        Type: 'String',
        Overwrite: true,
        Description: `AI enabled flag for ${serviceName} service`,
      }));

      // Clear the reason (or update it)
      await this.ssmClient.send(new PutParameterCommand({
        Name: this.getReasonParameterName(serviceName),
        Value: JSON.stringify({
          reason: 'Re-enabled',
          enabledBy,
          timestamp,
        }),
        Type: 'String',
        Overwrite: true,
        Description: `Reason for AI state change on ${serviceName} service`,
      }));

      // Invalidate cache
      this.cache.delete(this.getParameterName(serviceName));

      // Log to CloudWatch
      await this.logKillSwitchEvent({
        action: 'ENABLE',
        serviceName,
        reason: 'Re-enabled',
        disabledBy: enabledBy,
        timestamp,
      });

      // Emit metrics
      await this.emitMetric('AIServiceEnabled', 1, serviceName);

      console.info(`[AIKillSwitch] AI ENABLED for ${serviceName} by ${enabledBy}`);
    } catch (error: any) {
      console.error(`[AIKillSwitch] Failed to enable AI for ${serviceName}:`, error.message);
      await this.emitMetric('EnableOperationFailure', 1, serviceName);
      throw new Error(`Failed to enable AI for ${serviceName}: ${error.message}`);
    }
  }

  /**
   * Get status of all AI services
   *
   * @returns Promise<Record<AIServiceName, KillSwitchStatus>> - Status of all services
   */
  async getAllStatus(): Promise<Record<string, KillSwitchStatus>> {
    const status: Record<string, KillSwitchStatus> = {};

    try {
      // Try to get all parameters at once using GetParametersByPath
      const command = new GetParametersByPathCommand({
        Path: this.config.parameterPrefix,
        Recursive: true,
        WithDecryption: false,
      });

      const response = await this.ssmClient.send(command);
      const parameters = response.Parameters || [];

      // Parse parameters into status objects
      const enabledParams = new Map<string, string>();
      const reasonParams = new Map<string, any>();

      for (const param of parameters) {
        if (param.Name && param.Value) {
          if (param.Name.endsWith('/enabled')) {
            const serviceName = param.Name.split('/').slice(-2)[0];
            enabledParams.set(serviceName, param.Value);
          } else if (param.Name.endsWith('/disabled_reason')) {
            const serviceName = param.Name.split('/').slice(-2)[0];
            try {
              reasonParams.set(serviceName, JSON.parse(param.Value));
            } catch {
              reasonParams.set(serviceName, { reason: param.Value });
            }
          }
        }
      }

      // Build status for all known services
      for (const serviceName of AI_ENABLED_SERVICES) {
        const enabled = enabledParams.get(serviceName)?.toLowerCase() === 'true' ?? true;
        const reasonData = reasonParams.get(serviceName);

        status[serviceName] = {
          serviceName,
          enabled,
          lastUpdated: reasonData?.timestamp ? new Date(reasonData.timestamp) : new Date(),
          disabledReason: !enabled ? reasonData?.reason : undefined,
          disabledBy: !enabled ? reasonData?.disabledBy : undefined,
        };

        // Update cache
        this.cache.set(this.getParameterName(serviceName), {
          value: enabled,
          timestamp: Date.now(),
          reason: reasonData?.reason,
        });
      }
    } catch (error: any) {
      console.error('[AIKillSwitch] Failed to get all status:', error.message);

      // Return cached values or defaults
      for (const serviceName of AI_ENABLED_SERVICES) {
        const cached = this.cache.get(this.getParameterName(serviceName));
        status[serviceName] = {
          serviceName,
          enabled: cached?.value ?? this.config.fallbackEnabled,
          lastUpdated: cached ? new Date(cached.timestamp) : new Date(),
          disabledReason: cached?.reason,
        };
      }
    }

    return status;
  }

  /**
   * Emergency disable ALL AI services at once
   *
   * @param reason - Reason for the global disable
   * @param disabledBy - Identifier of who triggered the disable
   */
  async disableAllAI(reason: string, disabledBy: string = 'system'): Promise<void> {
    console.warn(`[AIKillSwitch] GLOBAL AI KILL SWITCH ACTIVATED by ${disabledBy}: ${reason}`);

    const results: { service: AIServiceName; success: boolean; error?: string }[] = [];

    for (const serviceName of AI_ENABLED_SERVICES) {
      try {
        await this.disableAI(serviceName, reason, disabledBy);
        results.push({ service: serviceName, success: true });
      } catch (error: any) {
        results.push({ service: serviceName, success: false, error: error.message });
      }
    }

    // Log global disable event
    await this.logKillSwitchEvent({
      action: 'DISABLE_ALL',
      serviceName: 'ALL',
      reason,
      disabledBy,
      timestamp: new Date().toISOString(),
      results,
    });

    // Check if any failed
    const failures = results.filter(r => !r.success);
    if (failures.length > 0) {
      throw new Error(`Failed to disable some services: ${failures.map(f => f.service).join(', ')}`);
    }
  }

  /**
   * Re-enable ALL AI services at once
   *
   * @param enabledBy - Identifier of who triggered the enable
   */
  async enableAllAI(enabledBy: string = 'system'): Promise<void> {
    console.info(`[AIKillSwitch] GLOBAL AI ENABLE triggered by ${enabledBy}`);

    const results: { service: AIServiceName; success: boolean; error?: string }[] = [];

    for (const serviceName of AI_ENABLED_SERVICES) {
      try {
        await this.enableAI(serviceName, enabledBy);
        results.push({ service: serviceName, success: true });
      } catch (error: any) {
        results.push({ service: serviceName, success: false, error: error.message });
      }
    }

    // Log global enable event
    await this.logKillSwitchEvent({
      action: 'ENABLE_ALL',
      serviceName: 'ALL',
      reason: 'Global re-enable',
      disabledBy: enabledBy,
      timestamp: new Date().toISOString(),
      results,
    });

    // Check if any failed
    const failures = results.filter(r => !r.success);
    if (failures.length > 0) {
      throw new Error(`Failed to enable some services: ${failures.map(f => f.service).join(', ')}`);
    }
  }

  /**
   * Clear the local cache (useful for testing or forced refresh)
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Log kill switch events to CloudWatch Logs
   */
  private async logKillSwitchEvent(event: {
    action: string;
    serviceName: string;
    reason: string;
    disabledBy: string;
    timestamp: string;
    results?: any;
  }): Promise<void> {
    try {
      // Ensure log stream exists
      if (!this.logStreamName) {
        this.logStreamName = `kill-switch-events-${new Date().toISOString().split('T')[0]}`;

        try {
          await this.cloudWatchLogsClient.send(new CreateLogStreamCommand({
            logGroupName: this.config.logGroupName,
            logStreamName: this.logStreamName,
          }));
        } catch (error: any) {
          // Ignore if stream already exists
          if (error.name !== 'ResourceAlreadyExistsException') {
            throw error;
          }
          // Get the sequence token if stream exists
          const describeResponse = await this.cloudWatchLogsClient.send(new DescribeLogStreamsCommand({
            logGroupName: this.config.logGroupName,
            logStreamNamePrefix: this.logStreamName,
          }));
          this.sequenceToken = describeResponse.logStreams?.[0]?.uploadSequenceToken;
        }
      }

      const logEvent = {
        timestamp: Date.now(),
        message: JSON.stringify({
          ...event,
          environment: this.config.environment,
          projectName: this.config.projectName,
          severity: event.action.includes('DISABLE') ? 'CRITICAL' : 'INFO',
        }),
      };

      const response = await this.cloudWatchLogsClient.send(new PutLogEventsCommand({
        logGroupName: this.config.logGroupName,
        logStreamName: this.logStreamName,
        logEvents: [logEvent],
        sequenceToken: this.sequenceToken,
      }));

      this.sequenceToken = response.nextSequenceToken;
    } catch (error: any) {
      // Don't fail the main operation if logging fails
      console.error('[AIKillSwitch] Failed to log event to CloudWatch:', error.message);
    }
  }

  /**
   * Emit CloudWatch metrics
   */
  private async emitMetric(
    metricName: string,
    value: number,
    serviceName: string
  ): Promise<void> {
    if (!this.config.enableMetrics) return;

    try {
      await this.cloudWatchClient.send(new PutMetricDataCommand({
        Namespace: `Flamoral/${this.config.environment}/AIKillSwitch`,
        MetricData: [
          {
            MetricName: metricName,
            Dimensions: [
              {
                Name: 'ServiceName',
                Value: serviceName,
              },
              {
                Name: 'Environment',
                Value: this.config.environment,
              },
            ],
            Value: value,
            Unit: 'Count',
            Timestamp: new Date(),
          },
        ],
      }));
    } catch (error: any) {
      // Don't fail the main operation if metrics emission fails
      console.error('[AIKillSwitch] Failed to emit metric:', error.message);
    }
  }
}

/**
 * Create a singleton instance for the application
 */
let killSwitchInstance: AIKillSwitch | null = null;

export function getKillSwitch(config?: KillSwitchConfig): AIKillSwitch {
  if (!killSwitchInstance) {
    if (!config) {
      // Use environment variables for default config
      config = {
        projectName: process.env.PROJECT_NAME || 'flamoral',
        environment: process.env.NODE_ENV || 'development',
        region: process.env.AWS_REGION,
      };
    }
    killSwitchInstance = new AIKillSwitch(config);
  }
  return killSwitchInstance;
}

/**
 * Decorator/wrapper for AI-dependent functions
 * Automatically checks kill switch before executing
 */
export function withKillSwitch<T>(
  serviceName: AIServiceName,
  operation: () => Promise<T>,
  fallback?: () => Promise<T> | T
): () => Promise<T> {
  return async () => {
    const killSwitch = getKillSwitch();
    const enabled = await killSwitch.isAIEnabled(serviceName);

    if (!enabled) {
      console.warn(`[AIKillSwitch] AI disabled for ${serviceName}, using fallback`);
      if (fallback) {
        return fallback();
      }
      throw new Error(`AI is currently disabled for ${serviceName}`);
    }

    return operation();
  };
}

export default AIKillSwitch;
