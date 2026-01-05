import os from 'os';

import axios from 'axios';

import { db } from '../infrastructure/database';
import { redis } from '../infrastructure/redis';
import { SystemHealth } from '../types';
import { logger } from '../utils/logger';

export class HealthService {
  private services = [
    { name: 'user-service', url: process.env.USER_SERVICE_URL },
    { name: 'payment-service', url: process.env.PAYMENT_SERVICE_URL },
    { name: 'moderation-service', url: process.env.MODERATION_SERVICE_URL },
    { name: 'analytics-service', url: process.env.ANALYTICS_SERVICE_URL },
    { name: 'messaging-service', url: process.env.MESSAGING_SERVICE_URL },
  ];

  async getSystemHealth(): Promise<SystemHealth> {
    const [serviceStatuses, databaseStatus, redisStatus, metrics] = await Promise.all([
      this.checkServices(),
      this.checkDatabase(),
      this.checkRedis(),
      this.getSystemMetrics(),
    ]);

    const overallStatus = this.determineOverallStatus(serviceStatuses, databaseStatus, redisStatus);

    return {
      status: overallStatus,
      services: serviceStatuses,
      database: databaseStatus,
      redis: redisStatus,
      metrics,
    };
  }

  private async checkServices() {
    const results = await Promise.allSettled(
      this.services.map(async (service) => {
        const startTime = Date.now();
        try {
          await axios.get(`${service.url}/health`, { timeout: 5000 });
          const responseTime = Date.now() - startTime;

          return {
            name: service.name,
            status: 'up' as const,
            responseTime,
            lastCheck: new Date(),
          };
        } catch (error: any) {
          return {
            name: service.name,
            status: 'down' as const,
            responseTime: Date.now() - startTime,
            lastCheck: new Date(),
            error: error.message,
          };
        }
      })
    );

    return results.map((result) =>
      result.status === 'fulfilled'
        ? result.value
        : {
            name: 'unknown',
            status: 'down' as const,
            responseTime: 0,
            lastCheck: new Date(),
            error: 'Service check failed',
          }
    );
  }

  private async checkDatabase() {
    const startTime = Date.now();
    try {
      await db.raw('SELECT 1');
      const latency = Date.now() - startTime;

      // Get connection pool info
      const pool = db.client.pool;
      const connections = pool.numUsed() + pool.numFree();

      return {
        status: 'up' as const,
        connections,
        latency,
      };
    } catch (error: any) {
      logger.error('Database health check failed:', error);
      return {
        status: 'down' as const,
        connections: 0,
        latency: Date.now() - startTime,
      };
    }
  }

  private async checkRedis() {
    const startTime = Date.now();
    try {
      await redis.get('health-check');
      const latency = Date.now() - startTime;

      // Get memory usage
      const info = await redis.getClient().info('memory');
      const memoryMatch = info.match(/used_memory:(\d+)/);
      const memory = memoryMatch ? parseInt(memoryMatch[1]) : 0;

      return {
        status: 'up' as const,
        memory,
        latency,
      };
    } catch (error: any) {
      logger.error('Redis health check failed:', error);
      return {
        status: 'down' as const,
        memory: 0,
        latency: Date.now() - startTime,
      };
    }
  }

  private getSystemMetrics() {
    const cpuUsage = (os.loadavg()[0] / os.cpus().length) * 100;
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const memoryUsage = ((totalMem - freeMem) / totalMem) * 100;

    return {
      cpu: Math.round(cpuUsage * 100) / 100,
      memory: Math.round(memoryUsage * 100) / 100,
      disk: 0, // Would need additional package to get disk usage
    };
  }

  private determineOverallStatus(
    services: any[],
    database: any,
    redis: any
  ): 'healthy' | 'degraded' | 'down' {
    if (database.status === 'down' || redis.status === 'down') {
      return 'down';
    }

    const downServices = services.filter((s) => s.status === 'down').length;
    const degradedServices = services.filter((s) => s.status === 'degraded').length;

    if (downServices > services.length / 2) {
      return 'down';
    }

    if (downServices > 0 || degradedServices > 0) {
      return 'degraded';
    }

    return 'healthy';
  }

  async getServiceLogs(serviceName: string, limit: number = 100) {
    // This would integrate with your logging infrastructure
    // For now, returning placeholder
    return {
      serviceName,
      logs: [],
      limit,
    };
  }

  async restartService(serviceName: string) {
    // This would integrate with your orchestration platform (k8s, docker, etc.)
    logger.info(`Restart requested for service: ${serviceName}`);
    throw new Error(
      'Service restart not implemented - requires orchestration platform integration'
    );
  }
}
