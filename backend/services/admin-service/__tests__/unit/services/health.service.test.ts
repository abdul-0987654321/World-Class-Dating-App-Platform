import { HealthService } from '../../../src/services/health.service';

// Mock os module
jest.mock('os', () => ({
  loadavg: jest.fn().mockReturnValue([2.0, 1.5, 1.0]),
  cpus: jest.fn().mockReturnValue([{}, {}, {}, {}]), // 4 CPUs
  totalmem: jest.fn().mockReturnValue(16000000000), // 16GB
  freemem: jest.fn().mockReturnValue(8000000000),   // 8GB free
}));

// Mock axios
jest.mock('axios', () => ({
  get: jest.fn(),
}));

// Mock the database
jest.mock('../../../src/infrastructure/database', () => {
  const mockDb = {
    raw: jest.fn(),
    client: {
      pool: {
        numUsed: jest.fn().mockReturnValue(3),
        numFree: jest.fn().mockReturnValue(7),
      },
    },
  };
  return { db: mockDb };
});

// Mock redis
jest.mock('../../../src/infrastructure/redis', () => ({
  redis: {
    get: jest.fn(),
    getClient: jest.fn().mockReturnValue({
      info: jest.fn(),
    }),
  },
}));

// Mock the logger
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

import axios from 'axios';
import os from 'os';

import { db } from '../../../src/infrastructure/database';
import { redis } from '../../../src/infrastructure/redis';
import { logger } from '../../../src/utils/logger';

describe('HealthService', () => {
  let healthService: HealthService;

  beforeEach(() => {
    healthService = new HealthService();
    jest.clearAllMocks();

    // Reset environment variables
    process.env.USER_SERVICE_URL = 'http://user-service:3001';
    process.env.PAYMENT_SERVICE_URL = 'http://payment-service:3002';
    process.env.MODERATION_SERVICE_URL = 'http://moderation-service:3003';
    process.env.ANALYTICS_SERVICE_URL = 'http://analytics-service:3004';
    process.env.MESSAGING_SERVICE_URL = 'http://messaging-service:3005';
  });

  describe('getSystemHealth', () => {
    beforeEach(() => {
      // Default successful mocks
      (axios.get as jest.Mock).mockResolvedValue({ data: { status: 'ok' } });
      (db.raw as jest.Mock).mockResolvedValue([{ '?column?': 1 }]);
      (redis.get as jest.Mock).mockResolvedValue(null);
      (redis.getClient().info as jest.Mock).mockResolvedValue('used_memory:1000000');
    });

    it('should return healthy status when all services are up', async () => {
      const health = await healthService.getSystemHealth();

      expect(health.status).toBe('healthy');
      expect(health.services).toHaveLength(5);
      expect(health.database.status).toBe('up');
      expect(health.redis.status).toBe('up');
    });

    it('should return service statuses with response times', async () => {
      const health = await healthService.getSystemHealth();

      health.services.forEach(service => {
        expect(service).toHaveProperty('name');
        expect(service).toHaveProperty('status');
        expect(service).toHaveProperty('responseTime');
        expect(service).toHaveProperty('lastCheck');
        expect(typeof service.responseTime).toBe('number');
      });
    });

    it('should return down status for failed services', async () => {
      (axios.get as jest.Mock)
        .mockResolvedValueOnce({ data: { status: 'ok' } })
        .mockRejectedValueOnce(new Error('Connection refused'))
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ data: { status: 'ok' } });

      const health = await healthService.getSystemHealth();

      const downServices = health.services.filter(s => s.status === 'down');
      expect(downServices.length).toBe(3);
      expect(downServices[0]).toHaveProperty('error');
    });

    it('should return down status when database is unavailable', async () => {
      (db.raw as jest.Mock).mockRejectedValue(new Error('Database connection failed'));

      const health = await healthService.getSystemHealth();

      expect(health.database.status).toBe('down');
      expect(health.status).toBe('down');
    });

    it('should return down status when redis is unavailable', async () => {
      (redis.get as jest.Mock).mockRejectedValue(new Error('Redis connection failed'));

      const health = await healthService.getSystemHealth();

      expect(health.redis.status).toBe('down');
      expect(health.status).toBe('down');
    });

    it('should return degraded status when some services are down', async () => {
      (axios.get as jest.Mock)
        .mockResolvedValueOnce({ data: { status: 'ok' } })
        .mockRejectedValueOnce(new Error('Service down'))
        .mockResolvedValueOnce({ data: { status: 'ok' } })
        .mockResolvedValueOnce({ data: { status: 'ok' } })
        .mockResolvedValueOnce({ data: { status: 'ok' } });

      const health = await healthService.getSystemHealth();

      expect(health.status).toBe('degraded');
    });

    it('should return down status when majority of services are down', async () => {
      (axios.get as jest.Mock)
        .mockRejectedValueOnce(new Error('Down'))
        .mockRejectedValueOnce(new Error('Down'))
        .mockRejectedValueOnce(new Error('Down'))
        .mockResolvedValueOnce({ data: { status: 'ok' } })
        .mockResolvedValueOnce({ data: { status: 'ok' } });

      const health = await healthService.getSystemHealth();

      expect(health.status).toBe('down');
    });

    it('should include database connection pool info', async () => {
      const health = await healthService.getSystemHealth();

      expect(health.database.connections).toBe(10); // 3 used + 7 free
      expect(health.database.latency).toBeGreaterThanOrEqual(0);
    });

    it('should include redis memory info', async () => {
      (redis.getClient().info as jest.Mock).mockResolvedValue('used_memory:5000000\nused_memory_human:5M');

      const health = await healthService.getSystemHealth();

      expect(health.redis.memory).toBe(5000000);
      expect(health.redis.latency).toBeGreaterThanOrEqual(0);
    });

    it('should handle redis info parsing when memory info not found', async () => {
      (redis.getClient().info as jest.Mock).mockResolvedValue('some_other_info:value');

      const health = await healthService.getSystemHealth();

      expect(health.redis.memory).toBe(0);
    });
  });

  describe('system metrics', () => {
    it('should return CPU usage based on load average', async () => {
      (os.loadavg as jest.Mock).mockReturnValue([2.0, 1.5, 1.0]);
      (os.cpus as jest.Mock).mockReturnValue([{}, {}, {}, {}]); // 4 CPUs

      (axios.get as jest.Mock).mockResolvedValue({ data: { status: 'ok' } });
      (db.raw as jest.Mock).mockResolvedValue([{ '?column?': 1 }]);
      (redis.get as jest.Mock).mockResolvedValue(null);
      (redis.getClient().info as jest.Mock).mockResolvedValue('used_memory:1000000');

      const health = await healthService.getSystemHealth();

      // CPU usage = (loadavg[0] / numCPUs) * 100 = (2.0 / 4) * 100 = 50%
      expect(health.metrics.cpu).toBe(50);
    });

    it('should return memory usage percentage', async () => {
      (os.totalmem as jest.Mock).mockReturnValue(16000000000);
      (os.freemem as jest.Mock).mockReturnValue(4000000000);

      (axios.get as jest.Mock).mockResolvedValue({ data: { status: 'ok' } });
      (db.raw as jest.Mock).mockResolvedValue([{ '?column?': 1 }]);
      (redis.get as jest.Mock).mockResolvedValue(null);
      (redis.getClient().info as jest.Mock).mockResolvedValue('used_memory:1000000');

      const health = await healthService.getSystemHealth();

      // Memory usage = ((16GB - 4GB) / 16GB) * 100 = 75%
      expect(health.metrics.memory).toBe(75);
    });

    it('should return disk usage as 0 (not implemented)', async () => {
      (axios.get as jest.Mock).mockResolvedValue({ data: { status: 'ok' } });
      (db.raw as jest.Mock).mockResolvedValue([{ '?column?': 1 }]);
      (redis.get as jest.Mock).mockResolvedValue(null);
      (redis.getClient().info as jest.Mock).mockResolvedValue('used_memory:1000000');

      const health = await healthService.getSystemHealth();

      expect(health.metrics.disk).toBe(0);
    });
  });

  describe('getServiceLogs', () => {
    it('should return placeholder logs', async () => {
      const result = await healthService.getServiceLogs('user-service');

      expect(result).toEqual({
        serviceName: 'user-service',
        logs: [],
        limit: 100,
      });
    });

    it('should respect custom limit', async () => {
      const result = await healthService.getServiceLogs('payment-service', 50);

      expect(result.limit).toBe(50);
    });
  });

  describe('restartService', () => {
    it('should throw error as not implemented', async () => {
      await expect(healthService.restartService('user-service'))
        .rejects.toThrow('Service restart not implemented - requires orchestration platform integration');
    });

    it('should log restart request', async () => {
      try {
        await healthService.restartService('analytics-service');
      } catch {
        // Expected to throw
      }

      expect(logger.info).toHaveBeenCalledWith(
        'Restart requested for service: analytics-service'
      );
    });
  });

  describe('determineOverallStatus', () => {
    it('should return down when database is down', async () => {
      (axios.get as jest.Mock).mockResolvedValue({ data: { status: 'ok' } });
      (db.raw as jest.Mock).mockRejectedValue(new Error('DB error'));
      (redis.get as jest.Mock).mockResolvedValue(null);
      (redis.getClient().info as jest.Mock).mockResolvedValue('used_memory:1000000');

      const health = await healthService.getSystemHealth();

      expect(health.status).toBe('down');
    });

    it('should return down when redis is down', async () => {
      (axios.get as jest.Mock).mockResolvedValue({ data: { status: 'ok' } });
      (db.raw as jest.Mock).mockResolvedValue([{ '?column?': 1 }]);
      (redis.get as jest.Mock).mockRejectedValue(new Error('Redis error'));

      const health = await healthService.getSystemHealth();

      expect(health.status).toBe('down');
    });

    it('should return healthy when all components are up', async () => {
      (axios.get as jest.Mock).mockResolvedValue({ data: { status: 'ok' } });
      (db.raw as jest.Mock).mockResolvedValue([{ '?column?': 1 }]);
      (redis.get as jest.Mock).mockResolvedValue(null);
      (redis.getClient().info as jest.Mock).mockResolvedValue('used_memory:1000000');

      const health = await healthService.getSystemHealth();

      expect(health.status).toBe('healthy');
    });
  });

  describe('service health check timeout', () => {
    it('should handle timeout errors gracefully', async () => {
      const timeoutError = new Error('timeout of 5000ms exceeded');
      (axios.get as jest.Mock).mockRejectedValue(timeoutError);
      (db.raw as jest.Mock).mockResolvedValue([{ '?column?': 1 }]);
      (redis.get as jest.Mock).mockResolvedValue(null);
      (redis.getClient().info as jest.Mock).mockResolvedValue('used_memory:1000000');

      const health = await healthService.getSystemHealth();

      expect(health.services.every(s => s.status === 'down')).toBe(true);
      expect(health.services[0].error).toContain('timeout');
    });
  });

  describe('error logging', () => {
    it('should log database health check failure', async () => {
      (axios.get as jest.Mock).mockResolvedValue({ data: { status: 'ok' } });
      (db.raw as jest.Mock).mockRejectedValue(new Error('Connection lost'));
      (redis.get as jest.Mock).mockResolvedValue(null);
      (redis.getClient().info as jest.Mock).mockResolvedValue('used_memory:1000000');

      await healthService.getSystemHealth();

      expect(logger.error).toHaveBeenCalledWith(
        'Database health check failed:',
        expect.any(Error)
      );
    });

    it('should log redis health check failure', async () => {
      (axios.get as jest.Mock).mockResolvedValue({ data: { status: 'ok' } });
      (db.raw as jest.Mock).mockResolvedValue([{ '?column?': 1 }]);
      (redis.get as jest.Mock).mockRejectedValue(new Error('Redis timeout'));

      await healthService.getSystemHealth();

      expect(logger.error).toHaveBeenCalledWith(
        'Redis health check failed:',
        expect.any(Error)
      );
    });
  });
});
