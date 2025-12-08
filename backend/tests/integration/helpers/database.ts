import { Knex, knex } from 'knex';
import { Client } from 'pg';
import Redis from 'ioredis';
import { MongoClient } from 'mongodb';

/**
 * Database helper for integration tests
 * Provides utilities to setup, seed, and teardown test databases
 */

export class DatabaseHelper {
  private knexInstance?: Knex;
  private redisClient?: Redis;
  private mongoClient?: MongoClient;

  /**
   * Initialize PostgreSQL connection using Knex
   */
  async initializePostgres(config: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
  }): Promise<Knex> {
    this.knexInstance = knex({
      client: 'pg',
      connection: config,
      pool: { min: 2, max: 10 },
      migrations: {
        directory: './migrations',
        extension: 'ts',
      },
      seeds: {
        directory: './seeds/test',
        extension: 'ts',
      },
    });

    return this.knexInstance;
  }

  /**
   * Initialize Redis connection
   */
  async initializeRedis(connectionString: string): Promise<Redis> {
    this.redisClient = new Redis(connectionString, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 3) return null;
        return Math.min(times * 50, 2000);
      },
    });

    return this.redisClient;
  }

  /**
   * Initialize MongoDB connection
   */
  async initializeMongo(connectionString: string): Promise<MongoClient> {
    this.mongoClient = new MongoClient(connectionString);
    await this.mongoClient.connect();
    return this.mongoClient;
  }

  /**
   * Run database migrations
   */
  async runMigrations(): Promise<void> {
    if (!this.knexInstance) {
      throw new Error('Knex instance not initialized');
    }
    await this.knexInstance.migrate.latest();
  }

  /**
   * Rollback all migrations
   */
  async rollbackMigrations(): Promise<void> {
    if (!this.knexInstance) {
      throw new Error('Knex instance not initialized');
    }
    await this.knexInstance.migrate.rollback(undefined, true);
  }

  /**
   * Seed database with test data
   */
  async seedDatabase(): Promise<void> {
    if (!this.knexInstance) {
      throw new Error('Knex instance not initialized');
    }
    await this.knexInstance.seed.run();
  }

  /**
   * Clear all tables in PostgreSQL
   */
  async clearPostgres(): Promise<void> {
    if (!this.knexInstance) {
      throw new Error('Knex instance not initialized');
    }

    // Get all table names
    const tables = await this.knexInstance.raw(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
    `);

    // Truncate all tables
    for (const table of tables.rows) {
      await this.knexInstance.raw(
        `TRUNCATE TABLE ${table.tablename} RESTART IDENTITY CASCADE`
      );
    }
  }

  /**
   * Clear Redis database
   */
  async clearRedis(): Promise<void> {
    if (!this.redisClient) {
      throw new Error('Redis client not initialized');
    }
    await this.redisClient.flushdb();
  }

  /**
   * Clear MongoDB database
   */
  async clearMongo(databaseName = 'test'): Promise<void> {
    if (!this.mongoClient) {
      throw new Error('MongoDB client not initialized');
    }

    const db = this.mongoClient.db(databaseName);
    const collections = await db.listCollections().toArray();

    for (const collection of collections) {
      await db.collection(collection.name).deleteMany({});
    }
  }

  /**
   * Clear all databases
   */
  async clearAll(): Promise<void> {
    await Promise.all([
      this.knexInstance ? this.clearPostgres() : Promise.resolve(),
      this.redisClient ? this.clearRedis() : Promise.resolve(),
      this.mongoClient ? this.clearMongo() : Promise.resolve(),
    ]);
  }

  /**
   * Insert test data into a table
   */
  async insert(table: string, data: any | any[]): Promise<void> {
    if (!this.knexInstance) {
      throw new Error('Knex instance not initialized');
    }
    await this.knexInstance(table).insert(data);
  }

  /**
   * Execute raw SQL query
   */
  async raw(sql: string, bindings?: any[]): Promise<any> {
    if (!this.knexInstance) {
      throw new Error('Knex instance not initialized');
    }
    return this.knexInstance.raw(sql, bindings);
  }

  /**
   * Cleanup all connections
   */
  async cleanup(): Promise<void> {
    const promises: Promise<any>[] = [];

    if (this.knexInstance) {
      promises.push(this.knexInstance.destroy());
    }

    if (this.redisClient) {
      promises.push(this.redisClient.quit());
    }

    if (this.mongoClient) {
      promises.push(this.mongoClient.close());
    }

    await Promise.all(promises);
  }

  /**
   * Get Knex instance
   */
  getKnex(): Knex {
    if (!this.knexInstance) {
      throw new Error('Knex instance not initialized');
    }
    return this.knexInstance;
  }

  /**
   * Get Redis client
   */
  getRedis(): Redis {
    if (!this.redisClient) {
      throw new Error('Redis client not initialized');
    }
    return this.redisClient;
  }

  /**
   * Get MongoDB client
   */
  getMongo(): MongoClient {
    if (!this.mongoClient) {
      throw new Error('MongoDB client not initialized');
    }
    return this.mongoClient;
  }
}

/**
 * Singleton instance
 */
let dbHelper: DatabaseHelper | null = null;

export const getDatabaseHelper = (): DatabaseHelper => {
  if (!dbHelper) {
    dbHelper = new DatabaseHelper();
  }
  return dbHelper;
};

export const cleanupDatabaseHelper = async (): Promise<void> => {
  if (dbHelper) {
    await dbHelper.cleanup();
    dbHelper = null;
  }
};
