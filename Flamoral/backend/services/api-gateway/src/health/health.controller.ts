import { Controller, Get, Res, HttpStatus, Inject, Optional } from '@nestjs/common';
import {
  HealthCheckService,
  HealthCheck,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { Public } from '../decorators/public.decorator';
import { ProxyService } from '../services/proxy.service';
import { CircuitBreakerService, CircuitState } from '../services/circuit-breaker.service';
import Redis from 'ioredis';

interface DependencyStatus {
  name: string;
  healthy: boolean;
  latency?: number;
  error?: string;
}

@Controller('health')
export class HealthController {
  private redis: Redis | null = null;
  private readonly startTime = Date.now();

  constructor(
    private readonly health: HealthCheckService,
    private readonly memory: MemoryHealthIndicator,
    private readonly disk: DiskHealthIndicator,
    private readonly configService: ConfigService,
    private readonly proxyService: ProxyService,
    private readonly circuitBreaker: CircuitBreakerService,
  ) {
    this.initializeRedis();
  }

  private initializeRedis(): void {
    try {
      this.redis = new Redis({
        host: this.configService.get<string>('redis.host') || 'localhost',
        port: this.configService.get<number>('redis.port') || 6379,
        password: this.configService.get<string>('redis.password'),
        db: this.configService.get<number>('redis.db') || 0,
        maxRetriesPerRequest: 1,
        connectTimeout: 2000,
        commandTimeout: 1000,
        lazyConnect: true,
        enableOfflineQueue: false,
      });
    } catch (error) {
      this.redis = null;
    }
  }

  /**
   * Basic health check - returns memory status
   */
  @Public()
  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      // Memory check - heap should not exceed 500MB
      () => this.memory.checkHeap('memory_heap', 500 * 1024 * 1024),
      // RSS memory should not exceed 1GB
      () => this.memory.checkRSS('memory_rss', 1024 * 1024 * 1024),
    ]);
  }

  /**
   * Readiness check - verifies all critical dependencies are available
   * Kubernetes uses this to determine if traffic should be sent to the pod
   */
  @Public()
  @Get('ready')
  async readiness(@Res() res: Response) {
    const checks: DependencyStatus[] = [];
    let overallHealthy = true;

    // Check Redis connectivity
    const redisStatus = await this.checkRedis();
    checks.push(redisStatus);
    if (!redisStatus.healthy) {
      // Redis is not critical - we have in-memory fallback
      // But mark as degraded
    }

    // Check circuit breaker health
    const circuitHealth = this.circuitBreaker.getHealthSummary();
    const criticalCircuitsOpen = circuitHealth.unhealthy > 0;

    // Check critical services (auth, payment)
    const criticalServices = ['authService', 'paymentService'];
    for (const serviceName of criticalServices) {
      const circuitStatus = this.circuitBreaker.getCircuitStatus(serviceName);
      if (circuitStatus.state === CircuitState.OPEN) {
        checks.push({
          name: serviceName,
          healthy: false,
          error: 'Circuit breaker open',
        });
        overallHealthy = false;
      } else {
        checks.push({
          name: serviceName,
          healthy: true,
        });
      }
    }

    // Check memory pressure
    const memoryUsage = process.memoryUsage();
    const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;
    const heapTotalMB = memoryUsage.heapTotal / 1024 / 1024;
    const heapUsagePercent = (heapUsedMB / heapTotalMB) * 100;

    if (heapUsagePercent > 90) {
      checks.push({
        name: 'memory',
        healthy: false,
        error: `High memory usage: ${heapUsagePercent.toFixed(1)}%`,
      });
      overallHealthy = false;
    } else {
      checks.push({
        name: 'memory',
        healthy: true,
      });
    }

    const response = {
      status: overallHealthy ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
      environment: this.configService.get<string>('nodeEnv'),
      checks,
      circuitBreakers: {
        healthy: circuitHealth.healthy,
        degraded: circuitHealth.degraded,
        unhealthy: circuitHealth.unhealthy,
      },
    };

    // Return appropriate HTTP status code for Kubernetes
    const httpStatus = overallHealthy ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;
    res.status(httpStatus).json(response);
  }

  /**
   * Liveness check - verifies the process is running and responsive
   * Kubernetes uses this to determine if the pod should be restarted
   */
  @Public()
  @Get('live')
  async liveness(@Res() res: Response) {
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();

    // Check for memory leaks (RSS growing continuously)
    const rssMB = memoryUsage.rss / 1024 / 1024;
    const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;

    // If RSS is over 2GB, consider unhealthy (potential memory leak)
    const memoryHealthy = rssMB < 2048;

    // Check if event loop is blocked (simple check)
    const eventLoopHealthy = true; // Could add more sophisticated check

    const healthy = memoryHealthy && eventLoopHealthy;

    const response = {
      status: healthy ? 'alive' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime,
      uptimeFormatted: this.formatUptime(uptime),
      pid: process.pid,
      memory: {
        rss: `${rssMB.toFixed(1)}MB`,
        heapUsed: `${heapUsedMB.toFixed(1)}MB`,
        heapTotal: `${(memoryUsage.heapTotal / 1024 / 1024).toFixed(1)}MB`,
      },
    };

    const httpStatus = healthy ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;
    res.status(httpStatus).json(response);
  }

  /**
   * Deep health check - checks all downstream services
   * Use sparingly as it makes network calls
   */
  @Public()
  @Get('services')
  async servicesHealth() {
    const serviceNames = this.proxyService.getServiceNames();
    const results: Record<string, any> = {};
    let healthyCount = 0;
    let totalCount = 0;

    for (const name of serviceNames) {
      totalCount++;
      const startTime = Date.now();
      const isHealthy = await this.proxyService.healthCheck(name);
      const latency = Date.now() - startTime;

      const circuitStatus = this.circuitBreaker.getCircuitStatus(name);
      const metrics = this.circuitBreaker.getCircuitMetrics(name);

      if (isHealthy && circuitStatus.state !== CircuitState.OPEN) {
        healthyCount++;
      }

      results[name] = {
        healthy: isHealthy,
        latency: `${latency}ms`,
        circuit: {
          state: circuitStatus.state,
          failures: circuitStatus.failures,
          successes: circuitStatus.successes,
        },
        metrics: {
          totalRequests: metrics.totalRequests,
          failureRate: `${metrics.failureRate.toFixed(2)}%`,
          slowCallRate: `${metrics.slowCallRate.toFixed(2)}%`,
          avgResponseTime: `${metrics.avgResponseTime.toFixed(0)}ms`,
          p95ResponseTime: `${metrics.p95ResponseTime.toFixed(0)}ms`,
          uptime: `${metrics.uptime.toFixed(2)}%`,
        },
      };
    }

    const overallStatus = healthyCount === totalCount ? 'healthy' :
      healthyCount > totalCount / 2 ? 'degraded' : 'unhealthy';

    return {
      status: overallStatus,
      summary: `${healthyCount}/${totalCount} services healthy`,
      services: results,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Circuit breaker status endpoint
   */
  @Public()
  @Get('circuits')
  async circuitsStatus() {
    const allCircuits = this.circuitBreaker.getAllCircuitsStatus();
    const summary = this.circuitBreaker.getHealthSummary();

    return {
      summary: {
        healthy: summary.healthy,
        degraded: summary.degraded,
        unhealthy: summary.unhealthy,
        total: summary.healthy + summary.degraded + summary.unhealthy,
      },
      circuits: allCircuits,
      config: this.circuitBreaker.getConfig(),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Detailed metrics endpoint for monitoring
   */
  @Public()
  @Get('metrics')
  async metrics() {
    const serviceNames = this.proxyService.getServiceNames();
    const circuitMetrics: Record<string, any> = {};

    for (const name of serviceNames) {
      circuitMetrics[name] = this.circuitBreaker.getCircuitMetrics(name);
    }

    const memoryUsage = process.memoryUsage();

    return {
      process: {
        uptime: process.uptime(),
        pid: process.pid,
        memory: {
          rss: memoryUsage.rss,
          heapUsed: memoryUsage.heapUsed,
          heapTotal: memoryUsage.heapTotal,
          external: memoryUsage.external,
        },
      },
      circuitBreakers: circuitMetrics,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Check Redis connectivity
   */
  private async checkRedis(): Promise<DependencyStatus> {
    if (!this.redis) {
      return {
        name: 'redis',
        healthy: false,
        error: 'Redis client not initialized',
      };
    }

    const startTime = Date.now();

    try {
      await this.redis.ping();
      return {
        name: 'redis',
        healthy: true,
        latency: Date.now() - startTime,
      };
    } catch (error) {
      return {
        name: 'redis',
        healthy: false,
        latency: Date.now() - startTime,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Format uptime in human readable format
   */
  private formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    parts.push(`${secs}s`);

    return parts.join(' ');
  }
}
