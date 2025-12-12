import { Rate, Trend, Counter, Gauge } from 'k6/metrics';

/**
 * Custom metrics for performance testing
 */

// Error rates
export const errorRate = new Rate('errors');
export const authErrorRate = new Rate('auth_errors');
export const apiErrorRate = new Rate('api_errors');
export const dbErrorRate = new Rate('db_errors');

// Response time trends
export const apiLatency = new Trend('api_latency', true);
export const authLatency = new Trend('auth_latency', true);
export const dbQueryLatency = new Trend('db_query_latency', true);
export const uploadLatency = new Trend('upload_latency', true);
export const wsLatency = new Trend('websocket_latency', true);

// Endpoint-specific latencies
export const discoveryLatency = new Trend('discovery_latency', true);
export const matchingLatency = new Trend('matching_latency', true);
export const messagingLatency = new Trend('messaging_latency', true);
export const profileLatency = new Trend('profile_latency', true);
export const paymentLatency = new Trend('payment_latency', true);

// Counters
export const totalRequests = new Counter('total_requests');
export const successfulRequests = new Counter('successful_requests');
export const failedRequests = new Counter('failed_requests');

// Feature-specific counters
export const discoveryRequests = new Counter('discovery_requests');
export const matchRequests = new Counter('match_requests');
export const messageRequests = new Counter('message_requests');
export const uploadRequests = new Counter('upload_requests');
export const paymentRequests = new Counter('payment_requests');

// Business metrics
export const matchesCreated = new Counter('matches_created');
export const messagesCreated = new Counter('messages_created');
export const profilesViewed = new Counter('profiles_viewed');
export const paymentsProcessed = new Counter('payments_processed');
export const uploadsCompleted = new Counter('uploads_completed');

// Resource metrics
export const activeConnections = new Gauge('active_connections');
export const memoryUsage = new Gauge('memory_usage_mb');
export const cpuUsage = new Gauge('cpu_usage_percent');

// Database metrics
export const dbConnectionPoolSize = new Gauge('db_connection_pool_size');
export const dbActiveQueries = new Gauge('db_active_queries');
export const slowQueries = new Counter('slow_queries');

/**
 * Record a successful API request
 * @param {Object} response - HTTP response object
 * @param {Trend} latencyMetric - Latency metric to update
 */
export function recordSuccess(response, latencyMetric = apiLatency) {
  totalRequests.add(1);
  successfulRequests.add(1);
  latencyMetric.add(response.timings.duration);
  errorRate.add(0);
}

/**
 * Record a failed API request
 * @param {Object} response - HTTP response object
 * @param {Trend} latencyMetric - Latency metric to update
 */
export function recordFailure(response, latencyMetric = apiLatency) {
  totalRequests.add(1);
  failedRequests.add(1);
  if (response && response.timings) {
    latencyMetric.add(response.timings.duration);
  }
  errorRate.add(1);
}

/**
 * Check response and record metrics
 * @param {Object} response - HTTP response object
 * @param {Object} checks - Check definitions
 * @param {Trend} latencyMetric - Latency metric to update
 * @returns {boolean} True if all checks passed
 */
export function checkAndRecord(response, checks, latencyMetric = apiLatency) {
  const allPassed = Object.values(checks).every(checkFn => checkFn(response));

  if (allPassed) {
    recordSuccess(response, latencyMetric);
  } else {
    recordFailure(response, latencyMetric);
  }

  return allPassed;
}

/**
 * Create threshold definitions for k6 options
 * @param {Object} customThresholds - Custom threshold overrides
 * @returns {Object} Threshold definitions
 */
export function createThresholds(customThresholds = {}) {
  const defaultThresholds = {
    // HTTP metrics
    'http_req_duration': ['p(95)<200', 'p(99)<500'],
    'http_req_failed': ['rate<0.01'],
    'http_req_waiting': ['p(95)<180'],

    // Custom error rates
    'errors': ['rate<0.01'],
    'auth_errors': ['rate<0.005'],
    'api_errors': ['rate<0.01'],

    // Latency metrics
    'api_latency': ['p(95)<200', 'p(99)<400'],
    'auth_latency': ['p(95)<150', 'p(99)<300'],
    'db_query_latency': ['p(95)<100', 'p(99)<250'],

    // Endpoint-specific latencies
    'discovery_latency': ['p(95)<250', 'p(99)<500'],
    'matching_latency': ['p(95)<150', 'p(99)<300'],
    'messaging_latency': ['p(95)<100', 'p(99)<200'],
    'profile_latency': ['p(95)<150', 'p(99)<300'],
    'payment_latency': ['p(95)<300', 'p(99)<600'],

    // Upload metrics
    'upload_latency': ['p(95)<2000', 'p(99)<5000'],

    // WebSocket metrics
    'websocket_latency': ['p(95)<50', 'p(99)<100'],
  };

  return { ...defaultThresholds, ...customThresholds };
}

/**
 * Get summary statistics for a metric
 * @param {Object} data - k6 summary data
 * @param {string} metricName - Name of the metric
 * @returns {Object} Metric statistics
 */
export function getMetricStats(data, metricName) {
  const metric = data.metrics[metricName];
  if (!metric) return null;

  return {
    count: metric.values.count,
    min: metric.values.min,
    max: metric.values.max,
    avg: metric.values.avg,
    med: metric.values.med,
    p90: metric.values['p(90)'],
    p95: metric.values['p(95)'],
    p99: metric.values['p(99)'],
    rate: metric.values.rate,
  };
}
