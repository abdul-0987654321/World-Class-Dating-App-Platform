/**
 * Database Health Check Utility
 * Provides health check functions for database connections
 */

import { Knex } from 'knex';

export interface DatabaseHealthStatus {
  healthy: boolean;
  latency: number;
  error?: string;
  timestamp: Date;
  poolInfo?: {
    numUsed: number;
    numFree: number;
    numPendingAcquires: number;
    numPendingCreates: number;
  };
}

/**
 * Check database health
 */
export async function checkDatabaseHealth(
  db: Knex,
  serviceName: string = 'database'
): Promise<DatabaseHealthStatus> {
  const startTime = Date.now();
  const timestamp = new Date();

  try {
    // Test basic connectivity with a simple query
    await db.raw('SELECT 1 as health_check');

    // Get pool information
    const pool = (db.client as any).pool;
    const poolInfo = pool
      ? {
          numUsed: pool.numUsed(),
          numFree: pool.numFree(),
          numPendingAcquires: pool.numPendingAcquires(),
          numPendingCreates: pool.numPendingCreates(),
        }
      : undefined;

    const latency = Date.now() - startTime;

    return {
      healthy: true,
      latency,
      timestamp,
      poolInfo,
    };
  } catch (error) {
    const latency = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    console.error(`[${serviceName}] Database health check failed:`, errorMessage);

    return {
      healthy: false,
      latency,
      error: errorMessage,
      timestamp,
    };
  }
}

/**
 * Check database with retry logic
 */
export async function checkDatabaseHealthWithRetry(
  db: Knex,
  serviceName: string = 'database',
  maxRetries: number = 3,
  retryDelay: number = 1000
): Promise<DatabaseHealthStatus> {
  let lastResult: DatabaseHealthStatus | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    lastResult = await checkDatabaseHealth(db, serviceName);

    if (lastResult.healthy) {
      return lastResult;
    }

    if (attempt < maxRetries) {
      console.log(
        `[${serviceName}] Health check attempt ${attempt} failed, retrying in ${retryDelay}ms...`
      );
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }

  return lastResult!;
}

/**
 * Validate database tables exist
 */
export async function validateDatabaseSchema(
  db: Knex,
  requiredTables: string[]
): Promise<{ valid: boolean; missingTables: string[] }> {
  try {
    const missingTables: string[] = [];

    for (const tableName of requiredTables) {
      const exists = await db.schema.hasTable(tableName);
      if (!exists) {
        missingTables.push(tableName);
      }
    }

    return {
      valid: missingTables.length === 0,
      missingTables,
    };
  } catch (error) {
    console.error('Error validating database schema:', error);
    return {
      valid: false,
      missingTables: requiredTables,
    };
  }
}

/**
 * Get database version
 */
export async function getDatabaseVersion(db: Knex): Promise<string> {
  try {
    const result = await db.raw('SELECT version()');
    return result.rows[0].version;
  } catch (error) {
    console.error('Error getting database version:', error);
    return 'unknown';
  }
}

/**
 * Get migration status
 */
export async function getMigrationStatus(
  db: Knex
): Promise<{ currentVersion: number | null; pendingMigrations: number }> {
  try {
    const [latestMigration] = await db('knex_migrations')
      .select('*')
      .orderBy('id', 'desc')
      .limit(1);

    const currentVersion = latestMigration ? latestMigration.id : null;

    // This is a simplified check - in reality you'd compare with migration files
    const pendingMigrations = 0;

    return {
      currentVersion,
      pendingMigrations,
    };
  } catch (error) {
    console.error('Error getting migration status:', error);
    return {
      currentVersion: null,
      pendingMigrations: 0,
    };
  }
}

/**
 * Monitor database connection pool
 */
export function getPoolMetrics(db: Knex): {
  size: number;
  used: number;
  free: number;
  pendingAcquires: number;
  pendingCreates: number;
} | null {
  try {
    const pool = (db.client as any).pool;
    if (!pool) {
      return null;
    }

    return {
      size: pool.numUsed() + pool.numFree(),
      used: pool.numUsed(),
      free: pool.numFree(),
      pendingAcquires: pool.numPendingAcquires(),
      pendingCreates: pool.numPendingCreates(),
    };
  } catch (error) {
    console.error('Error getting pool metrics:', error);
    return null;
  }
}

/**
 * Gracefully close database connection
 */
export async function closeDatabaseConnection(
  db: Knex,
  serviceName: string = 'database'
): Promise<void> {
  try {
    console.log(`[${serviceName}] Closing database connection...`);
    await db.destroy();
    console.log(`[${serviceName}] Database connection closed successfully`);
  } catch (error) {
    console.error(`[${serviceName}] Error closing database connection:`, error);
    throw error;
  }
}
