import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';
import { Client } from 'pg';
import Redis from 'ioredis';

/**
 * Helper class to manage test containers for integration tests
 * Uses Testcontainers library to spin up isolated dependencies
 */
export class TestContainerManager {
  private postgresContainer?: StartedTestContainer;
  private redisContainer?: StartedTestContainer;
  private mongoContainer?: StartedTestContainer;

  /**
   * Start PostgreSQL test container
   */
  async startPostgres(): Promise<{
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
    connectionString: string;
  }> {
    this.postgresContainer = await new GenericContainer('postgres:16-alpine')
      .withEnvironment({
        POSTGRES_DB: 'test_db',
        POSTGRES_USER: 'test_user',
        POSTGRES_PASSWORD: 'test_password',
      })
      .withExposedPorts(5432)
      .withWaitStrategy(Wait.forHealthCheck())
      .withHealthCheck({
        test: ['CMD-SHELL', 'pg_isready -U test_user'],
        interval: 1000,
        timeout: 3000,
        retries: 5,
      })
      .start();

    const host = this.postgresContainer.getHost();
    const port = this.postgresContainer.getMappedPort(5432);
    const database = 'test_db';
    const user = 'test_user';
    const password = 'test_password';

    return {
      host,
      port,
      database,
      user,
      password,
      connectionString: `postgresql://${user}:${password}@${host}:${port}/${database}`,
    };
  }

  /**
   * Start Redis test container
   */
  async startRedis(): Promise<{
    host: string;
    port: number;
    connectionString: string;
  }> {
    this.redisContainer = await new GenericContainer('redis:7-alpine')
      .withExposedPorts(6379)
      .withWaitStrategy(Wait.forHealthCheck())
      .withHealthCheck({
        test: ['CMD', 'redis-cli', 'ping'],
        interval: 1000,
        timeout: 3000,
        retries: 5,
      })
      .start();

    const host = this.redisContainer.getHost();
    const port = this.redisContainer.getMappedPort(6379);

    return {
      host,
      port,
      connectionString: `redis://${host}:${port}`,
    };
  }

  /**
   * Start MongoDB test container
   */
  async startMongo(): Promise<{
    host: string;
    port: number;
    connectionString: string;
  }> {
    this.mongoContainer = await new GenericContainer('mongo:7')
      .withExposedPorts(27017)
      .withWaitStrategy(Wait.forHealthCheck())
      .withHealthCheck({
        test: ['CMD', 'mongosh', '--eval', 'db.adminCommand("ping")'],
        interval: 1000,
        timeout: 3000,
        retries: 5,
      })
      .start();

    const host = this.mongoContainer.getHost();
    const port = this.mongoContainer.getMappedPort(27017);

    return {
      host,
      port,
      connectionString: `mongodb://${host}:${port}/test`,
    };
  }

  /**
   * Verify PostgreSQL connection
   */
  async verifyPostgresConnection(connectionString: string): Promise<boolean> {
    const client = new Client({ connectionString });
    try {
      await client.connect();
      const result = await client.query('SELECT 1');
      await client.end();
      return result.rows.length === 1;
    } catch (error) {
      console.error('PostgreSQL connection failed:', error);
      return false;
    }
  }

  /**
   * Verify Redis connection
   */
  async verifyRedisConnection(connectionString: string): Promise<boolean> {
    const redis = new Redis(connectionString);
    try {
      const pong = await redis.ping();
      await redis.quit();
      return pong === 'PONG';
    } catch (error) {
      console.error('Redis connection failed:', error);
      return false;
    }
  }

  /**
   * Clean up all test containers
   */
  async cleanup(): Promise<void> {
    const promises: Promise<void>[] = [];

    if (this.postgresContainer) {
      promises.push(this.postgresContainer.stop());
    }

    if (this.redisContainer) {
      promises.push(this.redisContainer.stop());
    }

    if (this.mongoContainer) {
      promises.push(this.mongoContainer.stop());
    }

    await Promise.all(promises);
  }

  /**
   * Start all containers at once
   */
  async startAll(): Promise<{
    postgres: Awaited<ReturnType<typeof this.startPostgres>>;
    redis: Awaited<ReturnType<typeof this.startRedis>>;
    mongo: Awaited<ReturnType<typeof this.startMongo>>;
  }> {
    const [postgres, redis, mongo] = await Promise.all([
      this.startPostgres(),
      this.startRedis(),
      this.startMongo(),
    ]);

    return { postgres, redis, mongo };
  }
}

/**
 * Singleton instance for use across tests
 */
let containerManager: TestContainerManager | null = null;

export const getContainerManager = (): TestContainerManager => {
  if (!containerManager) {
    containerManager = new TestContainerManager();
  }
  return containerManager;
};

export const cleanupContainerManager = async (): Promise<void> => {
  if (containerManager) {
    await containerManager.cleanup();
    containerManager = null;
  }
};
