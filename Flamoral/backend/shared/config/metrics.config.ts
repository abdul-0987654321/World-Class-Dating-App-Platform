/**
 * Unified Prometheus Metrics Configuration for Flamoral Platform
 *
 * Features:
 * - Prometheus metrics collection
 * - Custom application metrics
 * - HTTP request metrics
 * - Database query metrics
 * - Cache metrics (Redis)
 * - Business metrics
 * - Default Node.js metrics
 */

import {
  register,
  Registry,
  Counter,
  Histogram,
  Gauge,
  Summary,
  collectDefaultMetrics,
  MetricOptions,
} from 'prom-client';

export interface MetricsConfig {
  serviceName: string;
  prefix?: string;
  enableDefaultMetrics?: boolean;
  defaultMetricsInterval?: number;
}

export class MetricsCollector {
  private registry: Registry;
  private serviceName: string;
  private prefix: string;

  // HTTP Metrics
  private httpRequestDuration: Histogram<string>;
  private httpRequestTotal: Counter<string>;
  private httpRequestErrors: Counter<string>;
  private httpRequestSize: Histogram<string>;
  private httpResponseSize: Histogram<string>;
  private activeHttpConnections: Gauge<string>;

  // Database Metrics
  private dbQueryDuration: Histogram<string>;
  private dbQueryTotal: Counter<string>;
  private dbQueryErrors: Counter<string>;
  private dbConnectionsActive: Gauge<string>;
  private dbConnectionsIdle: Gauge<string>;
  private dbConnectionsTotal: Gauge<string>;

  // Cache Metrics (Redis)
  private cacheHits: Counter<string>;
  private cacheMisses: Counter<string>;
  private cacheOperationDuration: Histogram<string>;
  private cacheKeys: Gauge<string>;
  private cacheMemoryUsage: Gauge<string>;

  // WebSocket Metrics
  private websocketConnections: Gauge<string>;
  private websocketMessages: Counter<string>;
  private websocketErrors: Counter<string>;

  // Business Metrics (Dating App Specific)
  private userRegistrations: Counter<string>;
  private userLogins: Counter<string>;
  private matchesCreated: Counter<string>;
  private messagesExchanged: Counter<string>;
  private paymentsProcessed: Counter<string>;
  private paymentAmount: Counter<string>;
  private activeUsers: Gauge<string>;

  // Queue Metrics
  private queueJobsActive: Gauge<string>;
  private queueJobsCompleted: Counter<string>;
  private queueJobsFailed: Counter<string>;
  private queueJobDuration: Histogram<string>;

  // API Gateway Specific
  private rateLimitExceeded: Counter<string>;
  private circuitBreakerOpen: Gauge<string>;
  private upstreamServiceLatency: Histogram<string>;

  constructor(config: MetricsConfig) {
    this.serviceName = config.serviceName;
    this.prefix = config.prefix || `flamoral_${config.serviceName.replace(/-/g, '_')}`;
    this.registry = new Registry();

    // Enable default metrics (CPU, memory, etc.)
    if (config.enableDefaultMetrics !== false) {
      collectDefaultMetrics({
        register: this.registry,
        prefix: `${this.prefix}_`,
        gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
        eventLoopMonitoringPrecision: config.defaultMetricsInterval || 10,
      });
    }

    // Initialize all metrics
    this.initializeHttpMetrics();
    this.initializeDatabaseMetrics();
    this.initializeCacheMetrics();
    this.initializeWebSocketMetrics();
    this.initializeBusinessMetrics();
    this.initializeQueueMetrics();
    this.initializeApiGatewayMetrics();
  }

  private initializeHttpMetrics(): void {
    this.httpRequestDuration = new Histogram({
      name: `${this.prefix}_http_request_duration_seconds`,
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code', 'service'],
      buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      registers: [this.registry],
    });

    this.httpRequestTotal = new Counter({
      name: `${this.prefix}_http_requests_total`,
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code', 'service'],
      registers: [this.registry],
    });

    this.httpRequestErrors = new Counter({
      name: `${this.prefix}_http_request_errors_total`,
      help: 'Total number of HTTP request errors',
      labelNames: ['method', 'route', 'error_type', 'service'],
      registers: [this.registry],
    });

    this.httpRequestSize = new Histogram({
      name: `${this.prefix}_http_request_size_bytes`,
      help: 'HTTP request size in bytes',
      labelNames: ['method', 'route', 'service'],
      buckets: [100, 1000, 10000, 100000, 1000000],
      registers: [this.registry],
    });

    this.httpResponseSize = new Histogram({
      name: `${this.prefix}_http_response_size_bytes`,
      help: 'HTTP response size in bytes',
      labelNames: ['method', 'route', 'service'],
      buckets: [100, 1000, 10000, 100000, 1000000],
      registers: [this.registry],
    });

    this.activeHttpConnections = new Gauge({
      name: `${this.prefix}_active_http_connections`,
      help: 'Number of active HTTP connections',
      registers: [this.registry],
    });
  }

  private initializeDatabaseMetrics(): void {
    this.dbQueryDuration = new Histogram({
      name: `${this.prefix}_db_query_duration_seconds`,
      help: 'Duration of database queries in seconds',
      labelNames: ['operation', 'table', 'database'],
      buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
      registers: [this.registry],
    });

    this.dbQueryTotal = new Counter({
      name: `${this.prefix}_db_queries_total`,
      help: 'Total number of database queries',
      labelNames: ['operation', 'table', 'database'],
      registers: [this.registry],
    });

    this.dbQueryErrors = new Counter({
      name: `${this.prefix}_db_query_errors_total`,
      help: 'Total number of database query errors',
      labelNames: ['operation', 'table', 'database', 'error_type'],
      registers: [this.registry],
    });

    this.dbConnectionsActive = new Gauge({
      name: `${this.prefix}_db_connections_active`,
      help: 'Number of active database connections',
      labelNames: ['database'],
      registers: [this.registry],
    });

    this.dbConnectionsIdle = new Gauge({
      name: `${this.prefix}_db_connections_idle`,
      help: 'Number of idle database connections',
      labelNames: ['database'],
      registers: [this.registry],
    });

    this.dbConnectionsTotal = new Gauge({
      name: `${this.prefix}_db_connections_total`,
      help: 'Total number of database connections',
      labelNames: ['database'],
      registers: [this.registry],
    });
  }

  private initializeCacheMetrics(): void {
    this.cacheHits = new Counter({
      name: `${this.prefix}_cache_hits_total`,
      help: 'Total number of cache hits',
      labelNames: ['cache_name', 'operation'],
      registers: [this.registry],
    });

    this.cacheMisses = new Counter({
      name: `${this.prefix}_cache_misses_total`,
      help: 'Total number of cache misses',
      labelNames: ['cache_name', 'operation'],
      registers: [this.registry],
    });

    this.cacheOperationDuration = new Histogram({
      name: `${this.prefix}_cache_operation_duration_seconds`,
      help: 'Duration of cache operations in seconds',
      labelNames: ['cache_name', 'operation'],
      buckets: [0.0001, 0.0005, 0.001, 0.005, 0.01, 0.025, 0.05, 0.1],
      registers: [this.registry],
    });

    this.cacheKeys = new Gauge({
      name: `${this.prefix}_cache_keys`,
      help: 'Number of keys in cache',
      labelNames: ['cache_name'],
      registers: [this.registry],
    });

    this.cacheMemoryUsage = new Gauge({
      name: `${this.prefix}_cache_memory_usage_bytes`,
      help: 'Cache memory usage in bytes',
      labelNames: ['cache_name'],
      registers: [this.registry],
    });
  }

  private initializeWebSocketMetrics(): void {
    this.websocketConnections = new Gauge({
      name: `${this.prefix}_websocket_connections`,
      help: 'Number of active WebSocket connections',
      labelNames: ['namespace'],
      registers: [this.registry],
    });

    this.websocketMessages = new Counter({
      name: `${this.prefix}_websocket_messages_total`,
      help: 'Total number of WebSocket messages',
      labelNames: ['namespace', 'event', 'direction'],
      registers: [this.registry],
    });

    this.websocketErrors = new Counter({
      name: `${this.prefix}_websocket_errors_total`,
      help: 'Total number of WebSocket errors',
      labelNames: ['namespace', 'error_type'],
      registers: [this.registry],
    });
  }

  private initializeBusinessMetrics(): void {
    this.userRegistrations = new Counter({
      name: `${this.prefix}_user_registrations_total`,
      help: 'Total number of user registrations',
      labelNames: ['registration_type'],
      registers: [this.registry],
    });

    this.userLogins = new Counter({
      name: `${this.prefix}_user_logins_total`,
      help: 'Total number of user logins',
      labelNames: ['login_type'],
      registers: [this.registry],
    });

    this.matchesCreated = new Counter({
      name: `${this.prefix}_matches_created_total`,
      help: 'Total number of matches created',
      labelNames: ['match_type'],
      registers: [this.registry],
    });

    this.messagesExchanged = new Counter({
      name: `${this.prefix}_messages_exchanged_total`,
      help: 'Total number of messages exchanged',
      labelNames: ['message_type'],
      registers: [this.registry],
    });

    this.paymentsProcessed = new Counter({
      name: `${this.prefix}_payments_processed_total`,
      help: 'Total number of payments processed',
      labelNames: ['payment_type', 'status'],
      registers: [this.registry],
    });

    this.paymentAmount = new Counter({
      name: `${this.prefix}_payment_amount_total`,
      help: 'Total payment amount processed',
      labelNames: ['currency', 'payment_type'],
      registers: [this.registry],
    });

    this.activeUsers = new Gauge({
      name: `${this.prefix}_active_users`,
      help: 'Number of currently active users',
      labelNames: ['time_window'],
      registers: [this.registry],
    });
  }

  private initializeQueueMetrics(): void {
    this.queueJobsActive = new Gauge({
      name: `${this.prefix}_queue_jobs_active`,
      help: 'Number of active queue jobs',
      labelNames: ['queue_name', 'job_type'],
      registers: [this.registry],
    });

    this.queueJobsCompleted = new Counter({
      name: `${this.prefix}_queue_jobs_completed_total`,
      help: 'Total number of completed queue jobs',
      labelNames: ['queue_name', 'job_type'],
      registers: [this.registry],
    });

    this.queueJobsFailed = new Counter({
      name: `${this.prefix}_queue_jobs_failed_total`,
      help: 'Total number of failed queue jobs',
      labelNames: ['queue_name', 'job_type', 'error_type'],
      registers: [this.registry],
    });

    this.queueJobDuration = new Histogram({
      name: `${this.prefix}_queue_job_duration_seconds`,
      help: 'Duration of queue jobs in seconds',
      labelNames: ['queue_name', 'job_type'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60, 120, 300],
      registers: [this.registry],
    });
  }

  private initializeApiGatewayMetrics(): void {
    this.rateLimitExceeded = new Counter({
      name: `${this.prefix}_rate_limit_exceeded_total`,
      help: 'Total number of rate limit exceeded events',
      labelNames: ['route', 'user_type'],
      registers: [this.registry],
    });

    this.circuitBreakerOpen = new Gauge({
      name: `${this.prefix}_circuit_breaker_open`,
      help: 'Circuit breaker open status (1 = open, 0 = closed)',
      labelNames: ['service', 'circuit_name'],
      registers: [this.registry],
    });

    this.upstreamServiceLatency = new Histogram({
      name: `${this.prefix}_upstream_service_latency_seconds`,
      help: 'Latency of upstream service calls',
      labelNames: ['service', 'operation'],
      buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10],
      registers: [this.registry],
    });
  }

  // HTTP Metrics Methods
  recordHttpRequest(method: string, route: string, statusCode: number, duration: number): void {
    this.httpRequestDuration.observe(
      { method, route, status_code: statusCode.toString(), service: this.serviceName },
      duration
    );
    this.httpRequestTotal.inc({ method, route, status_code: statusCode.toString(), service: this.serviceName });
  }

  recordHttpError(method: string, route: string, errorType: string): void {
    this.httpRequestErrors.inc({ method, route, error_type: errorType, service: this.serviceName });
  }

  recordHttpRequestSize(method: string, route: string, size: number): void {
    this.httpRequestSize.observe({ method, route, service: this.serviceName }, size);
  }

  recordHttpResponseSize(method: string, route: string, size: number): void {
    this.httpResponseSize.observe({ method, route, service: this.serviceName }, size);
  }

  incrementActiveConnections(): void {
    this.activeHttpConnections.inc();
  }

  decrementActiveConnections(): void {
    this.activeHttpConnections.dec();
  }

  // Database Metrics Methods
  recordDbQuery(operation: string, table: string, database: string, duration: number): void {
    this.dbQueryDuration.observe({ operation, table, database }, duration);
    this.dbQueryTotal.inc({ operation, table, database });
  }

  recordDbError(operation: string, table: string, database: string, errorType: string): void {
    this.dbQueryErrors.inc({ operation, table, database, error_type: errorType });
  }

  setDbConnections(database: string, active: number, idle: number, total: number): void {
    this.dbConnectionsActive.set({ database }, active);
    this.dbConnectionsIdle.set({ database }, idle);
    this.dbConnectionsTotal.set({ database }, total);
  }

  // Cache Metrics Methods
  recordCacheHit(cacheName: string, operation: string): void {
    this.cacheHits.inc({ cache_name: cacheName, operation });
  }

  recordCacheMiss(cacheName: string, operation: string): void {
    this.cacheMisses.inc({ cache_name: cacheName, operation });
  }

  recordCacheOperation(cacheName: string, operation: string, duration: number): void {
    this.cacheOperationDuration.observe({ cache_name: cacheName, operation }, duration);
  }

  setCacheStats(cacheName: string, keys: number, memoryUsage: number): void {
    this.cacheKeys.set({ cache_name: cacheName }, keys);
    this.cacheMemoryUsage.set({ cache_name: cacheName }, memoryUsage);
  }

  // WebSocket Metrics Methods
  setWebSocketConnections(namespace: string, count: number): void {
    this.websocketConnections.set({ namespace }, count);
  }

  recordWebSocketMessage(namespace: string, event: string, direction: 'inbound' | 'outbound'): void {
    this.websocketMessages.inc({ namespace, event, direction });
  }

  recordWebSocketError(namespace: string, errorType: string): void {
    this.websocketErrors.inc({ namespace, error_type: errorType });
  }

  // Business Metrics Methods
  recordUserRegistration(registrationType: string): void {
    this.userRegistrations.inc({ registration_type: registrationType });
  }

  recordUserLogin(loginType: string): void {
    this.userLogins.inc({ login_type: loginType });
  }

  recordMatchCreated(matchType: string): void {
    this.matchesCreated.inc({ match_type: matchType });
  }

  recordMessageExchanged(messageType: string): void {
    this.messagesExchanged.inc({ message_type: messageType });
  }

  recordPaymentProcessed(paymentType: string, status: string, amount: number, currency: string): void {
    this.paymentsProcessed.inc({ payment_type: paymentType, status });
    if (status === 'success') {
      this.paymentAmount.inc({ currency, payment_type: paymentType }, amount);
    }
  }

  setActiveUsers(timeWindow: string, count: number): void {
    this.activeUsers.set({ time_window: timeWindow }, count);
  }

  // Queue Metrics Methods
  setQueueJobsActive(queueName: string, jobType: string, count: number): void {
    this.queueJobsActive.set({ queue_name: queueName, job_type: jobType }, count);
  }

  recordQueueJobCompleted(queueName: string, jobType: string, duration: number): void {
    this.queueJobsCompleted.inc({ queue_name: queueName, job_type: jobType });
    this.queueJobDuration.observe({ queue_name: queueName, job_type: jobType }, duration);
  }

  recordQueueJobFailed(queueName: string, jobType: string, errorType: string): void {
    this.queueJobsFailed.inc({ queue_name: queueName, job_type: jobType, error_type: errorType });
  }

  // API Gateway Metrics Methods
  recordRateLimitExceeded(route: string, userType: string): void {
    this.rateLimitExceeded.inc({ route, user_type: userType });
  }

  setCircuitBreakerStatus(service: string, circuitName: string, isOpen: boolean): void {
    this.circuitBreakerOpen.set({ service, circuit_name: circuitName }, isOpen ? 1 : 0);
  }

  recordUpstreamServiceCall(service: string, operation: string, duration: number): void {
    this.upstreamServiceLatency.observe({ service, operation }, duration);
  }

  // Get metrics in Prometheus format
  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  // Get content type for Prometheus
  getContentType(): string {
    return this.registry.contentType;
  }

  // Get registry (for advanced usage)
  getRegistry(): Registry {
    return this.registry;
  }

  // Clear all metrics (useful for testing)
  clearMetrics(): void {
    this.registry.clear();
  }
}

// Export a singleton instance creator
let instance: MetricsCollector | null = null;

export function initializeMetrics(config: MetricsConfig): MetricsCollector {
  if (!instance) {
    instance = new MetricsCollector(config);
  }
  return instance;
}

export function getMetrics(): MetricsCollector {
  if (!instance) {
    throw new Error('Metrics not initialized. Call initializeMetrics() first.');
  }
  return instance;
}
