/**
 * Request Batching Utility
 * Batch multiple requests to reduce API calls and database queries
 */

import { CostOptimizationConfig } from '../config/cost-optimization';

export interface BatchOptions {
  batchSize: number;
  batchInterval: number;
  maxWaitTime: number;
}

export interface BatchRequest<T, R> {
  data: T;
  resolve: (result: R) => void;
  reject: (error: Error) => void;
  timestamp: number;
}

export class RequestBatcher<T, R> {
  private queue: BatchRequest<T, R>[] = [];
  private timer: NodeJS.Timeout | null = null;
  private options: BatchOptions;
  private processBatch: (items: T[]) => Promise<R[]>;

  constructor(
    processBatch: (items: T[]) => Promise<R[]>,
    options: BatchOptions
  ) {
    this.processBatch = processBatch;
    this.options = options;
  }

  /**
   * Add item to batch queue
   */
  async add(data: T): Promise<R> {
    return new Promise((resolve, reject) => {
      const request: BatchRequest<T, R> = {
        data,
        resolve,
        reject,
        timestamp: Date.now(),
      };

      this.queue.push(request);

      // Check if batch size reached
      if (this.queue.length >= this.options.batchSize) {
        this.flush();
        return;
      }

      // Schedule batch processing if not already scheduled
      if (!this.timer) {
        this.timer = setTimeout(() => {
          this.flush();
        }, this.options.batchInterval);
      }

      // Check for items exceeding max wait time
      this.checkMaxWaitTime();
    });
  }

  /**
   * Flush the batch queue
   */
  private async flush(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    if (this.queue.length === 0) {
      return;
    }

    const batch = this.queue.splice(0, this.options.batchSize);
    const items = batch.map((req) => req.data);

    try {
      const results = await this.processBatch(items);

      // Resolve all promises
      batch.forEach((req, index) => {
        req.resolve(results[index]);
      });
    } catch (error) {
      // Reject all promises
      batch.forEach((req) => {
        req.reject(error as Error);
      });
    }

    // Process remaining items if any
    if (this.queue.length > 0) {
      this.timer = setTimeout(() => {
        this.flush();
      }, this.options.batchInterval);
    }
  }

  /**
   * Check for items exceeding max wait time
   */
  private checkMaxWaitTime(): void {
    const now = Date.now();
    const oldestItem = this.queue[0];

    if (oldestItem && now - oldestItem.timestamp >= this.options.maxWaitTime) {
      this.flush();
    }
  }

  /**
   * Get queue size
   */
  getQueueSize(): number {
    return this.queue.length;
  }

  /**
   * Clear the queue
   */
  clear(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.queue = [];
  }
}

/**
 * Database Query Batcher
 */
export class DatabaseQueryBatcher {
  private config = CostOptimizationConfig.batching.database;

  /**
   * Create batcher for database inserts
   */
  createInsertBatcher<T>(
    insertFn: (items: T[]) => Promise<void>
  ): RequestBatcher<T, void> {
    return new RequestBatcher<T, void>(
      async (items) => {
        await insertFn(items);
        return items.map(() => undefined);
      },
      this.config
    );
  }

  /**
   * Create batcher for database queries by ID
   */
  createFindByIdBatcher<T>(
    findByIdsFn: (ids: string[]) => Promise<T[]>
  ): RequestBatcher<string, T> {
    return new RequestBatcher<string, T>(findByIdsFn, this.config);
  }

  /**
   * Create batcher for database updates
   */
  createUpdateBatcher<T>(
    updateFn: (items: T[]) => Promise<T[]>
  ): RequestBatcher<T, T> {
    return new RequestBatcher<T, T>(updateFn, this.config);
  }
}

/**
 * Notification Batcher
 */
export class NotificationBatcher {
  private config = CostOptimizationConfig.batching.notifications;

  /**
   * Create email notification batcher
   */
  createEmailBatcher<T>(
    sendEmailsFn: (emails: T[]) => Promise<void>
  ): RequestBatcher<T, void> {
    return new RequestBatcher<T, void>(
      async (items) => {
        await sendEmailsFn(items);
        return items.map(() => undefined);
      },
      this.config
    );
  }

  /**
   * Create push notification batcher
   */
  createPushBatcher<T>(
    sendPushFn: (notifications: T[]) => Promise<void>
  ): RequestBatcher<T, void> {
    return new RequestBatcher<T, void>(
      async (items) => {
        await sendPushFn(items);
        return items.map(() => undefined);
      },
      this.config
    );
  }

  /**
   * Create SMS notification batcher
   */
  createSMSBatcher<T>(
    sendSMSFn: (messages: T[]) => Promise<void>
  ): RequestBatcher<T, void> {
    return new RequestBatcher<T, void>(
      async (items) => {
        await sendSMSFn(items);
        return items.map(() => undefined);
      },
      this.config
    );
  }
}

/**
 * Analytics Event Batcher
 */
export class AnalyticsBatcher {
  private config = CostOptimizationConfig.batching.analytics;

  /**
   * Create analytics event batcher
   */
  createEventBatcher<T>(
    trackEventsFn: (events: T[]) => Promise<void>
  ): RequestBatcher<T, void> {
    return new RequestBatcher<T, void>(
      async (items) => {
        await trackEventsFn(items);
        return items.map(() => undefined);
      },
      this.config
    );
  }
}

/**
 * Batch Processor for Array Operations
 * Process arrays in batches to avoid memory issues
 */
export class BatchProcessor {
  /**
   * Process array in batches
   */
  static async processBatches<T, R>(
    items: T[],
    batchSize: number,
    processFn: (batch: T[]) => Promise<R[]>
  ): Promise<R[]> {
    const results: R[] = [];

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchResults = await processFn(batch);
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Process array in batches with delay between batches
   */
  static async processBatchesWithDelay<T, R>(
    items: T[],
    batchSize: number,
    delayMs: number,
    processFn: (batch: T[]) => Promise<R[]>
  ): Promise<R[]> {
    const results: R[] = [];

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchResults = await processFn(batch);
      results.push(...batchResults);

      // Delay between batches (except for last batch)
      if (i + batchSize < items.length) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    return results;
  }

  /**
   * Process array in parallel batches
   */
  static async processParallelBatches<T, R>(
    items: T[],
    batchSize: number,
    concurrency: number,
    processFn: (batch: T[]) => Promise<R[]>
  ): Promise<R[]> {
    const batches: T[][] = [];

    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }

    const results: R[] = [];

    for (let i = 0; i < batches.length; i += concurrency) {
      const parallelBatches = batches.slice(i, i + concurrency);
      const batchResults = await Promise.all(
        parallelBatches.map((batch) => processFn(batch))
      );
      results.push(...batchResults.flat());
    }

    return results;
  }
}

export default RequestBatcher;
