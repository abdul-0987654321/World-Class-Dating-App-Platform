/**
 * Log Aggregation Configuration for Flamoral Platform
 *
 * Features:
 * - Integration with Azure Log Analytics
 * - Integration with Elasticsearch/ELK Stack
 * - Integration with Loki (Grafana)
 * - Structured log formatting for aggregation
 * - Log shipping and buffering
 */

import winston from 'winston';
import 'winston-daily-rotate-file';

export interface LogAggregationConfig {
  serviceName: string;
  enabled?: boolean;
  provider?: 'azure' | 'elasticsearch' | 'loki' | 'datadog' | 'custom';
  endpoint?: string;
  apiKey?: string;
  bufferSize?: number;
  flushInterval?: number;
}

/**
 * Azure Log Analytics Transport
 */
class AzureLogAnalyticsTransport extends winston.Transport {
  private workspaceId: string;
  private sharedKey: string;
  private logType: string;
  private buffer: any[] = [];
  private bufferSize: number;
  private flushInterval: number;
  private flushTimer: NodeJS.Timeout | null = null;

  constructor(options: {
    workspaceId: string;
    sharedKey: string;
    logType?: string;
    bufferSize?: number;
    flushInterval?: number;
  }) {
    super();
    this.workspaceId = options.workspaceId;
    this.sharedKey = options.sharedKey;
    this.logType = options.logType || 'CustomLog';
    this.bufferSize = options.bufferSize || 100;
    this.flushInterval = options.flushInterval || 5000; // 5 seconds

    this.startFlushTimer();
  }

  log(info: any, callback: () => void): void {
    setImmediate(() => {
      this.emit('logged', info);
    });

    // Add to buffer
    this.buffer.push({
      timestamp: info.timestamp,
      level: info.level,
      message: info.message,
      service: info.service,
      ...info,
    });

    // Flush if buffer is full
    if (this.buffer.length >= this.bufferSize) {
      this.flush();
    }

    callback();
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      if (this.buffer.length > 0) {
        this.flush();
      }
    }, this.flushInterval);
  }

  private async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const logs = [...this.buffer];
    this.buffer = [];

    try {
      await this.sendToAzure(logs);
    } catch (error) {
      console.error('Failed to send logs to Azure Log Analytics:', error);
      // Re-add to buffer if failed (with limit to prevent memory leak)
      if (this.buffer.length < this.bufferSize * 2) {
        this.buffer.unshift(...logs);
      }
    }
  }

  private async sendToAzure(logs: any[]): Promise<void> {
    const crypto = require('crypto');

    const body = JSON.stringify(logs);
    const contentLength = Buffer.byteLength(body, 'utf8');

    const dateString = new Date().toUTCString();
    const stringToSign = `POST\n${contentLength}\napplication/json\nx-ms-date:${dateString}\n/api/logs`;

    const signature = crypto
      .createHmac('sha256', Buffer.from(this.sharedKey, 'base64'))
      .update(stringToSign, 'utf8')
      .digest('base64');

    const authorization = `SharedKey ${this.workspaceId}:${signature}`;

    const url = `https://${this.workspaceId}.ods.opinsights.azure.com/api/logs?api-version=2016-04-01`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Log-Type': this.logType,
        'x-ms-date': dateString,
        'Authorization': authorization,
      },
      body,
    });

    if (!response.ok) {
      throw new Error(`Azure Log Analytics returned ${response.status}: ${response.statusText}`);
    }
  }

  close(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    this.flush();
  }
}

/**
 * Elasticsearch Transport
 */
class ElasticsearchTransport extends winston.Transport {
  private endpoint: string;
  private apiKey: string;
  private index: string;
  private buffer: any[] = [];
  private bufferSize: number;
  private flushInterval: number;
  private flushTimer: NodeJS.Timeout | null = null;

  constructor(options: {
    endpoint: string;
    apiKey?: string;
    index?: string;
    bufferSize?: number;
    flushInterval?: number;
  }) {
    super();
    this.endpoint = options.endpoint;
    this.apiKey = options.apiKey || '';
    this.index = options.index || 'flamoral-logs';
    this.bufferSize = options.bufferSize || 100;
    this.flushInterval = options.flushInterval || 5000;

    this.startFlushTimer();
  }

  log(info: any, callback: () => void): void {
    setImmediate(() => {
      this.emit('logged', info);
    });

    // Add to buffer
    this.buffer.push({
      '@timestamp': new Date().toISOString(),
      level: info.level,
      message: info.message,
      service: info.service,
      ...info,
    });

    // Flush if buffer is full
    if (this.buffer.length >= this.bufferSize) {
      this.flush();
    }

    callback();
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      if (this.buffer.length > 0) {
        this.flush();
      }
    }, this.flushInterval);
  }

  private async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const logs = [...this.buffer];
    this.buffer = [];

    try {
      await this.sendToElasticsearch(logs);
    } catch (error) {
      console.error('Failed to send logs to Elasticsearch:', error);
      // Re-add to buffer if failed (with limit)
      if (this.buffer.length < this.bufferSize * 2) {
        this.buffer.unshift(...logs);
      }
    }
  }

  private async sendToElasticsearch(logs: any[]): Promise<void> {
    // Build bulk request body
    const bulkBody = logs.flatMap(log => [
      { index: { _index: this.index } },
      log,
    ]);

    const headers: Record<string, string> = {
      'Content-Type': 'application/x-ndjson',
    };

    if (this.apiKey) {
      headers['Authorization'] = `ApiKey ${this.apiKey}`;
    }

    const response = await fetch(`${this.endpoint}/_bulk`, {
      method: 'POST',
      headers,
      body: bulkBody.map(item => JSON.stringify(item)).join('\n') + '\n',
    });

    if (!response.ok) {
      throw new Error(`Elasticsearch returned ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    if (result.errors) {
      console.error('Elasticsearch bulk insert had errors:', result.items);
    }
  }

  close(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    this.flush();
  }
}

/**
 * Loki Transport (Grafana)
 */
class LokiTransport extends winston.Transport {
  private endpoint: string;
  private labels: Record<string, string>;
  private buffer: any[] = [];
  private bufferSize: number;
  private flushInterval: number;
  private flushTimer: NodeJS.Timeout | null = null;

  constructor(options: {
    endpoint: string;
    labels?: Record<string, string>;
    bufferSize?: number;
    flushInterval?: number;
  }) {
    super();
    this.endpoint = options.endpoint;
    this.labels = options.labels || {};
    this.bufferSize = options.bufferSize || 100;
    this.flushInterval = options.flushInterval || 5000;

    this.startFlushTimer();
  }

  log(info: any, callback: () => void): void {
    setImmediate(() => {
      this.emit('logged', info);
    });

    // Add to buffer
    this.buffer.push({
      timestamp: Date.now() * 1000000, // Loki expects nanoseconds
      level: info.level,
      message: info.message,
      service: info.service,
      ...info,
    });

    // Flush if buffer is full
    if (this.buffer.length >= this.bufferSize) {
      this.flush();
    }

    callback();
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      if (this.buffer.length > 0) {
        this.flush();
      }
    }, this.flushInterval);
  }

  private async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const logs = [...this.buffer];
    this.buffer = [];

    try {
      await this.sendToLoki(logs);
    } catch (error) {
      console.error('Failed to send logs to Loki:', error);
      // Re-add to buffer if failed (with limit)
      if (this.buffer.length < this.bufferSize * 2) {
        this.buffer.unshift(...logs);
      }
    }
  }

  private async sendToLoki(logs: any[]): Promise<void> {
    // Group logs by labels
    const streams = [{
      stream: {
        ...this.labels,
        service: logs[0]?.service || 'unknown',
      },
      values: logs.map(log => [
        log.timestamp.toString(),
        JSON.stringify({
          level: log.level,
          message: log.message,
          ...log,
        }),
      ]),
    }];

    const response = await fetch(`${this.endpoint}/loki/api/v1/push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ streams }),
    });

    if (!response.ok) {
      throw new Error(`Loki returned ${response.status}: ${response.statusText}`);
    }
  }

  close(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    this.flush();
  }
}

/**
 * Create log aggregation transport based on configuration
 */
export function createLogAggregationTransport(config: LogAggregationConfig): winston.Transport | null {
  if (!config.enabled) {
    return null;
  }

  const provider = config.provider || process.env.LOG_AGGREGATION_PROVIDER;
  const endpoint = config.endpoint || process.env.LOG_AGGREGATION_ENDPOINT;
  const apiKey = config.apiKey || process.env.LOG_AGGREGATION_API_KEY;

  switch (provider) {
    case 'azure': {
      const workspaceId = process.env.AZURE_LOG_ANALYTICS_WORKSPACE_ID;
      const sharedKey = process.env.AZURE_LOG_ANALYTICS_SHARED_KEY;

      if (!workspaceId || !sharedKey) {
        console.warn('Azure Log Analytics credentials not configured');
        return null;
      }

      return new AzureLogAnalyticsTransport({
        workspaceId,
        sharedKey,
        logType: `${config.serviceName}Log`,
        bufferSize: config.bufferSize,
        flushInterval: config.flushInterval,
      });
    }

    case 'elasticsearch': {
      if (!endpoint) {
        console.warn('Elasticsearch endpoint not configured');
        return null;
      }

      return new ElasticsearchTransport({
        endpoint,
        apiKey,
        index: `flamoral-${config.serviceName}-logs`,
        bufferSize: config.bufferSize,
        flushInterval: config.flushInterval,
      });
    }

    case 'loki': {
      if (!endpoint) {
        console.warn('Loki endpoint not configured');
        return null;
      }

      return new LokiTransport({
        endpoint,
        labels: {
          app: 'flamoral',
          service: config.serviceName,
          environment: process.env.NODE_ENV || 'development',
        },
        bufferSize: config.bufferSize,
        flushInterval: config.flushInterval,
      });
    }

    default:
      console.warn(`Unsupported log aggregation provider: ${provider}`);
      return null;
  }
}

/**
 * Structured log formatter for aggregation
 */
export function createStructuredFormatter() {
  return winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    winston.format.errors({ stack: true }),
    winston.format((info) => {
      // Flatten nested objects for better querying
      const flattened: any = {
        timestamp: info.timestamp,
        level: info.level,
        message: info.message,
        service: info.service,
        environment: process.env.NODE_ENV || 'development',
        hostname: process.env.HOSTNAME || 'unknown',
        pid: process.pid,
      };

      // Add trace context if available
      if (info.correlationId) flattened.correlationId = info.correlationId;
      if (info.requestId) flattened.requestId = info.requestId;
      if (info.traceId) flattened.traceId = info.traceId;
      if (info.spanId) flattened.spanId = info.spanId;

      // Add user context if available
      if (info.userId) flattened.userId = info.userId;

      // Add error details if present
      if (info.error) {
        flattened.error = {
          name: info.error.name,
          message: info.error.message,
          stack: info.error.stack,
        };
      }

      // Add all other metadata
      Object.keys(info).forEach(key => {
        if (!['timestamp', 'level', 'message', 'service', 'correlationId', 'requestId', 'userId', 'error', 'stack'].includes(key)) {
          flattened[key] = info[key];
        }
      });

      return flattened;
    })(),
    winston.format.json()
  );
}

/**
 * Log retention policy helper
 */
export interface LogRetentionPolicy {
  debug: number;    // Days to keep debug logs
  info: number;     // Days to keep info logs
  warn: number;     // Days to keep warn logs
  error: number;    // Days to keep error logs
}

export const DEFAULT_RETENTION_POLICY: LogRetentionPolicy = {
  debug: 7,    // 7 days
  info: 30,    // 30 days
  warn: 90,    // 90 days
  error: 365,  // 1 year
};
