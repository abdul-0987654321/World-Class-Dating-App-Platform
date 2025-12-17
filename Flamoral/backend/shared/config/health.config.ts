/**
 * Unified Health Check Configuration for Flamoral Platform
 *
 * Features:
 * - Liveness checks (is the service running?)
 * - Readiness checks (can the service handle traffic?)
 * - Dependency health checks (database, cache, external services)
 * - Detailed health metrics
 * - Kubernetes-compatible endpoints
 */

export interface HealthCheckConfig {
  serviceName: string;
  version?: string;
  dependencies?: HealthDependency[];
}

export interface HealthDependency {
  name: string;
  type: 'database' | 'cache' | 'queue' | 'http' | 'custom';
  critical: boolean; // If true, service is not ready when this dependency is unhealthy
  checkFn: () => Promise<HealthCheckResult>;
  timeout?: number; // Timeout in milliseconds
}

export interface HealthCheckResult {
  healthy: boolean;
  latency?: number;
  error?: string;
  details?: Record<string, any>;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  service: string;
  checks: Record<string, HealthCheckResult>;
  metadata?: Record<string, any>;
}

export class HealthChecker {
  private config: HealthCheckConfig;
  private startTime: number;
  private lastHealthCheck: HealthStatus | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor(config: HealthCheckConfig) {
    this.config = config;
    this.startTime = Date.now();
  }

  /**
   * Basic liveness check - is the process running?
   */
  async liveness(): Promise<HealthStatus> {
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);
    const memoryUsage = process.memoryUsage();
    const rssMB = memoryUsage.rss / 1024 / 1024;

    // Check for critical memory issues (> 2GB RSS)
    const memoryHealthy = rssMB < 2048;

    return {
      status: memoryHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime,
      version: this.config.version || '1.0.0',
      service: this.config.serviceName,
      checks: {
        memory: {
          healthy: memoryHealthy,
          details: {
            rss: `${rssMB.toFixed(1)}MB`,
            heapUsed: `${(memoryUsage.heapUsed / 1024 / 1024).toFixed(1)}MB`,
            heapTotal: `${(memoryUsage.heapTotal / 1024 / 1024).toFixed(1)}MB`,
          },
        },
        process: {
          healthy: true,
          details: {
            pid: process.pid,
            uptime,
            nodeVersion: process.version,
          },
        },
      },
      metadata: {
        hostname: process.env.HOSTNAME || 'unknown',
        environment: process.env.NODE_ENV || 'development',
      },
    };
  }

  /**
   * Readiness check - can the service handle requests?
   */
  async readiness(): Promise<HealthStatus> {
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);
    const checks: Record<string, HealthCheckResult> = {};
    let criticalFailures = 0;
    let degradedCount = 0;

    // Check all dependencies
    if (this.config.dependencies) {
      const checkPromises = this.config.dependencies.map(async (dep) => {
        const startTime = Date.now();
        const timeout = dep.timeout || 5000;

        try {
          const result = await Promise.race([
            dep.checkFn(),
            this.timeoutPromise(timeout),
          ]);

          const latency = Date.now() - startTime;

          checks[dep.name] = {
            ...result,
            latency,
          };

          if (!result.healthy) {
            if (dep.critical) {
              criticalFailures++;
            } else {
              degradedCount++;
            }
          }
        } catch (error) {
          checks[dep.name] = {
            healthy: false,
            error: (error as Error).message,
            latency: Date.now() - startTime,
          };

          if (dep.critical) {
            criticalFailures++;
          } else {
            degradedCount++;
          }
        }
      });

      await Promise.all(checkPromises);
    }

    // Check memory pressure
    const memoryUsage = process.memoryUsage();
    const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;
    const heapTotalMB = memoryUsage.heapTotal / 1024 / 1024;
    const heapUsagePercent = (heapUsedMB / heapTotalMB) * 100;

    checks.memory = {
      healthy: heapUsagePercent < 90,
      details: {
        heapUsagePercent: `${heapUsagePercent.toFixed(1)}%`,
        heapUsed: `${heapUsedMB.toFixed(1)}MB`,
        heapTotal: `${heapTotalMB.toFixed(1)}MB`,
      },
    };

    if (heapUsagePercent >= 90) {
      criticalFailures++;
    } else if (heapUsagePercent >= 75) {
      degradedCount++;
    }

    // Determine overall status
    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (criticalFailures > 0) {
      status = 'unhealthy';
    } else if (degradedCount > 0) {
      status = 'degraded';
    } else {
      status = 'healthy';
    }

    const healthStatus: HealthStatus = {
      status,
      timestamp: new Date().toISOString(),
      uptime,
      version: this.config.version || '1.0.0',
      service: this.config.serviceName,
      checks,
      metadata: {
        criticalFailures,
        degradedCount,
        totalChecks: Object.keys(checks).length,
        hostname: process.env.HOSTNAME || 'unknown',
        environment: process.env.NODE_ENV || 'development',
      },
    };

    this.lastHealthCheck = healthStatus;
    return healthStatus;
  }

  /**
   * Startup probe - is the service ready to start accepting traffic?
   */
  async startup(): Promise<HealthStatus> {
    // For now, startup is the same as readiness
    // In the future, we could add specific startup checks
    return this.readiness();
  }

  /**
   * Get detailed health metrics
   */
  async getDetailedHealth(): Promise<HealthStatus> {
    return this.readiness();
  }

  /**
   * Get last cached health check result
   */
  getLastHealthCheck(): HealthStatus | null {
    return this.lastHealthCheck;
  }

  /**
   * Start periodic health checks
   */
  startPeriodicHealthChecks(intervalMs: number = 30000): void {
    if (this.healthCheckInterval) {
      this.stopPeriodicHealthChecks();
    }

    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.readiness();
      } catch (error) {
        // Only log health check failures, not routine checks
        if (process.env.NODE_ENV !== 'production') {
          console.error('Periodic health check failed:', error);
        }
      }
    }, intervalMs);

    // Only log startup message in non-production
    if (process.env.NODE_ENV !== 'production') {
      console.log(`✓ Periodic health checks started (interval: ${intervalMs}ms)`);
    }
  }

  /**
   * Stop periodic health checks
   */
  stopPeriodicHealthChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      // Only log in non-production
      if (process.env.NODE_ENV !== 'production') {
        console.log('Periodic health checks stopped');
      }
    }
  }

  /**
   * Timeout promise helper
   */
  private timeoutPromise(ms: number): Promise<HealthCheckResult> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Health check timeout after ${ms}ms`));
      }, ms);
    });
  }
}

/**
 * Create common health check functions
 */
export class HealthCheckHelpers {
  /**
   * PostgreSQL health check
   */
  static createPostgresCheck(pool: any): () => Promise<HealthCheckResult> {
    return async () => {
      const startTime = Date.now();
      try {
        const result = await pool.query('SELECT 1');
        return {
          healthy: result.rowCount === 1,
          latency: Date.now() - startTime,
          details: {
            connected: true,
            totalCount: pool.totalCount,
            idleCount: pool.idleCount,
            waitingCount: pool.waitingCount,
          },
        };
      } catch (error) {
        return {
          healthy: false,
          latency: Date.now() - startTime,
          error: (error as Error).message,
        };
      }
    };
  }

  /**
   * Redis health check
   */
  static createRedisCheck(redis: any): () => Promise<HealthCheckResult> {
    return async () => {
      const startTime = Date.now();
      try {
        const result = await redis.ping();
        const info = await redis.info('memory');

        // Parse memory info
        const usedMemory = info.match(/used_memory:(\d+)/)?.[1];
        const maxMemory = info.match(/maxmemory:(\d+)/)?.[1];

        return {
          healthy: result === 'PONG',
          latency: Date.now() - startTime,
          details: {
            connected: true,
            usedMemory: usedMemory ? `${(parseInt(usedMemory) / 1024 / 1024).toFixed(1)}MB` : 'unknown',
            maxMemory: maxMemory ? `${(parseInt(maxMemory) / 1024 / 1024).toFixed(1)}MB` : 'unlimited',
          },
        };
      } catch (error) {
        return {
          healthy: false,
          latency: Date.now() - startTime,
          error: (error as Error).message,
        };
      }
    };
  }

  /**
   * MongoDB health check
   */
  static createMongoCheck(client: any): () => Promise<HealthCheckResult> {
    return async () => {
      const startTime = Date.now();
      try {
        await client.db().admin().ping();
        return {
          healthy: true,
          latency: Date.now() - startTime,
          details: {
            connected: true,
          },
        };
      } catch (error) {
        return {
          healthy: false,
          latency: Date.now() - startTime,
          error: (error as Error).message,
        };
      }
    };
  }

  /**
   * HTTP endpoint health check
   */
  static createHttpCheck(url: string, timeout: number = 5000): () => Promise<HealthCheckResult> {
    return async () => {
      const startTime = Date.now();
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Flamoral-HealthCheck/1.0',
          },
        });

        clearTimeout(timeoutId);

        return {
          healthy: response.ok,
          latency: Date.now() - startTime,
          details: {
            statusCode: response.status,
            statusText: response.statusText,
          },
        };
      } catch (error) {
        return {
          healthy: false,
          latency: Date.now() - startTime,
          error: (error as Error).message,
        };
      }
    };
  }

  /**
   * RabbitMQ health check
   */
  static createRabbitMQCheck(connection: any): () => Promise<HealthCheckResult> {
    return async () => {
      const startTime = Date.now();
      try {
        // Check if connection is open
        const isConnected = connection && !connection.connection.stream.destroyed;

        return {
          healthy: isConnected,
          latency: Date.now() - startTime,
          details: {
            connected: isConnected,
          },
        };
      } catch (error) {
        return {
          healthy: false,
          latency: Date.now() - startTime,
          error: (error as Error).message,
        };
      }
    };
  }

  /**
   * Custom check with retry logic
   */
  static createRetryableCheck(
    checkFn: () => Promise<boolean>,
    retries: number = 3,
    retryDelay: number = 1000
  ): () => Promise<HealthCheckResult> {
    return async () => {
      const startTime = Date.now();
      let lastError: Error | null = null;

      for (let i = 0; i < retries; i++) {
        try {
          const result = await checkFn();
          return {
            healthy: result,
            latency: Date.now() - startTime,
            details: {
              attempt: i + 1,
              retries,
            },
          };
        } catch (error) {
          lastError = error as Error;
          if (i < retries - 1) {
            await new Promise(resolve => setTimeout(resolve, retryDelay));
          }
        }
      }

      return {
        healthy: false,
        latency: Date.now() - startTime,
        error: lastError?.message || 'Unknown error',
        details: {
          attempts: retries,
        },
      };
    };
  }
}

/**
 * Express middleware for health checks
 */
export function createHealthCheckMiddleware(healthChecker: HealthChecker) {
  return {
    /**
     * Liveness endpoint: GET /health/live
     */
    liveness: async (req: any, res: any) => {
      try {
        const health = await healthChecker.liveness();
        const statusCode = health.status === 'healthy' ? 200 : 503;
        res.status(statusCode).json(health);
      } catch (error) {
        res.status(503).json({
          status: 'unhealthy',
          error: (error as Error).message,
        });
      }
    },

    /**
     * Readiness endpoint: GET /health/ready
     */
    readiness: async (req: any, res: any) => {
      try {
        const health = await healthChecker.readiness();
        const statusCode = health.status === 'unhealthy' ? 503 :
          health.status === 'degraded' ? 200 : 200;
        res.status(statusCode).json(health);
      } catch (error) {
        res.status(503).json({
          status: 'unhealthy',
          error: (error as Error).message,
        });
      }
    },

    /**
     * Startup endpoint: GET /health/startup
     */
    startup: async (req: any, res: any) => {
      try {
        const health = await healthChecker.startup();
        const statusCode = health.status === 'healthy' ? 200 : 503;
        res.status(statusCode).json(health);
      } catch (error) {
        res.status(503).json({
          status: 'unhealthy',
          error: (error as Error).message,
        });
      }
    },

    /**
     * Detailed health endpoint: GET /health
     */
    detailed: async (req: any, res: any) => {
      try {
        const health = await healthChecker.getDetailedHealth();
        res.status(200).json(health);
      } catch (error) {
        res.status(500).json({
          status: 'error',
          error: (error as Error).message,
        });
      }
    },
  };
}
