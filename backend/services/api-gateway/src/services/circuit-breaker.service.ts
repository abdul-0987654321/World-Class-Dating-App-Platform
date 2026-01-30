import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export enum CircuitState {
  CLOSED = 'CLOSED', // Normal operation
  OPEN = 'OPEN', // Circuit is open, requests fail fast
  HALF_OPEN = 'HALF_OPEN', // Testing if service has recovered
}

export interface CircuitBreakerConfig {
  failureThreshold: number; // Number of failures before opening circuit
  successThreshold: number; // Number of successes needed to close circuit from half-open
  timeout: number; // Time in ms to wait before attempting half-open
  resetTimeout: number; // Time in ms to wait before resetting failure count
}

export interface CircuitStats {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureTime: number;
  nextAttemptTime: number;
  totalRequests: number;
  totalFailures: number;
  totalSuccesses: number;
}

@Injectable()
export class CircuitBreakerService implements OnModuleDestroy {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private readonly circuits: Map<string, CircuitStats> = new Map();
  private readonly config: CircuitBreakerConfig;
  /** Track half-open timers so they can be cleared on reset/shutdown */
  private readonly halfOpenTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(private readonly configService: ConfigService) {
    this.config = {
      failureThreshold: 5,
      successThreshold: 2,
      timeout: 60000, // 1 minute
      resetTimeout: 300000, // 5 minutes
    };
  }

  /**
   * Clean up all timers on module destroy to prevent memory leaks
   */
  onModuleDestroy(): void {
    this.logger.log('Cleaning up circuit breaker timers');
    for (const [key, timer] of this.halfOpenTimers) {
      clearTimeout(timer);
    }
    this.halfOpenTimers.clear();
    this.circuits.clear();
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(
    circuitKey: string,
    fn: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<T> {
    const circuit = this.getCircuit(circuitKey);

    // Check if circuit is open
    if (circuit.state === CircuitState.OPEN) {
      const now = Date.now();

      // Check if it's time to attempt half-open
      if (now >= circuit.nextAttemptTime) {
        this.logger.log(`Circuit ${circuitKey} entering HALF_OPEN state`);
        circuit.state = CircuitState.HALF_OPEN;
        circuit.successes = 0;
      } else {
        // Circuit is still open, fail fast
        this.logger.warn(`Circuit ${circuitKey} is OPEN, failing fast`);

        if (fallback) {
          return fallback();
        }

        throw new Error(`Service ${circuitKey} is currently unavailable`);
      }
    }

    circuit.totalRequests++;

    try {
      // Execute the function
      const result = await fn();

      // Success
      this.onSuccess(circuitKey);
      return result;
    } catch (error) {
      // Failure
      this.onFailure(circuitKey);

      if (fallback) {
        this.logger.warn(`Circuit ${circuitKey} executing fallback`);
        return fallback();
      }

      throw error;
    }
  }

  /**
   * Handle successful execution
   */
  private onSuccess(circuitKey: string): void {
    const circuit = this.getCircuit(circuitKey);
    circuit.totalSuccesses++;

    if (circuit.state === CircuitState.HALF_OPEN) {
      circuit.successes++;

      if (circuit.successes >= this.config.successThreshold) {
        // Close the circuit
        this.logger.log(`Circuit ${circuitKey} closing after ${circuit.successes} successes`);
        circuit.state = CircuitState.CLOSED;
        circuit.failures = 0;
        circuit.successes = 0;
      }
    } else if (circuit.state === CircuitState.CLOSED) {
      // Reset failure count on success
      circuit.failures = 0;
    }
  }

  /**
   * Handle failed execution
   */
  private onFailure(circuitKey: string): void {
    const circuit = this.getCircuit(circuitKey);
    const now = Date.now();

    circuit.failures++;
    circuit.totalFailures++;
    circuit.lastFailureTime = now;

    if (circuit.state === CircuitState.HALF_OPEN) {
      // If we fail in half-open, go back to open
      this.logger.warn(`Circuit ${circuitKey} failed in HALF_OPEN, reopening circuit`);
      this.openCircuit(circuitKey);
    } else if (circuit.state === CircuitState.CLOSED) {
      // Check if we've exceeded the failure threshold
      if (circuit.failures >= this.config.failureThreshold) {
        this.logger.error(`Circuit ${circuitKey} opening after ${circuit.failures} failures`);
        this.openCircuit(circuitKey);
      }
    }
  }

  /**
   * Open a circuit
   */
  private openCircuit(circuitKey: string): void {
    const circuit = this.getCircuit(circuitKey);
    circuit.state = CircuitState.OPEN;
    circuit.nextAttemptTime = Date.now() + this.config.timeout;

    // Clear any existing half-open timer for this circuit to prevent duplicates
    const existingTimer = this.halfOpenTimers.get(circuitKey);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Schedule automatic transition to half-open (tracked for cleanup)
    const timer = setTimeout(() => {
      this.halfOpenTimers.delete(circuitKey);
      const currentCircuit = this.circuits.get(circuitKey);
      if (currentCircuit && currentCircuit.state === CircuitState.OPEN) {
        this.logger.log(`Circuit ${circuitKey} automatically entering HALF_OPEN state`);
        currentCircuit.state = CircuitState.HALF_OPEN;
        currentCircuit.successes = 0;
      }
    }, this.config.timeout);

    this.halfOpenTimers.set(circuitKey, timer);
  }

  /**
   * Get or create a circuit
   */
  private getCircuit(circuitKey: string): CircuitStats {
    if (!this.circuits.has(circuitKey)) {
      this.circuits.set(circuitKey, {
        state: CircuitState.CLOSED,
        failures: 0,
        successes: 0,
        lastFailureTime: 0,
        nextAttemptTime: 0,
        totalRequests: 0,
        totalFailures: 0,
        totalSuccesses: 0,
      });
    }

    return this.circuits.get(circuitKey)!;
  }

  /**
   * Get circuit status
   */
  getCircuitStatus(circuitKey: string): CircuitStats {
    return this.getCircuit(circuitKey);
  }

  /**
   * Get all circuits status
   */
  getAllCircuitsStatus(): Record<string, CircuitStats> {
    const status: Record<string, CircuitStats> = {};

    this.circuits.forEach((circuit, key) => {
      status[key] = { ...circuit };
    });

    return status;
  }

  /**
   * Reset a circuit manually (admin function)
   */
  resetCircuit(circuitKey: string): void {
    this.logger.log(`Manually resetting circuit ${circuitKey}`);
    // Clear associated timer to prevent dangling setTimeout from corrupting state
    const timer = this.halfOpenTimers.get(circuitKey);
    if (timer) {
      clearTimeout(timer);
      this.halfOpenTimers.delete(circuitKey);
    }
    this.circuits.delete(circuitKey);
  }

  /**
   * Reset all circuits (admin function)
   */
  resetAllCircuits(): void {
    this.logger.log('Manually resetting all circuits');
    // Clear all pending timers to prevent dangling setTimeouts
    for (const [key, timer] of this.halfOpenTimers) {
      clearTimeout(timer);
    }
    this.halfOpenTimers.clear();
    this.circuits.clear();
  }

  /**
   * Get circuit metrics for monitoring
   */
  getCircuitMetrics(circuitKey: string): {
    state: CircuitState;
    totalRequests: number;
    totalFailures: number;
    totalSuccesses: number;
    failureRate: number;
    uptime: number;
  } {
    const circuit = this.getCircuit(circuitKey);

    return {
      state: circuit.state,
      totalRequests: circuit.totalRequests,
      totalFailures: circuit.totalFailures,
      totalSuccesses: circuit.totalSuccesses,
      failureRate:
        circuit.totalRequests > 0 ? (circuit.totalFailures / circuit.totalRequests) * 100 : 0,
      uptime:
        circuit.totalRequests > 0 ? (circuit.totalSuccesses / circuit.totalRequests) * 100 : 100,
    };
  }
}
