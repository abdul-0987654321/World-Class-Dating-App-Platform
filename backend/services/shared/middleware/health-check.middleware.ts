import { Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  service: string;
  checks: {
    database?: HealthCheckResult;
    redis?: HealthCheckResult;
    externalServices?: HealthCheckResult;
  };
}

export interface HealthCheckResult {
  status: 'up' | 'down' | 'degraded';
  responseTime?: number;
  message?: string;
  lastChecked: string;
}

export interface ReadinessStatus {
  ready: boolean;
  timestamp: string;
  checks: {
    database: boolean;
    redis: boolean;
    dependencies: boolean;
  };
}

export class HealthCheckService {
  private logger = new Logger('HealthCheck');
  private startTime = Date.now();
  private serviceName: string;
  private serviceVersion: string;

  constructor(serviceName: string, serviceVersion: string = '1.0.0') {
    this.serviceName = serviceName;
    this.serviceVersion = serviceVersion;
  }

  /**
   * Liveness probe - checks if service is running
   */
  async liveness(req: Request, res: Response): Promise<void> {
    res.status(200).json({
      status: 'alive',
      timestamp: new Date().toISOString(),
      service: this.serviceName,
    });
  }

  /**
   * Readiness probe - checks if service is ready to accept traffic
   */
  async readiness(req: Request, res: Response): Promise<void> {
    try {
      const checks = await this.performReadinessChecks();

      const ready = Object.values(checks).every((check) => check === true);

      const status: ReadinessStatus = {
        ready,
        timestamp: new Date().toISOString(),
        checks,
      };

      res.status(ready ? 200 : 503).json(status);
    } catch (error: any) {
      this.logger.error('Readiness check failed', error);
      res.status(503).json({
        ready: false,
        timestamp: new Date().toISOString(),
        error: error.message,
      });
    }
  }

  /**
   * Full health check - detailed health information
   */
  async health(req: Request, res: Response): Promise<void> {
    try {
      const checks = await this.performHealthChecks();

      // Determine overall status
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

      const checkStatuses = Object.values(checks).map((c) => c?.status);

      if (checkStatuses.includes('down')) {
        status = 'unhealthy';
      } else if (checkStatuses.includes('degraded')) {
        status = 'degraded';
      }

      const healthStatus: HealthStatus = {
        status,
        timestamp: new Date().toISOString(),
        uptime: Date.now() - this.startTime,
        version: this.serviceVersion,
        service: this.serviceName,
        checks,
      };

      const statusCode = status === 'healthy' ? 200 : status === 'degraded' ? 200 : 503;

      res.status(statusCode).json(healthStatus);
    } catch (error: any) {
      this.logger.error('Health check failed', error);
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message,
      });
    }
  }

  /**
   * Perform readiness checks
   */
  private async performReadinessChecks(): Promise<{
    database: boolean;
    redis: boolean;
    dependencies: boolean;
  }> {
    return {
      database: await this.checkDatabase(),
      redis: await this.checkRedis(),
      dependencies: await this.checkDependencies(),
    };
  }

  /**
   * Perform detailed health checks
   */
  private async performHealthChecks(): Promise<{
    database?: HealthCheckResult;
    redis?: HealthCheckResult;
    externalServices?: HealthCheckResult;
  }> {
    const checks: any = {};

    // Check database
    try {
      const start = Date.now();
      const isUp = await this.checkDatabase();
      const responseTime = Date.now() - start;

      checks.database = {
        status: isUp ? 'up' : 'down',
        responseTime,
        lastChecked: new Date().toISOString(),
      };
    } catch (error: any) {
      checks.database = {
        status: 'down',
        message: error.message,
        lastChecked: new Date().toISOString(),
      };
    }

    // Check Redis
    try {
      const start = Date.now();
      const isUp = await this.checkRedis();
      const responseTime = Date.now() - start;

      checks.redis = {
        status: isUp ? 'up' : 'down',
        responseTime,
        lastChecked: new Date().toISOString(),
      };
    } catch (error: any) {
      checks.redis = {
        status: 'down',
        message: error.message,
        lastChecked: new Date().toISOString(),
      };
    }

    // Check external services
    try {
      const start = Date.now();
      const isUp = await this.checkDependencies();
      const responseTime = Date.now() - start;

      checks.externalServices = {
        status: isUp ? 'up' : 'degraded',
        responseTime,
        lastChecked: new Date().toISOString(),
      };
    } catch (error: any) {
      checks.externalServices = {
        status: 'degraded',
        message: error.message,
        lastChecked: new Date().toISOString(),
      };
    }

    return checks;
  }

  /**
   * Check database connection
   */
  private async checkDatabase(): Promise<boolean> {
    try {
      // In production, perform actual database ping
      // Example: await database.query('SELECT 1');
      return true;
    } catch (error) {
      this.logger.error('Database check failed', error);
      return false;
    }
  }

  /**
   * Check Redis connection
   */
  private async checkRedis(): Promise<boolean> {
    try {
      // In production, perform actual Redis ping
      // Example: await redis.ping();
      return true;
    } catch (error) {
      this.logger.error('Redis check failed', error);
      return false;
    }
  }

  /**
   * Check external dependencies
   */
  private async checkDependencies(): Promise<boolean> {
    try {
      // In production, check critical external services
      return true;
    } catch (error) {
      this.logger.error('Dependency check failed', error);
      return false;
    }
  }

  /**
   * Graceful shutdown handler
   */
  async gracefulShutdown(signal: string): Promise<void> {
    this.logger.log(`Received ${signal}, starting graceful shutdown...`);

    try {
      // Stop accepting new requests
      this.logger.log('Stopping new request acceptance...');

      // Wait for ongoing requests to complete (with timeout)
      await new Promise((resolve) => setTimeout(resolve, 10000)); // 10 seconds

      // Close database connections
      this.logger.log('Closing database connections...');
      // await database.close();

      // Close Redis connections
      this.logger.log('Closing Redis connections...');
      // await redis.quit();

      this.logger.log('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      this.logger.error('Error during graceful shutdown', error);
      process.exit(1);
    }
  }

  /**
   * Setup graceful shutdown handlers
   */
  setupGracefulShutdown(): void {
    const signals = ['SIGTERM', 'SIGINT', 'SIGUSR2'];

    signals.forEach((signal) => {
      process.on(signal, () => {
        this.gracefulShutdown(signal);
      });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      this.logger.error('Uncaught exception', error);
      this.gracefulShutdown('uncaughtException');
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      this.logger.error('Unhandled rejection', { reason, promise });
      this.gracefulShutdown('unhandledRejection');
    });
  }
}

/**
 * Create health check routes
 */
export function createHealthCheckRoutes(serviceName: string, serviceVersion?: string) {
  const healthCheckService = new HealthCheckService(serviceName, serviceVersion);

  // Setup graceful shutdown
  healthCheckService.setupGracefulShutdown();

  return {
    liveness: (req: Request, res: Response) => healthCheckService.liveness(req, res),
    readiness: (req: Request, res: Response) => healthCheckService.readiness(req, res),
    health: (req: Request, res: Response) => healthCheckService.health(req, res),
  };
}
