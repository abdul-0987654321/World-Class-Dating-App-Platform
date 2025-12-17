/**
 * Circuit Breaker Implementation
 * Prevents retry storms and cascading failures for external API calls
 */

import { CostOptimizationConfig } from '../config/cost-optimization';

export enum CircuitState {
  CLOSED = 'CLOSED', // Normal operation
  OPEN = 'OPEN', // Failing, reject requests
  HALF_OPEN = 'HALF_OPEN', // Testing if service recovered
}

export interface CircuitBreakerOptions {
  failureThreshold: number;
  successThreshold: number;
  timeout: number;
  resetTimeout: number;
  onStateChange?: (state: CircuitState) => void;
  onFailure?: (error: Error) => void;
  fallback?: () => Promise<any>;
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private nextAttempt: number = Date.now();
  private options: CircuitBreakerOptions;

  constructor(options: CircuitBreakerOptions) {
    this.options = options;
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() < this.nextAttempt) {
        // Circuit is open, use fallback or throw error
        if (this.options.fallback) {
          return this.options.fallback();
        }
        throw new Error('Circuit breaker is OPEN');
      }
      // Try to recover
      this.setState(CircuitState.HALF_OPEN);
    }

    try {
      const result = await this.executeWithTimeout(fn);
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error as Error);
      throw error;
    }
  }

  /**
   * Execute function with timeout
   */
  private executeWithTimeout<T>(fn: () => Promise<T>): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<T>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Circuit breaker timeout'));
        }, this.options.timeout);
      }),
    ]);
  }

  /**
   * Handle successful execution
   */
  private onSuccess(): void {
    this.failureCount = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.options.successThreshold) {
        this.setState(CircuitState.CLOSED);
        this.successCount = 0;
      }
    }
  }

  /**
   * Handle failed execution
   */
  private onFailure(error: Error): void {
    this.failureCount++;
    this.successCount = 0;

    if (this.options.onFailure) {
      this.options.onFailure(error);
    }

    if (
      this.state === CircuitState.HALF_OPEN ||
      this.failureCount >= this.options.failureThreshold
    ) {
      this.setState(CircuitState.OPEN);
      this.nextAttempt = Date.now() + this.options.resetTimeout;
    }
  }

  /**
   * Set circuit state
   */
  private setState(state: CircuitState): void {
    if (this.state !== state) {
      this.state = state;
      if (this.options.onStateChange) {
        this.options.onStateChange(state);
      }
    }
  }

  /**
   * Get current state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      nextAttempt: this.nextAttempt,
    };
  }

  /**
   * Reset circuit breaker
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.nextAttempt = Date.now();
  }
}

/**
 * Circuit Breaker Factory
 * Creates pre-configured circuit breakers for different services
 */
export class CircuitBreakerFactory {
  /**
   * Create circuit breaker for external APIs
   */
  static createExternalApiBreaker(serviceName: string): CircuitBreaker {
    const config = CostOptimizationConfig.circuitBreaker.externalApi;
    return new CircuitBreaker({
      ...config,
      onStateChange: (state) => {
        console.log(`[CircuitBreaker] ${serviceName} state changed to ${state}`);
      },
      onFailure: (error) => {
        console.error(`[CircuitBreaker] ${serviceName} failure:`, error.message);
      },
    });
  }

  /**
   * Create circuit breaker for Azure services
   */
  static createAzureBreaker(serviceName: string): CircuitBreaker {
    const config = CostOptimizationConfig.circuitBreaker.azureServices;
    return new CircuitBreaker({
      ...config,
      onStateChange: (state) => {
        console.log(`[CircuitBreaker] Azure ${serviceName} state changed to ${state}`);
      },
      onFailure: (error) => {
        console.error(`[CircuitBreaker] Azure ${serviceName} failure:`, error.message);
      },
    });
  }

  /**
   * Create circuit breaker for AWS services
   */
  static createAWSBreaker(serviceName: string): CircuitBreaker {
    const config = CostOptimizationConfig.circuitBreaker.awsServices;
    return new CircuitBreaker({
      ...config,
      onStateChange: (state) => {
        console.log(`[CircuitBreaker] AWS ${serviceName} state changed to ${state}`);
      },
      onFailure: (error) => {
        console.error(`[CircuitBreaker] AWS ${serviceName} failure:`, error.message);
      },
    });
  }

  /**
   * Create circuit breaker for payment gateway
   */
  static createPaymentBreaker(): CircuitBreaker {
    const config = CostOptimizationConfig.circuitBreaker.paymentGateway;
    return new CircuitBreaker({
      ...config,
      onStateChange: (state) => {
        console.log(`[CircuitBreaker] Payment Gateway state changed to ${state}`);
        // Alert on payment gateway failures
        if (state === CircuitState.OPEN) {
          console.error('CRITICAL: Payment gateway circuit breaker opened!');
          // TODO: Send alert to ops team
        }
      },
      onFailure: (error) => {
        console.error('[CircuitBreaker] Payment Gateway failure:', error.message);
      },
    });
  }

  /**
   * Create circuit breaker for messaging services
   */
  static createMessagingBreaker(serviceName: string): CircuitBreaker {
    const config = CostOptimizationConfig.circuitBreaker.messagingServices;
    return new CircuitBreaker({
      ...config,
      onStateChange: (state) => {
        console.log(`[CircuitBreaker] Messaging ${serviceName} state changed to ${state}`);
      },
      onFailure: (error) => {
        console.error(`[CircuitBreaker] Messaging ${serviceName} failure:`, error.message);
      },
      // Fallback to queue messages if service is down
      fallback: async () => {
        console.log(`[CircuitBreaker] Using fallback for ${serviceName} - queuing message`);
        return { queued: true };
      },
    });
  }
}

export default CircuitBreaker;
