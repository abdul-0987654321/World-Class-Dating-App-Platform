/**
 * AI Kill Switch Service - Flamoral Dating App
 *
 * Provides emergency disable functionality for AI features.
 * Uses AWS SSM Parameter Store for configuration.
 */

import { SSMClient, GetParameterCommand, PutParameterCommand, GetParametersByPathCommand } from '@aws-sdk/client-ssm';
import { CloudWatchLogsClient, PutLogEventsCommand, CreateLogStreamCommand, DescribeLogStreamsCommand } from '@aws-sdk/client-cloudwatch-logs';
import { CloudWatchClient, PutMetricDataCommand } from '@aws-sdk/client-cloudwatch';

export const AI_ENABLED_SERVICES = ['matching', 'moderation', 'recommendation', 'media', 'verification'] as const;
export type AIServiceName = typeof AI_ENABLED_SERVICES[number];

export interface KillSwitchConfig {
  region?: string;
  projectName: string;
  environment: string;
  parameterPrefix?: string;
  cacheTtlMs?: number;
  logGroupName?: string;
  enableMetrics?: boolean;
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

export class AIKillSwitch {
  private readonly ssmClient: SSMClient;
  private readonly cloudWatchLogsClient: CloudWatchLogsClient;
  private readonly cloudWatchClient: CloudWatchClient;
  private readonly config: Required<KillSwitchConfig>;
  private readonly cache: Map<string, CacheEntry> = new Map();
  private logStreamName: string | null = null;
  private sequenceToken: string | undefined;

  constructor(config: KillSwitchConfig) {
    if (!config.projectName) throw new Error('projectName required');
    if (!config.environment) throw new Error('environment required');

    this.config = {
      region: config.region || process.env.AWS_REGION || 'us-east-1',
      projectName: config.projectName,
      environment: config.environment,
      parameterPrefix: config.parameterPrefix || `/${config.projectName}/${config.environment}/ai`,
      cacheTtlMs: config.cacheTtlMs || 30000,
      logGroupName: config.logGroupName || `/flamoral/${config.environment}/ai-kill-switch`,
      enableMetrics: config.enableMetrics ?? true,
      fallbackEnabled: config.fallbackEnabled ?? true,
    };

    this.ssmClient = new SSMClient({ region: this.config.region });
    this.cloudWatchLogsClient = new CloudWatchLogsClient({ region: this.config.region });
    this.cloudWatchClient = new CloudWatchClient({ region: this.config.region });
  }

  private getParameterName(serviceName: AIServiceName): string {
    return `${this.config.parameterPrefix}/${serviceName}/enabled`;
  }

  async isAIEnabled(serviceName: AIServiceName): Promise<boolean> {
    const cacheKey = this.getParameterName(serviceName);
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.config.cacheTtlMs) {
      return cached.value;
    }

    try {
      const response = await this.ssmClient.send(new GetParameterCommand({
        Name: cacheKey,
        WithDecryption: false,
      }));
      const enabled = response.Parameter?.Value?.toLowerCase() === 'true';
      this.cache.set(cacheKey, { value: enabled, timestamp: Date.now() });
      return enabled;
    } catch (error: any) {
      if (error.name === 'ParameterNotFound') {
        this.cache.set(cacheKey, { value: true, timestamp: Date.now() });
        return true;
      }
      return this.config.fallbackEnabled;
    }
  }

  async disableAI(serviceName: AIServiceName, reason: string, disabledBy = 'system'): Promise<void> {
    await this.ssmClient.send(new PutParameterCommand({
      Name: this.getParameterName(serviceName),
      Value: 'false',
      Type: 'String',
      Overwrite: true,
    }));

    await this.ssmClient.send(new PutParameterCommand({
      Name: `${this.config.parameterPrefix}/${serviceName}/disabled_reason`,
      Value: JSON.stringify({ reason, disabledBy, timestamp: new Date().toISOString() }),
      Type: 'String',
      Overwrite: true,
    }));

    this.cache.delete(this.getParameterName(serviceName));
    await this.emitMetric('AIServiceDisabled', 1, serviceName);
    console.warn(`[AIKillSwitch] AI DISABLED for ${serviceName} by ${disabledBy}: ${reason}`);
  }

  async enableAI(serviceName: AIServiceName, enabledBy = 'system'): Promise<void> {
    await this.ssmClient.send(new PutParameterCommand({
      Name: this.getParameterName(serviceName),
      Value: 'true',
      Type: 'String',
      Overwrite: true,
    }));
    this.cache.delete(this.getParameterName(serviceName));
    await this.emitMetric('AIServiceEnabled', 1, serviceName);
    console.info(`[AIKillSwitch] AI ENABLED for ${serviceName} by ${enabledBy}`);
  }

  async getAllStatus(): Promise<Record<string, KillSwitchStatus>> {
    const status: Record<string, KillSwitchStatus> = {};
    for (const serviceName of AI_ENABLED_SERVICES) {
      const enabled = await this.isAIEnabled(serviceName);
      status[serviceName] = { serviceName, enabled, lastUpdated: new Date() };
    }
    return status;
  }

  async disableAllAI(reason: string, disabledBy = 'system'): Promise<void> {
    for (const service of AI_ENABLED_SERVICES) {
      await this.disableAI(service, reason, disabledBy);
    }
  }

  async enableAllAI(enabledBy = 'system'): Promise<void> {
    for (const service of AI_ENABLED_SERVICES) {
      await this.enableAI(service, enabledBy);
    }
  }

  clearCache(): void {
    this.cache.clear();
  }

  private async emitMetric(metricName: string, value: number, serviceName: string): Promise<void> {
    if (!this.config.enableMetrics) return;
    try {
      await this.cloudWatchClient.send(new PutMetricDataCommand({
        Namespace: `Flamoral/${this.config.environment}/AIKillSwitch`,
        MetricData: [{
          MetricName: metricName,
          Dimensions: [
            { Name: 'ServiceName', Value: serviceName },
            { Name: 'Environment', Value: this.config.environment },
          ],
          Value: value,
          Unit: 'Count',
          Timestamp: new Date(),
        }],
      }));
    } catch (error: any) {
      console.error('[AIKillSwitch] Metric emission failed:', error.message);
    }
  }
}

let instance: AIKillSwitch | null = null;

export function getKillSwitch(config?: KillSwitchConfig): AIKillSwitch {
  if (!instance) {
    instance = new AIKillSwitch(config || {
      projectName: process.env.PROJECT_NAME || 'flamoral',
      environment: process.env.NODE_ENV || 'development',
    });
  }
  return instance;
}

export function withKillSwitch<T>(
  serviceName: AIServiceName,
  operation: () => Promise<T>,
  fallback?: () => Promise<T> | T
): () => Promise<T> {
  return async () => {
    const ks = getKillSwitch();
    if (!(await ks.isAIEnabled(serviceName))) {
      if (fallback) return fallback();
      throw new Error(`AI disabled for ${serviceName}`);
    }
    return operation();
  };
}

export default AIKillSwitch;
