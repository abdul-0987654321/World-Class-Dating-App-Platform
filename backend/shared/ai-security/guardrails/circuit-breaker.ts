/**
 * AI Circuit Breaker
 *
 * Implements the circuit breaker pattern for AI service calls.
 * Automatically trips when error rate exceeds threshold, preventing
 * cascade failures and giving services time to recover.
 *
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Circuit is tripped, requests fail fast
 * - HALF_OPEN: Testing if service has recovered
 *
 * Features:
 * - Configurable failure thresholds
 * - Automatic recovery with half-open state
 * - Request timeout handling
 * - CloudWatch metrics integration
 * - Sliding window for error rate calculation
 */

import { CloudWatchClient, PutMetricDataCommand } from '@aws-sdk/client-cloudwatch';

import type { AIServiceName } from './kill-switch';

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerConfig {
  // Name of the service this circuit breaker protects
  serviceName: string;
  // Number of failures before opening the circuit (default: 5)
  failureThreshold?: number;
  // Percentage of failures to trip (0-100, default: 50)
  failureRateThreshold?: number;
  // Time in ms to wait before trying half-open (default: 30000)
  resetTimeoutMs?: number;
  // Number of successful calls in half-open to close circuit (default: 3)
  successThreshold?: number;
  // Sliding window size for calculating failure rate (default: 10)
  slidingWindowSize?: number;
  // Request timeout in ms (default: 30000)
  requestTimeoutMs?: number;
  // Enable CloudWatch metrics (default: true)
  enableMetrics?: boolean;
  // AWS region for CloudWatch
  region?: string;
  // Environment (dev, staging, prod)
  environment?: string;
  // Callback when circuit opens
  onOpen?: (reason: string) => void;
  // Callback when circuit closes
  onClose?: () => void;
  // Callback when circuit half-opens
  onHalfOpen?: () => void;
}

interface RequestResult {
  success: boolean;
  timestamp: number;
  duration?: number;
  error?: string;
}

/**
 * AI Circuit Breaker - Protects AI service calls from cascade failures
 */
export class AICircuitBreaker {
  private readonly config: Required<CircuitBreakerConfig>;
  private readonly cloudWatchClient: CloudWatchClient | null;
  private state: CircuitState = 'CLOSED';
  private lastStateChange: Date = new Date();
  private lastFailureTime: number = 0;
  private consecutiveSuccesses: number = 0;
  private results: RequestResult[] = [];
  private tripReason: string | null = null;

  constructor(config: CircuitBreakerConfig) {
    if (!config.serviceName) {
      throw new Error('CircuitBreakerConfig: serviceName is required');
    }

    this.config = {
      serviceName: config.serviceName,
      failureThreshold: config.failureThreshold ?? 5,
      failureRateThreshold: config.failureRateThreshold ?? 50,
      resetTimeoutMs: config.resetTimeoutMs ?? 30000,
      successThreshold: config.successThreshold ?? 3,
      slidingWindowSize: config.slidingWindowSize ?? 10,
      requestTimeoutMs: config.requestTimeoutMs ?? 30000,
      enableMetrics: config.enableMetrics ?? true,
      region: config.region ?? process.env.AWS_REGION ?? 'us-east-1',
      environment: config.environment ?? process.env.NODE_ENV ?? 'development',
      onOpen: config.onOpen ?? (() => {}),
      onClose: config.onClose ?? (() => {}),
      onHalfOpen: config.onHalfOpen ?? (() => {}),
    };

    this.cloudWatchClient = this.config.enableMetrics
      ? new CloudWatchClient({ region: this.config.region })
      : null;
  }

  /**
   * Get the current state of the circuit
   */
  getState(): CircuitState {
    // Check if we should transition from OPEN to HALF_OPEN
    if (this.state === 'OPEN') {
      const timeSinceLastFailure = Date.now() - this.lastFailureTime;
      if (timeSinceLastFailure >= this.config.resetTimeoutMs) {
        this.transitionTo('HALF_OPEN');
      }
    }
    return this.state;
  }

  /**
   * Get detailed circuit breaker statistics
   */
  getStats(): {
    state: CircuitState;
    lastStateChange: Date;
    failureCount: number;
    successCount: number;
    failureRate: number;
    consecutiveSuccesses: number;
    tripReason: string | null;
  } {
    const state = this.getState();
    const recentResults = this.getRecentResults();
    const failures = recentResults.filter(r => !r.success).length;
    const successes = recentResults.filter(r => r.success).length;
    const failureRate = recentResults.length > 0
      ? (failures / recentResults.length) * 100
      : 0;

    return {
      state,
      lastStateChange: this.lastStateChange,
      failureCount: failures,
      successCount: successes,
      failureRate,
      consecutiveSuccesses: this.consecutiveSuccesses,
      tripReason: this.tripReason,
    };
  }

  /**
   * Execute an operation with circuit breaker protection
   *
   * @param operation - The async operation to execute
   * @returns Promise<T> - The result of the operation
   * @throws Error if circuit is open or operation fails
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    const currentState = this.getState();

    // If circuit is OPEN, fail fast
    if (currentState === 'OPEN') {
      await this.emitMetric('CircuitBreakerRejection', 1);
      throw new CircuitOpenError(
        `Circuit breaker is OPEN for ${this.config.serviceName}`,
        this.tripReason || 'Unknown reason',
        this.config.resetTimeoutMs - (Date.now() - this.lastFailureTime)
      );
    }

    const startTime = Date.now();

    try {
      // Execute with timeout
      const result = await this.executeWithTimeout(operation);

      // Record success
      this.recordSuccess(Date.now() - startTime);

      return result;
    } catch (error: any) {
      // Record failure
      this.recordFailure(error.message, Date.now() - startTime);

      throw error;
    }
  }

  /**
   * Force trip the circuit breaker
   *
   * @param reason - Reason for tripping the circuit
   */
  trip(reason: string): void {
    this.tripReason = reason;
    this.transitionTo('OPEN');
    this.lastFailureTime = Date.now();
    console.warn(`[CircuitBreaker] ${this.config.serviceName} FORCE TRIPPED: ${reason}`);
  }

  /**
   * Reset the circuit breaker to closed state
   */
  reset(): void {
    this.transitionTo('CLOSED');
    this.consecutiveSuccesses = 0;
    this.results = [];
    this.tripReason = null;
    console.info(`[CircuitBreaker] ${this.config.serviceName} RESET to CLOSED`);
  }

  /**
   * Execute operation with timeout
   */
  private async executeWithTimeout<T>(operation: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Operation timed out after ${this.config.requestTimeoutMs}ms`));
      }, this.config.requestTimeoutMs);

      operation()
        .then((result) => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  /**
   * Record a successful operation
   */
  private recordSuccess(duration: number): void {
    this.results.push({
      success: true,
      timestamp: Date.now(),
      duration,
    });
    this.trimResults();

    // In HALF_OPEN state, count consecutive successes
    if (this.state === 'HALF_OPEN') {
      this.consecutiveSuccesses++;

      if (this.consecutiveSuccesses >= this.config.successThreshold) {
        this.transitionTo('CLOSED');
      }
    }

    this.emitMetric('RequestSuccess', 1);
    this.emitMetric('RequestDuration', duration);
  }

  /**
   * Record a failed operation
   */
  private recordFailure(error: string, duration: number): void {
    this.results.push({
      success: false,
      timestamp: Date.now(),
      duration,
      error,
    });
    this.trimResults();
    this.lastFailureTime = Date.now();

    // Reset consecutive successes on any failure
    this.consecutiveSuccesses = 0;

    // In HALF_OPEN state, any failure opens the circuit again
    if (this.state === 'HALF_OPEN') {
      this.tripReason = `Failed during recovery: ${error}`;
      this.transitionTo('OPEN');
    } else if (this.state === 'CLOSED') {
      // Check if we should trip the circuit
      this.checkTrip();
    }

    this.emitMetric('RequestFailure', 1);
    this.emitMetric('RequestDuration', duration);
  }

  /**
   * Check if circuit should be tripped
   */
  private checkTrip(): void {
    const recentResults = this.getRecentResults();

    if (recentResults.length < this.config.slidingWindowSize / 2) {
      // Not enough data to make a decision
      return;
    }

    const failures = recentResults.filter(r => !r.success);
    const failureRate = (failures.length / recentResults.length) * 100;

    // Trip if failure count exceeds threshold
    if (failures.length >= this.config.failureThreshold) {
      this.tripReason = `Failure count (${failures.length}) exceeded threshold (${this.config.failureThreshold})`;
      this.transitionTo('OPEN');
      return;
    }

    // Trip if failure rate exceeds threshold
    if (failureRate >= this.config.failureRateThreshold) {
      this.tripReason = `Failure rate (${failureRate.toFixed(1)}%) exceeded threshold (${this.config.failureRateThreshold}%)`;
      this.transitionTo('OPEN');
    }
  }

  /**
   * Get recent results within the sliding window
   */
  private getRecentResults(): RequestResult[] {
    return this.results.slice(-this.config.slidingWindowSize);
  }

  /**
   * Trim results to prevent memory growth
   */
  private trimResults(): void {
    if (this.results.length > this.config.slidingWindowSize * 2) {
      this.results = this.results.slice(-this.config.slidingWindowSize);
    }
  }

  /**
   * Transition to a new state
   */
  private transitionTo(newState: CircuitState): void {
    if (this.state === newState) return;

    const previousState = this.state;
    this.state = newState;
    this.lastStateChange = new Date();

    console.info(`[CircuitBreaker] ${this.config.serviceName}: ${previousState} -> ${newState}`);

    // Emit state transition metric
    this.emitMetric(`State_${newState}`, 1);

    // Invoke callbacks
    switch (newState) {
      case 'OPEN':
        this.config.onOpen(this.tripReason || 'Unknown reason');
        break;
      case 'CLOSED':
        this.tripReason = null;
        this.config.onClose();
        break;
      case 'HALF_OPEN':
        this.consecutiveSuccesses = 0;
        this.config.onHalfOpen();
        break;
    }
  }

  /**
   * Emit CloudWatch metric
   */
  private async emitMetric(metricName: string, value: number): Promise<void> {
    if (!this.cloudWatchClient) return;

    try {
      await this.cloudWatchClient.send(new PutMetricDataCommand({
        Namespace: `Flamoral/${this.config.environment}/CircuitBreaker`,
        MetricData: [
          {
            MetricName: metricName,
            Dimensions: [
              {
                Name: 'ServiceName',
                Value: this.config.serviceName,
              },
              {
                Name: 'Environment',
                Value: this.config.environment,
              },
            ],
            Value: value,
            Unit: metricName.includes('Duration') ? 'Milliseconds' : 'Count',
            Timestamp: new Date(),
          },
        ],
      }));
    } catch (error: any) {
      // Don't fail operations due to metric emission failure
      console.error('[CircuitBreaker] Failed to emit metric:', error.message);
    }
  }
}

/**
 * Custom error for circuit open state
 */
export class CircuitOpenError extends Error {
  public readonly reason: string;
  public readonly retryAfterMs: number;

  constructor(message: string, reason: string, retryAfterMs: number) {
    super(message);
    this.name = 'CircuitOpenError';
    this.reason = reason;
    this.retryAfterMs = Math.max(0, retryAfterMs);
  }
}

/**
 * Circuit breaker registry for managing multiple breakers
 */
class CircuitBreakerRegistry {
  private readonly breakers: Map<string, AICircuitBreaker> = new Map();

  /**
   * Get or create a circuit breaker for a service
   */
  getBreaker(config: CircuitBreakerConfig): AICircuitBreaker {
    const existing = this.breakers.get(config.serviceName);
    if (existing) {
      return existing;
    }

    const breaker = new AICircuitBreaker(config);
    this.breakers.set(config.serviceName, breaker);
    return breaker;
  }

  /**
   * Get all registered circuit breakers
   */
  getAllBreakers(): Map<string, AICircuitBreaker> {
    return new Map(this.breakers);
  }

  /**
   * Get status of all circuit breakers
   */
  getAllStatus(): Record<string, ReturnType<AICircuitBreaker['getStats']>> {
    const status: Record<string, ReturnType<AICircuitBreaker['getStats']>> = {};

    for (const [name, breaker] of this.breakers) {
      status[name] = breaker.getStats();
    }

    return status;
  }

  /**
   * Reset all circuit breakers
   */
  resetAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
  }

  /**
   * Trip all circuit breakers (emergency shutdown)
   */
  tripAll(reason: string): void {
    for (const breaker of this.breakers.values()) {
      breaker.trip(reason);
    }
  }
}

// Global registry instance
const registry = new CircuitBreakerRegistry();

/**
 * Get the global circuit breaker registry
 */
export function getCircuitBreakerRegistry(): CircuitBreakerRegistry {
  return registry;
}

/**
 * Create or get a circuit breaker for a specific AI service
 */
export function createCircuitBreaker(
  serviceName: string,
  options?: Partial<Omit<CircuitBreakerConfig, 'serviceName'>>
): AICircuitBreaker {
  return registry.getBreaker({
    serviceName,
    ...options,
  });
}

/**
 * Decorator/wrapper for functions to add circuit breaker protection
 */
export function withCircuitBreaker<T>(
  serviceName: string,
  operation: () => Promise<T>,
  options?: Partial<Omit<CircuitBreakerConfig, 'serviceName'>>
): () => Promise<T> {
  const breaker = createCircuitBreaker(serviceName, options);

  return () => breaker.execute(operation);
}

/**
 * Combined protection: Kill switch + Circuit breaker
 */
export async function withAIProtection<T>(
  serviceName: string,
  operation: () => Promise<T>,
  options?: {
    circuitBreakerConfig?: Partial<Omit<CircuitBreakerConfig, 'serviceName'>>;
    fallback?: () => Promise<T> | T;
  }
): Promise<T> {
  // Import kill switch dynamically to avoid circular dependency
  const { getKillSwitch, AI_ENABLED_SERVICES } = await import('./kill-switch');

  // Check if this is a valid AI service for kill switch
  const isKillSwitchService = AI_ENABLED_SERVICES.includes(serviceName as any);

  // Check kill switch first (if applicable)
  if (isKillSwitchService) {
    const killSwitch = getKillSwitch();
    const enabled = await killSwitch.isAIEnabled(serviceName as AIServiceName);

    if (!enabled) {
      console.warn(`[AIProtection] AI disabled for ${serviceName}, using fallback`);
      if (options?.fallback) {
        return options.fallback();
      }
      throw new Error(`AI is currently disabled for ${serviceName}`);
    }
  }

  // Then use circuit breaker
  const breaker = createCircuitBreaker(serviceName, options?.circuitBreakerConfig);

  try {
    return await breaker.execute(operation);
  } catch (error) {
    if (error instanceof CircuitOpenError && options?.fallback) {
      console.warn(`[AIProtection] Circuit open for ${serviceName}, using fallback`);
      return options.fallback();
    }
    throw error;
  }
}

export default AICircuitBreaker;
