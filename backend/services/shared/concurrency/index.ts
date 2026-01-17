/**
 * Data Consistency and Concurrency Utilities
 *
 * Provides patterns for:
 * - Optimistic locking with version fields
 * - Transaction management
 * - Idempotency key handling
 * - Conflict resolution
 */

import { Knex } from 'knex';

// Optimistic Locking Types
export interface VersionedEntity {
  version: number;
  updatedAt: Date;
}

export interface OptimisticLockError extends Error {
  code: 'OPTIMISTIC_LOCK_CONFLICT';
  entityType: string;
  entityId: string;
  expectedVersion: number;
  actualVersion: number;
}

/**
 * Create an optimistic lock error
 */
export function createOptimisticLockError(
  entityType: string,
  entityId: string,
  expectedVersion: number,
  actualVersion: number
): OptimisticLockError {
  const error = new Error(
    `Optimistic lock conflict: ${entityType} ${entityId} was modified. Expected version ${expectedVersion}, found ${actualVersion}`
  ) as OptimisticLockError;
  error.code = 'OPTIMISTIC_LOCK_CONFLICT';
  error.entityType = entityType;
  error.entityId = entityId;
  error.expectedVersion = expectedVersion;
  error.actualVersion = actualVersion;
  return error;
}

/**
 * Check if error is an optimistic lock error
 */
export function isOptimisticLockError(error: unknown): error is OptimisticLockError {
  return (
    error instanceof Error &&
    (error as OptimisticLockError).code === 'OPTIMISTIC_LOCK_CONFLICT'
  );
}

/**
 * Perform an optimistic update with version checking
 * Returns the updated entity or throws OptimisticLockError
 */
export async function optimisticUpdate<T extends VersionedEntity>(
  db: Knex,
  tableName: string,
  id: string,
  currentVersion: number,
  updates: Partial<T>,
  idColumn: string = 'id'
): Promise<T> {
  const newVersion = currentVersion + 1;
  const updateData = {
    ...updates,
    version: newVersion,
    updated_at: new Date(),
  };

  const [updated] = await db(tableName)
    .where({ [idColumn]: id, version: currentVersion })
    .update(updateData)
    .returning('*');

  if (!updated) {
    // Check if entity exists and get actual version
    const current = await db(tableName).where({ [idColumn]: id }).first();

    if (!current) {
      throw new Error(`Entity not found: ${tableName} ${id}`);
    }

    throw createOptimisticLockError(
      tableName,
      id,
      currentVersion,
      current.version
    );
  }

  return updated as T;
}

/**
 * Retry an operation with exponential backoff on optimistic lock conflicts
 */
export async function retryOnConflict<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 100
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (isOptimisticLockError(error)) {
        lastError = error;
        const delay = baseDelayMs * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }

  throw lastError;
}

// Transaction Helper Types
export type TransactionCallback<T> = (trx: Knex.Transaction) => Promise<T>;

/**
 * Execute operations within a transaction with automatic rollback on error
 */
export async function withTransaction<T>(
  db: Knex,
  callback: TransactionCallback<T>
): Promise<T> {
  return db.transaction(async (trx) => {
    return callback(trx);
  });
}

/**
 * Execute operations within a transaction with row locking
 */
export async function withLockedTransaction<T>(
  db: Knex,
  tableName: string,
  id: string,
  callback: (trx: Knex.Transaction, lockedRow: any) => Promise<T>,
  idColumn: string = 'id'
): Promise<T> {
  return db.transaction(async (trx) => {
    // Lock the row for update
    const lockedRow = await trx(tableName)
      .where({ [idColumn]: id })
      .forUpdate()
      .first();

    if (!lockedRow) {
      throw new Error(`Entity not found for locking: ${tableName} ${id}`);
    }

    return callback(trx, lockedRow);
  });
}

// Idempotency Types
export interface IdempotencyResult<T> {
  isNew: boolean;
  result: T;
}

export interface IdempotencyStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds: number): Promise<void>;
  setNX(key: string, value: string, ttlSeconds: number): Promise<boolean>;
  del(key: string): Promise<void>;
}

/**
 * Execute an operation with idempotency checking
 * If the key was already processed, returns the cached result
 */
export async function withIdempotency<T>(
  store: IdempotencyStore,
  key: string,
  operation: () => Promise<T>,
  ttlSeconds: number = 86400 // 24 hours
): Promise<IdempotencyResult<T>> {
  // Check if already processed
  const cached = await store.get(key);
  if (cached) {
    return {
      isNew: false,
      result: JSON.parse(cached) as T,
    };
  }

  // Acquire lock
  const lockKey = `${key}:lock`;
  const lockAcquired = await store.setNX(lockKey, '1', 30);

  if (!lockAcquired) {
    throw new Error('Operation in progress with this idempotency key');
  }

  try {
    const result = await operation();
    await store.set(key, JSON.stringify(result), ttlSeconds);
    return { isNew: true, result };
  } finally {
    await store.del(lockKey);
  }
}

// Conflict Resolution Types
export type ConflictResolutionStrategy<T> =
  | 'last-write-wins'
  | 'first-write-wins'
  | 'merge'
  | ((existing: T, incoming: T) => T);

/**
 * Resolve conflicts between two versions of an entity
 */
export function resolveConflict<T extends VersionedEntity>(
  existing: T,
  incoming: Partial<T>,
  strategy: ConflictResolutionStrategy<T>
): Partial<T> {
  if (strategy === 'last-write-wins') {
    return incoming;
  }

  if (strategy === 'first-write-wins') {
    return {};
  }

  if (strategy === 'merge') {
    // Merge non-null values from incoming, prefer existing for conflicts
    const merged: Partial<T> = {};
    for (const key of Object.keys(incoming) as (keyof T)[]) {
      if (incoming[key] !== undefined && incoming[key] !== null) {
        (merged as any)[key] = incoming[key];
      }
    }
    return merged;
  }

  // Custom strategy function
  return strategy(existing, incoming as T);
}

// Export utility for generating idempotency keys
export function generateIdempotencyKey(
  userId: string,
  operation: string,
  ...params: string[]
): string {
  return `${userId}:${operation}:${params.join(':')}:${Date.now()}`;
}
