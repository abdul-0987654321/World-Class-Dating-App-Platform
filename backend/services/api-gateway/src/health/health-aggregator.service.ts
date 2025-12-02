import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

export interface ServiceHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  details?: any;
  error?: string;
}

export interface AggregatedHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: ServiceHealth[];
  summary: {
    total: number;
    healthy: number;
    degraded: number;
    unhealthy: number;
  };
}

interface ServiceConfig {
  name: string;
  url: string;
  healthPath: string;
  timeout: number;
}

@Injectable()
export class HealthAggregatorService {
  private readonly logger = new Logger(HealthAggregatorService.name);
  private readonly httpClient: AxiosInstance;
  private readonly services: ServiceConfig[];
  private healthCache: AggregatedHealth | null = null;
  private lastCheck: number = 0;
  private readonly cacheTTL = 10000; // 10 seconds

  constructor(private readonly configService: ConfigService) {
    this.httpClient = axios.create({
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Configure services to check
    this.services = [
      {
        name: 'auth-service',
        url: this.configService.get('services.auth.url', 'http://localhost:3001'),
        healthPath: '/health',
        timeout: 3000,
      },
      {
        name: 'user-service',
        url: this.configService.get('services.user.url', 'http://localhost:3002'),
        healthPath: '/health',
        timeout: 3000,
      },
      {
        name: 'matching-service',
        url: this.configService.get('services.matching.url', 'http://localhost:3003'),
        healthPath: '/health',
        timeout: 3000,
      },
      {
        name: 'messaging-service',
        url: this.configService.get('services.messaging.url', 'http://localhost:3004'),
        healthPath: '/health',
        timeout: 3000,
      },
      {
        name: 'media-service',
        url: this.configService.get('services.media.url', 'http://localhost:3005'),
        healthPath: '/health',
        timeout: 3000,
      },
      {
        name: 'notification-service',
        url: this.configService.get('services.notification.url', 'http://localhost:3006'),
        healthPath: '/health',
        timeout: 3000,
      },
      {
        name: 'payment-service',
        url: this.configService.get('services.payment.url', 'http://localhost:3007'),
        healthPath: '/health',
        timeout: 3000,
      },
      {
        name: 'analytics-service',
        url: this.configService.get('services.analytics.url', 'http://localhost:3008'),
        healthPath: '/health',
        timeout: 3000,
      },
      {
        name: 'moderation-service',
        url: this.configService.get('services.moderation.url', 'http://localhost:3009'),
        healthPath: '/health',
        timeout: 3000,
      },
      {
        name: 'realtime-service',
        url: this.configService.get('services.realtime.url', 'http://localhost:3010'),
        healthPath: '/health',
        timeout: 3000,
      },
    ];
  }

  /**
   * Get aggregated health status of all services
   */
  async getAggregatedHealth(useCache: boolean = true): Promise<AggregatedHealth> {
    const now = Date.now();

    // Return cached result if still valid
    if (useCache && this.healthCache && (now - this.lastCheck) < this.cacheTTL) {
      return this.healthCache;
    }

    // Check all services in parallel
    const healthChecks = await Promise.allSettled(
      this.services.map(service => this.checkServiceHealth(service))
    );

    const services: ServiceHealth[] = healthChecks.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          name: this.services[index].name,
          status: 'unhealthy',
          responseTime: 0,
          error: result.reason?.message || 'Unknown error',
        };
      }
    });

    // Calculate summary
    const summary = {
      total: services.length,
      healthy: services.filter(s => s.status === 'healthy').length,
      degraded: services.filter(s => s.status === 'degraded').length,
      unhealthy: services.filter(s => s.status === 'unhealthy').length,
    };

    // Determine overall status
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
    if (summary.unhealthy > 0) {
      overallStatus = summary.unhealthy >= services.length / 2 ? 'unhealthy' : 'degraded';
    } else if (summary.degraded > 0) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'healthy';
    }

    const aggregated: AggregatedHealth = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      services,
      summary,
    };

    // Update cache
    this.healthCache = aggregated;
    this.lastCheck = now;

    // Log if any service is unhealthy
    if (overallStatus !== 'healthy') {
      this.logger.warn('System health degraded', aggregated);
    }

    return aggregated;
  }

  /**
   * Check health of a single service
   */
  private async checkServiceHealth(service: ServiceConfig): Promise<ServiceHealth> {
    const startTime = Date.now();

    try {
      const response = await this.httpClient.get(
        `${service.url}${service.healthPath}`,
        { timeout: service.timeout }
      );

      const responseTime = Date.now() - startTime;

      // Determine status based on response time
      let status: 'healthy' | 'degraded' | 'unhealthy';
      if (responseTime < 500) {
        status = 'healthy';
      } else if (responseTime < 2000) {
        status = 'degraded';
      } else {
        status = 'unhealthy';
      }

      return {
        name: service.name,
        status,
        responseTime,
        details: response.data,
      };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;

      return {
        name: service.name,
        status: 'unhealthy',
        responseTime,
        error: error.message || 'Service unavailable',
      };
    }
  }

  /**
   * Get health status of a specific service
   */
  async getServiceHealth(serviceName: string): Promise<ServiceHealth | null> {
    const service = this.services.find(s => s.name === serviceName);

    if (!service) {
      return null;
    }

    return this.checkServiceHealth(service);
  }

  /**
   * Check if all critical services are healthy
   */
  async areCriticalServicesHealthy(): Promise<boolean> {
    const criticalServices = ['auth-service', 'user-service', 'api-gateway'];
    const health = await this.getAggregatedHealth();

    return criticalServices.every(serviceName => {
      const service = health.services.find(s => s.name === serviceName);
      return service && service.status !== 'unhealthy';
    });
  }

  /**
   * Clear health cache
   */
  clearCache(): void {
    this.healthCache = null;
    this.lastCheck = 0;
  }
}
