import { Knex } from 'knex';
import { createLogger } from '@flamoral/shared';

const logger = createLogger('db-performance-monitor');

/**
 * Database Performance Monitoring Utilities
 *
 * This module provides comprehensive database monitoring including:
 * - Query execution time tracking
 * - Connection pool monitoring
 * - Lock detection and monitoring
 * - Index usage statistics
 * - Slow query logging
 */

export interface QueryMetrics {
  query: string;
  duration: number;
  timestamp: Date;
  success: boolean;
  error?: string;
}

export interface PoolMetrics {
  numUsed: number;
  numFree: number;
  numPendingAcquires: number;
  numPendingCreates: number;
  min: number;
  max: number;
  timestamp: Date;
}

export interface SlowQueryLog {
  query: string;
  duration: number;
  timestamp: Date;
  userId?: string;
  parameters?: any[];
}

export interface LockInfo {
  lockType: string;
  relation: string;
  mode: string;
  granted: boolean;
  pid: number;
  queryStart: Date;
  query: string;
}

export interface IndexUsageStats {
  schemaName: string;
  tableName: string;
  indexName: string;
  indexScans: number;
  tuplesRead: number;
  tuplesInserted: number;
  sizeBytes: number;
  sizeMB: number;
}

/**
 * Performance Monitor Class
 */
export class DatabasePerformanceMonitor {
  private queryMetrics: QueryMetrics[] = [];
  private slowQueries: SlowQueryLog[] = [];
  private slowQueryThresholdMs: number;
  private maxMetricsHistory: number;

  constructor(slowQueryThresholdMs: number = 1000, maxMetricsHistory: number = 1000) {
    this.slowQueryThresholdMs = slowQueryThresholdMs;
    this.maxMetricsHistory = maxMetricsHistory;
  }

  /**
   * Track query execution time
   */
  trackQuery(query: string, duration: number, success: boolean, error?: string): void {
    const metric: QueryMetrics = {
      query: this.sanitizeQuery(query),
      duration,
      timestamp: new Date(),
      success,
      error,
    };

    this.queryMetrics.push(metric);

    // Track slow queries
    if (duration > this.slowQueryThresholdMs) {
      this.slowQueries.push({
        query: metric.query,
        duration,
        timestamp: metric.timestamp,
      });

      logger.warn(`Slow query detected (${duration}ms): ${metric.query}`);
    }

    // Limit history size
    if (this.queryMetrics.length > this.maxMetricsHistory) {
      this.queryMetrics.shift();
    }

    if (this.slowQueries.length > this.maxMetricsHistory) {
      this.slowQueries.shift();
    }
  }

  /**
   * Get query statistics
   */
  getQueryStats(): {
    totalQueries: number;
    successfulQueries: number;
    failedQueries: number;
    averageDuration: number;
    medianDuration: number;
    p95Duration: number;
    p99Duration: number;
    slowQueries: number;
  } {
    if (this.queryMetrics.length === 0) {
      return {
        totalQueries: 0,
        successfulQueries: 0,
        failedQueries: 0,
        averageDuration: 0,
        medianDuration: 0,
        p95Duration: 0,
        p99Duration: 0,
        slowQueries: 0,
      };
    }

    const durations = this.queryMetrics.map((m) => m.duration).sort((a, b) => a - b);
    const successfulQueries = this.queryMetrics.filter((m) => m.success).length;

    return {
      totalQueries: this.queryMetrics.length,
      successfulQueries,
      failedQueries: this.queryMetrics.length - successfulQueries,
      averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      medianDuration: durations[Math.floor(durations.length / 2)],
      p95Duration: durations[Math.floor(durations.length * 0.95)],
      p99Duration: durations[Math.floor(durations.length * 0.99)],
      slowQueries: this.slowQueries.length,
    };
  }

  /**
   * Get recent slow queries
   */
  getSlowQueries(limit: number = 10): SlowQueryLog[] {
    return this.slowQueries.slice(-limit).reverse();
  }

  /**
   * Clear metrics history
   */
  clearMetrics(): void {
    this.queryMetrics = [];
    this.slowQueries = [];
  }

  /**
   * Sanitize query for logging (remove sensitive data)
   */
  private sanitizeQuery(query: string): string {
    // Remove bind parameters
    return query.replace(/\$\d+/g, '?').substring(0, 200);
  }
}

/**
 * Get connection pool statistics
 */
export async function getPoolStats(knex: Knex): Promise<PoolMetrics> {
  const pool = (knex.client as any).pool;

  return {
    numUsed: pool.numUsed(),
    numFree: pool.numFree(),
    numPendingAcquires: pool.numPendingAcquires(),
    numPendingCreates: pool.numPendingCreates(),
    min: pool.min,
    max: pool.max,
    timestamp: new Date(),
  };
}

/**
 * Get active database locks
 */
export async function getActiveLocks(knex: Knex): Promise<LockInfo[]> {
  try {
    const locks = await knex.raw(`
      SELECT
        l.locktype,
        l.relation::regclass AS relation,
        l.mode,
        l.granted,
        a.pid,
        a.query_start,
        a.query
      FROM pg_locks l
      JOIN pg_stat_activity a ON l.pid = a.pid
      WHERE l.granted = false
        OR l.mode IN ('ExclusiveLock', 'AccessExclusiveLock')
      ORDER BY a.query_start;
    `);

    return locks.rows.map((row: any) => ({
      lockType: row.locktype,
      relation: row.relation,
      mode: row.mode,
      granted: row.granted,
      pid: row.pid,
      queryStart: new Date(row.query_start),
      query: row.query,
    }));
  } catch (error) {
    logger.error('Failed to get active locks', error);
    return [];
  }
}

/**
 * Get index usage statistics
 */
export async function getIndexUsageStats(knex: Knex): Promise<IndexUsageStats[]> {
  try {
    const stats = await knex.raw(`
      SELECT
        schemaname AS schema_name,
        tablename AS table_name,
        indexname AS index_name,
        idx_scan AS index_scans,
        idx_tup_read AS tuples_read,
        idx_tup_fetch AS tuples_inserted,
        pg_relation_size(indexrelid) AS size_bytes,
        pg_size_pretty(pg_relation_size(indexrelid)) AS size_pretty
      FROM pg_stat_user_indexes
      ORDER BY idx_scan ASC, pg_relation_size(indexrelid) DESC
      LIMIT 50;
    `);

    return stats.rows.map((row: any) => ({
      schemaName: row.schema_name,
      tableName: row.table_name,
      indexName: row.index_name,
      indexScans: parseInt(row.index_scans),
      tuplesRead: parseInt(row.tuples_read),
      tuplesInserted: parseInt(row.tuples_inserted),
      sizeBytes: parseInt(row.size_bytes),
      sizeMB: parseFloat((parseInt(row.size_bytes) / (1024 * 1024)).toFixed(2)),
    }));
  } catch (error) {
    logger.error('Failed to get index usage stats', error);
    return [];
  }
}

/**
 * Get unused indexes (candidates for removal)
 */
export async function getUnusedIndexes(knex: Knex, minSizeMB: number = 1): Promise<IndexUsageStats[]> {
  try {
    const stats = await knex.raw(`
      SELECT
        schemaname AS schema_name,
        tablename AS table_name,
        indexname AS index_name,
        idx_scan AS index_scans,
        pg_relation_size(indexrelid) AS size_bytes,
        pg_size_pretty(pg_relation_size(indexrelid)) AS size_pretty
      FROM pg_stat_user_indexes
      WHERE idx_scan = 0
        AND indexrelname NOT LIKE '%_pkey'
        AND pg_relation_size(indexrelid) > ${minSizeMB * 1024 * 1024}
      ORDER BY pg_relation_size(indexrelid) DESC;
    `);

    return stats.rows.map((row: any) => ({
      schemaName: row.schema_name,
      tableName: row.table_name,
      indexName: row.index_name,
      indexScans: 0,
      tuplesRead: 0,
      tuplesInserted: 0,
      sizeBytes: parseInt(row.size_bytes),
      sizeMB: parseFloat((parseInt(row.size_bytes) / (1024 * 1024)).toFixed(2)),
    }));
  } catch (error) {
    logger.error('Failed to get unused indexes', error);
    return [];
  }
}

/**
 * Get table size statistics
 */
export async function getTableSizes(knex: Knex): Promise<any[]> {
  try {
    const sizes = await knex.raw(`
      SELECT
        schemaname AS schema_name,
        tablename AS table_name,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
        pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS indexes_size,
        pg_total_relation_size(schemaname||'.'||tablename) AS total_size_bytes
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
    `);

    return sizes.rows;
  } catch (error) {
    logger.error('Failed to get table sizes', error);
    return [];
  }
}

/**
 * Get database size
 */
export async function getDatabaseSize(knex: Knex): Promise<any> {
  try {
    const result = await knex.raw(`
      SELECT
        pg_database.datname AS database_name,
        pg_size_pretty(pg_database_size(pg_database.datname)) AS size,
        pg_database_size(pg_database.datname) AS size_bytes
      FROM pg_database
      WHERE datname = current_database();
    `);

    return result.rows[0];
  } catch (error) {
    logger.error('Failed to get database size', error);
    return null;
  }
}

/**
 * Get active queries
 */
export async function getActiveQueries(knex: Knex): Promise<any[]> {
  try {
    const queries = await knex.raw(`
      SELECT
        pid,
        usename AS username,
        application_name,
        client_addr,
        state,
        query_start,
        state_change,
        EXTRACT(EPOCH FROM (now() - query_start)) AS duration_seconds,
        query
      FROM pg_stat_activity
      WHERE state != 'idle'
        AND pid != pg_backend_pid()
      ORDER BY query_start ASC;
    `);

    return queries.rows;
  } catch (error) {
    logger.error('Failed to get active queries', error);
    return [];
  }
}

/**
 * Get long-running queries
 */
export async function getLongRunningQueries(knex: Knex, minDurationSeconds: number = 5): Promise<any[]> {
  try {
    const queries = await knex.raw(`
      SELECT
        pid,
        usename AS username,
        application_name,
        state,
        query_start,
        EXTRACT(EPOCH FROM (now() - query_start)) AS duration_seconds,
        query
      FROM pg_stat_activity
      WHERE state != 'idle'
        AND pid != pg_backend_pid()
        AND EXTRACT(EPOCH FROM (now() - query_start)) > ${minDurationSeconds}
      ORDER BY query_start ASC;
    `);

    return queries.rows;
  } catch (error) {
    logger.error('Failed to get long-running queries', error);
    return [];
  }
}

/**
 * Kill a query by PID
 */
export async function killQuery(knex: Knex, pid: number): Promise<boolean> {
  try {
    await knex.raw(`SELECT pg_cancel_backend(${pid});`);
    logger.info(`Query with PID ${pid} cancelled`);
    return true;
  } catch (error) {
    logger.error(`Failed to kill query with PID ${pid}`, error);
    return false;
  }
}

/**
 * Get cache hit ratio
 */
export async function getCacheHitRatio(knex: Knex): Promise<any> {
  try {
    const result = await knex.raw(`
      SELECT
        sum(heap_blks_read) as heap_read,
        sum(heap_blks_hit) as heap_hit,
        sum(heap_blks_hit) / nullif(sum(heap_blks_hit) + sum(heap_blks_read), 0) * 100 AS cache_hit_ratio
      FROM pg_statio_user_tables;
    `);

    return result.rows[0];
  } catch (error) {
    logger.error('Failed to get cache hit ratio', error);
    return null;
  }
}

/**
 * Get table bloat statistics
 */
export async function getTableBloat(knex: Knex): Promise<any[]> {
  try {
    const bloat = await knex.raw(`
      SELECT
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
        n_dead_tup AS dead_tuples,
        n_live_tup AS live_tuples,
        ROUND(100 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 2) AS bloat_ratio
      FROM pg_stat_user_tables
      WHERE n_dead_tup > 0
      ORDER BY n_dead_tup DESC
      LIMIT 20;
    `);

    return bloat.rows;
  } catch (error) {
    logger.error('Failed to get table bloat', error);
    return [];
  }
}

/**
 * Comprehensive health check
 */
export async function comprehensiveHealthCheck(knex: Knex): Promise<any> {
  const [
    poolStats,
    activeLocks,
    longRunningQueries,
    cacheHitRatio,
    dbSize,
    tableBloat,
    unusedIndexes,
  ] = await Promise.all([
    getPoolStats(knex),
    getActiveLocks(knex),
    getLongRunningQueries(knex, 10),
    getCacheHitRatio(knex),
    getDatabaseSize(knex),
    getTableBloat(knex),
    getUnusedIndexes(knex, 5),
  ]);

  return {
    timestamp: new Date(),
    pool: poolStats,
    locks: {
      count: activeLocks.length,
      details: activeLocks.slice(0, 5),
    },
    longRunningQueries: {
      count: longRunningQueries.length,
      details: longRunningQueries.slice(0, 5),
    },
    cacheHitRatio: cacheHitRatio?.cache_hit_ratio || 0,
    databaseSize: dbSize,
    bloat: {
      count: tableBloat.length,
      topTables: tableBloat.slice(0, 5),
    },
    unusedIndexes: {
      count: unusedIndexes.length,
      details: unusedIndexes.slice(0, 5),
    },
  };
}

/**
 * Export singleton monitor instance
 */
export const performanceMonitor = new DatabasePerformanceMonitor();

export default {
  DatabasePerformanceMonitor,
  performanceMonitor,
  getPoolStats,
  getActiveLocks,
  getIndexUsageStats,
  getUnusedIndexes,
  getTableSizes,
  getDatabaseSize,
  getActiveQueries,
  getLongRunningQueries,
  killQuery,
  getCacheHitRatio,
  getTableBloat,
  comprehensiveHealthCheck,
};
