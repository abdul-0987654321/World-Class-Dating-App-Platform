import { Injectable } from '@nestjs/common';
import { register, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';

@Injectable()
export class MetricsService {
  private readonly httpRequestDuration: Histogram<string>;
  private readonly httpRequestTotal: Counter<string>;
  private readonly httpRequestErrors: Counter<string>;
  private readonly activeConnections: Gauge<string>;
  private readonly websocketConnections: Gauge<string>;

  constructor() {
    // Enable default metrics (CPU, memory, etc.)
    collectDefaultMetrics({
      prefix: 'flamoral_api_gateway_',
      gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
    });

    // HTTP Request Duration
    this.httpRequestDuration = new Histogram({
      name: 'flamoral_http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
    });

    // HTTP Request Total
    this.httpRequestTotal = new Counter({
      name: 'flamoral_http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
    });

    // HTTP Request Errors
    this.httpRequestErrors = new Counter({
      name: 'flamoral_http_request_errors_total',
      help: 'Total number of HTTP request errors',
      labelNames: ['method', 'route', 'error_type'],
    });

    // Active HTTP Connections
    this.activeConnections = new Gauge({
      name: 'flamoral_active_http_connections',
      help: 'Number of active HTTP connections',
    });

    // WebSocket Connections
    this.websocketConnections = new Gauge({
      name: 'flamoral_websocket_connections',
      help: 'Number of active WebSocket connections',
    });
  }

  /**
   * Record HTTP request metrics
   */
  recordHttpRequest(method: string, route: string, statusCode: number, duration: number): void {
    this.httpRequestDuration.observe(
      { method, route, status_code: statusCode.toString() },
      duration
    );
    this.httpRequestTotal.inc({ method, route, status_code: statusCode.toString() });
  }

  /**
   * Record HTTP request error
   */
  recordHttpError(method: string, route: string, errorType: string): void {
    this.httpRequestErrors.inc({ method, route, error_type: errorType });
  }

  /**
   * Increment active connections
   */
  incrementActiveConnections(): void {
    this.activeConnections.inc();
  }

  /**
   * Decrement active connections
   */
  decrementActiveConnections(): void {
    this.activeConnections.dec();
  }

  /**
   * Set WebSocket connections count
   */
  setWebSocketConnections(count: number): void {
    this.websocketConnections.set(count);
  }

  /**
   * Get metrics in Prometheus format
   */
  async getMetrics(): Promise<string> {
    return register.metrics();
  }

  /**
   * Get content type for Prometheus metrics
   */
  getContentType(): string {
    return register.contentType;
  }

  /**
   * Clear all metrics (useful for testing)
   */
  clearMetrics(): void {
    register.clear();
  }
}
