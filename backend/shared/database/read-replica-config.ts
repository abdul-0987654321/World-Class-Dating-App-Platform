import { Knex } from 'knex';
import { getOptimizedKnexConfig } from './connection-pool-config';
import createLogger from '../utils/logger';

const logger = createLogger('read-replica');

/**
 * Read Replica Configuration and Management
 *
 * This module provides configuration and utilities for PostgreSQL read replicas
 * to scale read operations and reduce load on the primary database.
 *
 * Features:
 * - Primary/Replica connection management
 * - Automatic read/write routing
 * - Replica health checking
 * - Failover handling
 * - Replication lag monitoring
 */

export interface ReplicaConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  priority?: number; // Lower is higher priority
}

export interface ReplicationLag {
  replicaHost: string;
  lagBytes: number;
  lagSeconds: number;
  isHealthy: boolean;
}

/**
 * Database Connection Manager with Read Replica Support
 */
export class DatabaseConnectionManager {
  private primaryConnection: Knex | null = null;
  private replicaConnections: Map<string, Knex> = new Map();
  private replicaConfigs: ReplicaConfig[] = [];
  private currentReplicaIndex: number = 0;
  private readonly replicaLagThresholdSeconds: number = 5;

  constructor(
    private environment: 'development' | 'test' | 'staging' | 'production',
    private serviceType: 'high-traffic' | 'medium-traffic' | 'low-traffic' = 'medium-traffic'
  ) {}

  /**
   * Initialize primary database connection
   */
  async initializePrimary(config?: Partial<Knex.Config>): Promise<void> {
    try {
      const baseConfig = getOptimizedKnexConfig(this.environment, this.serviceType);
      this.primaryConnection = require('knex')({
        ...baseConfig,
        ...config,
      });

      // Test connection
      await this.primaryConnection!.raw('SELECT 1');
      logger.info('Primary database connection established');
    } catch (error) {
      logger.error('Failed to initialize primary connection', error);
      throw error;
    }
  }

  /**
   * Add read replica configuration
   */
  addReplica(config: ReplicaConfig): void {
    this.replicaConfigs.push(config);
    logger.info(`Added replica configuration: ${config.host}:${config.port}`);
  }

  /**
   * Initialize all read replica connections
   */
  async initializeReplicas(): Promise<void> {
    if (this.replicaConfigs.length === 0) {
      logger.warn('No read replicas configured');
      return;
    }

    // Sort by priority
    this.replicaConfigs.sort((a, b) => (a.priority || 0) - (b.priority || 0));

    for (const config of this.replicaConfigs) {
      try {
        const replicaKey = `${config.host}:${config.port}`;
        const baseConfig = getOptimizedKnexConfig(this.environment, this.serviceType);

        const replicaConnection = require('knex')({
          ...baseConfig,
          connection: {
            host: config.host,
            port: config.port,
            database: config.database,
            user: config.user,
            password: config.password,
            ssl: this.environment === 'production' ? { rejectUnauthorized: false } : false,
          },
        });

        // Test connection
        await replicaConnection.raw('SELECT 1');
        this.replicaConnections.set(replicaKey, replicaConnection);
        logger.info(`Read replica connected: ${replicaKey}`);
      } catch (error) {
        logger.error(`Failed to connect to replica ${config.host}:${config.port}`, error);
      }
    }
  }

  /**
   * Get primary connection (for writes)
   */
  getPrimary(): Knex {
    if (!this.primaryConnection) {
      throw new Error('Primary connection not initialized');
    }
    return this.primaryConnection;
  }

  /**
   * Get read replica connection (round-robin)
   */
  getReplica(): Knex {
    // Fallback to primary if no replicas available
    if (this.replicaConnections.size === 0) {
      logger.warn('No replicas available, using primary for read');
      return this.getPrimary();
    }

    const replicas = Array.from(this.replicaConnections.values());
    const replica = replicas[this.currentReplicaIndex % replicas.length];
    this.currentReplicaIndex = (this.currentReplicaIndex + 1) % replicas.length;

    return replica;
  }

  /**
   * Execute write query (always on primary)
   */
  async write<T = any>(queryBuilder: (knex: Knex) => Promise<T>): Promise<T> {
    return queryBuilder(this.getPrimary());
  }

  /**
   * Execute read query (on replica with fallback to primary)
   */
  async read<T = any>(queryBuilder: (knex: Knex) => Promise<T>, forcePrimary = false): Promise<T> {
    if (forcePrimary || this.replicaConnections.size === 0) {
      return queryBuilder(this.getPrimary());
    }

    try {
      return await queryBuilder(this.getReplica());
    } catch (error) {
      logger.warn('Read from replica failed, falling back to primary', error);
      return queryBuilder(this.getPrimary());
    }
  }

  /**
   * Check replication lag for all replicas
   */
  async checkReplicationLag(): Promise<ReplicationLag[]> {
    const lags: ReplicationLag[] = [];

    for (const [replicaKey, replica] of this.replicaConnections.entries()) {
      try {
        const result = await replica.raw(`
          SELECT
            CASE
              WHEN pg_last_wal_receive_lsn() = pg_last_wal_replay_lsn()
              THEN 0
              ELSE EXTRACT(EPOCH FROM now() - pg_last_xact_replay_timestamp())
            END AS lag_seconds,
            pg_wal_lsn_diff(pg_last_wal_receive_lsn(), pg_last_wal_replay_lsn()) AS lag_bytes;
        `);

        const lagSeconds = parseFloat(result.rows[0]?.lag_seconds || 0);
        const lagBytes = parseInt(result.rows[0]?.lag_bytes || 0);

        lags.push({
          replicaHost: replicaKey,
          lagSeconds,
          lagBytes,
          isHealthy: lagSeconds < this.replicaLagThresholdSeconds,
        });
      } catch (error) {
        logger.error(`Failed to check replication lag for ${replicaKey}`, error);
        lags.push({
          replicaHost: replicaKey,
          lagSeconds: -1,
          lagBytes: -1,
          isHealthy: false,
        });
      }
    }

    return lags;
  }

  /**
   * Get healthy replicas only
   */
  async getHealthyReplicas(): Promise<string[]> {
    const lags = await this.checkReplicationLag();
    return lags.filter((lag) => lag.isHealthy).map((lag) => lag.replicaHost);
  }

  /**
   * Remove unhealthy replica from pool
   */
  async removeUnhealthyReplica(replicaKey: string): Promise<void> {
    const connection = this.replicaConnections.get(replicaKey);
    if (connection) {
      await connection.destroy();
      this.replicaConnections.delete(replicaKey);
      logger.warn(`Removed unhealthy replica: ${replicaKey}`);
    }
  }

  /**
   * Health check for all connections
   */
  async healthCheck(): Promise<{
    primary: boolean;
    replicas: { [key: string]: boolean };
    replicationLags: ReplicationLag[];
  }> {
    const health: any = {
      primary: false,
      replicas: {},
      replicationLags: [],
    };

    // Check primary
    try {
      await this.primaryConnection?.raw('SELECT 1');
      health.primary = true;
    } catch (error) {
      logger.error('Primary health check failed', error);
    }

    // Check replicas
    for (const [replicaKey, replica] of this.replicaConnections.entries()) {
      try {
        await replica.raw('SELECT 1');
        health.replicas[replicaKey] = true;
      } catch (error) {
        logger.error(`Replica ${replicaKey} health check failed`, error);
        health.replicas[replicaKey] = false;
      }
    }

    // Check replication lag
    health.replicationLags = await this.checkReplicationLag();

    return health;
  }

  /**
   * Close all connections
   */
  async closeAll(): Promise<void> {
    // Close primary
    if (this.primaryConnection) {
      await this.primaryConnection.destroy();
      logger.info('Primary connection closed');
    }

    // Close replicas
    for (const [replicaKey, replica] of this.replicaConnections.entries()) {
      await replica.destroy();
      logger.info(`Replica connection closed: ${replicaKey}`);
    }

    this.replicaConnections.clear();
  }
}

/**
 * Simple query router for read/write operations
 */
export class QueryRouter {
  constructor(private connectionManager: DatabaseConnectionManager) {}

  /**
   * Route query based on operation type
   */
  async route<T = any>(
    operation: 'read' | 'write',
    queryBuilder: (knex: Knex) => Promise<T>,
    forcePrimary = false
  ): Promise<T> {
    if (operation === 'write') {
      return this.connectionManager.write(queryBuilder);
    } else {
      return this.connectionManager.read(queryBuilder, forcePrimary);
    }
  }

  /**
   * Execute transaction (always on primary)
   */
  async transaction<T = any>(
    transactionBuilder: (trx: Knex.Transaction) => Promise<T>
  ): Promise<T> {
    const primary = this.connectionManager.getPrimary();
    return primary.transaction(transactionBuilder);
  }
}

/**
 * Utility function to determine if query is a write operation
 */
export function isWriteQuery(query: string): boolean {
  const writeKeywords = ['INSERT', 'UPDATE', 'DELETE', 'CREATE', 'ALTER', 'DROP', 'TRUNCATE'];
  const upperQuery = query.trim().toUpperCase();
  return writeKeywords.some((keyword) => upperQuery.startsWith(keyword));
}

/**
 * Environment-based replica configuration loader
 */
export function loadReplicaConfig(): ReplicaConfig[] {
  const replicaConfig: ReplicaConfig[] = [];
  const replicaCount = parseInt(process.env.DB_REPLICA_COUNT || '0');

  for (let i = 1; i <= replicaCount; i++) {
    const host = process.env[`DB_REPLICA_${i}_HOST`];
    const port = process.env[`DB_REPLICA_${i}_PORT`];
    const database = process.env[`DB_REPLICA_${i}_NAME`];
    const user = process.env[`DB_REPLICA_${i}_USER`];
    const password = process.env[`DB_REPLICA_${i}_PASSWORD`];
    const priority = parseInt(process.env[`DB_REPLICA_${i}_PRIORITY`] || `${i}`);

    if (host && port && database && user && password) {
      replicaConfig.push({
        host,
        port: parseInt(port),
        database,
        user,
        password,
        priority,
      });
    }
  }

  return replicaConfig;
}

/**
 * Example usage configuration
 */
export async function initializeDatabaseConnections(
  environment: 'development' | 'test' | 'staging' | 'production',
  serviceType: 'high-traffic' | 'medium-traffic' | 'low-traffic' = 'medium-traffic'
): Promise<{ manager: DatabaseConnectionManager; router: QueryRouter }> {
  const manager = new DatabaseConnectionManager(environment, serviceType);

  // Initialize primary
  await manager.initializePrimary();

  // Load and initialize replicas
  const replicaConfigs = loadReplicaConfig();
  replicaConfigs.forEach((config) => manager.addReplica(config));

  if (replicaConfigs.length > 0) {
    await manager.initializeReplicas();
  }

  const router = new QueryRouter(manager);

  return { manager, router };
}

export default {
  DatabaseConnectionManager,
  QueryRouter,
  isWriteQuery,
  loadReplicaConfig,
  initializeDatabaseConnections,
};
