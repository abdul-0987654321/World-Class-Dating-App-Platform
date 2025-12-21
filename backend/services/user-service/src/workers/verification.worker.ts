import db from '../infrastructure/database/connection';
import logger from '../utils/logger';
import { identityVerificationService } from '../services/identity-verification.service';
import { v4 as uuidv4 } from 'uuid';

/**
 * Verification Worker
 * Background processor for verification requests with retry logic and DLQ support
 */
export class VerificationWorker {
  private isRunning: boolean = false;
  private intervalId: NodeJS.Timeout | null = null;

  // Worker configuration
  private readonly POLL_INTERVAL_MS = 5000; // Poll every 5 seconds
  private readonly BATCH_SIZE = 10; // Process 10 requests at a time
  private readonly MAX_RETRIES = 5;
  private readonly RETRY_DELAYS = [
    60000,      // 1 minute
    300000,     // 5 minutes
    900000,     // 15 minutes
    3600000,    // 1 hour
    14400000,   // 4 hours
  ];

  /**
   * Start the worker
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Verification worker is already running');
      return;
    }

    this.isRunning = true;
    logger.info('Starting verification worker');

    // Initial run
    await this.processLoop();

    // Set up interval for continuous processing
    this.intervalId = setInterval(async () => {
      await this.processLoop();
    }, this.POLL_INTERVAL_MS);
  }

  /**
   * Stop the worker
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    logger.info('Stopped verification worker');
  }

  /**
   * Main processing loop
   */
  private async processLoop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    try {
      // Process pending verifications
      await this.processPendingVerifications();

      // Process DLQ retries
      await this.processDlqRetries();

      // Expire old requests
      await identityVerificationService.expireOldRequests();
    } catch (error: any) {
      logger.error('Verification worker loop error', { error: error.message });
    }
  }

  /**
   * Process pending verification requests
   */
  private async processPendingVerifications(): Promise<void> {
    try {
      // Get pending verifications that are in 'in_review' status
      const requests = await db('verification_requests')
        .where({ status: 'in_review' })
        .whereNotNull('submitted_at')
        .orderBy('submitted_at', 'asc')
        .limit(this.BATCH_SIZE);

      for (const request of requests) {
        await this.processRequest(request);
      }
    } catch (error: any) {
      logger.error('Failed to process pending verifications', { error: error.message });
    }
  }

  /**
   * Process a single verification request
   */
  private async processRequest(request: any): Promise<void> {
    const requestId = request.request_id;

    try {
      logger.info(`Processing verification request ${requestId}`);

      const result = await identityVerificationService.processVerification(requestId);

      if (!result.success && result.error) {
        // Add to DLQ for retry
        await this.addToDlq(requestId, result.error, {
          request_type: request.type,
          user_id: request.user_id,
        });
      }
    } catch (error: any) {
      logger.error(`Failed to process verification request ${requestId}`, {
        error: error.message,
      });

      // Add to DLQ for retry
      await this.addToDlq(requestId, error.message, {
        request_type: request.type,
        user_id: request.user_id,
        stack: error.stack,
      });
    }
  }

  /**
   * Add a failed request to the Dead Letter Queue
   */
  private async addToDlq(
    requestId: string,
    errorMessage: string,
    payload: Record<string, any>
  ): Promise<void> {
    try {
      // Check if already in DLQ
      const existingEntry = await db('verification_dlq')
        .where({ request_id: requestId })
        .whereIn('status', ['pending', 'retrying'])
        .first();

      if (existingEntry) {
        // Update existing entry
        const newRetryCount = existingEntry.retry_count + 1;
        const nextRetryAt = this.calculateNextRetry(newRetryCount);

        if (newRetryCount >= this.MAX_RETRIES) {
          // Mark as abandoned
          await db('verification_dlq')
            .where({ dlq_id: existingEntry.dlq_id })
            .update({
              status: 'abandoned',
              retry_count: newRetryCount,
              last_retry_at: new Date(),
              error_message: errorMessage,
              updated_at: new Date(),
            });

          logger.warn(`Verification request ${requestId} abandoned after ${newRetryCount} retries`);
        } else {
          // Schedule next retry
          await db('verification_dlq')
            .where({ dlq_id: existingEntry.dlq_id })
            .update({
              status: 'pending',
              retry_count: newRetryCount,
              next_retry_at: nextRetryAt,
              last_retry_at: new Date(),
              error_message: errorMessage,
              updated_at: new Date(),
            });

          logger.info(`Scheduled retry ${newRetryCount} for verification ${requestId} at ${nextRetryAt}`);
        }
      } else {
        // Create new DLQ entry
        const dlqId = uuidv4();
        const nextRetryAt = this.calculateNextRetry(1);

        await db('verification_dlq').insert({
          dlq_id: dlqId,
          request_id: requestId,
          error_message: errorMessage,
          error_stack: payload.stack || null,
          error_code: 'PROCESSING_ERROR',
          retry_count: 0,
          max_retries: this.MAX_RETRIES,
          next_retry_at: nextRetryAt,
          last_retry_at: null,
          status: 'pending',
          original_payload: JSON.stringify(payload),
          resolution_notes: null,
          resolved_by: null,
          resolved_at: null,
          created_at: new Date(),
          updated_at: new Date(),
        });

        logger.info(`Added verification ${requestId} to DLQ, first retry at ${nextRetryAt}`);
      }
    } catch (error: any) {
      logger.error(`Failed to add to DLQ: ${requestId}`, { error: error.message });
    }
  }

  /**
   * Calculate the next retry time based on retry count
   */
  private calculateNextRetry(retryCount: number): Date {
    const delayIndex = Math.min(retryCount - 1, this.RETRY_DELAYS.length - 1);
    const delay = this.RETRY_DELAYS[delayIndex];

    const nextRetry = new Date();
    nextRetry.setTime(nextRetry.getTime() + delay);

    return nextRetry;
  }

  /**
   * Process DLQ retries
   */
  private async processDlqRetries(): Promise<void> {
    try {
      const now = new Date();

      // Get DLQ entries ready for retry
      const entries = await db('verification_dlq')
        .where({ status: 'pending' })
        .where('next_retry_at', '<=', now)
        .orderBy('next_retry_at', 'asc')
        .limit(this.BATCH_SIZE);

      for (const entry of entries) {
        await this.retryFromDlq(entry);
      }
    } catch (error: any) {
      logger.error('Failed to process DLQ retries', { error: error.message });
    }
  }

  /**
   * Retry a DLQ entry
   */
  private async retryFromDlq(entry: any): Promise<void> {
    const { dlq_id, request_id, retry_count } = entry;

    try {
      logger.info(`Retrying verification ${request_id} from DLQ (attempt ${retry_count + 1})`);

      // Mark as retrying
      await db('verification_dlq')
        .where({ dlq_id })
        .update({
          status: 'retrying',
          updated_at: new Date(),
        });

      // Get the original request
      const request = await db('verification_requests')
        .where({ request_id })
        .first();

      if (!request) {
        // Request no longer exists, mark as resolved
        await db('verification_dlq')
          .where({ dlq_id })
          .update({
            status: 'resolved',
            resolution_notes: 'Original request no longer exists',
            resolved_at: new Date(),
            updated_at: new Date(),
          });

        return;
      }

      // Retry processing
      const result = await identityVerificationService.processVerification(request_id);

      if (result.success) {
        // Mark DLQ entry as resolved
        await db('verification_dlq')
          .where({ dlq_id })
          .update({
            status: 'resolved',
            resolution_notes: `Successfully processed on retry ${retry_count + 1}`,
            resolved_at: new Date(),
            updated_at: new Date(),
          });

        logger.info(`Successfully processed verification ${request_id} on retry`);
      } else {
        // Failed again, update DLQ with new error
        const newRetryCount = retry_count + 1;

        if (newRetryCount >= this.MAX_RETRIES) {
          await db('verification_dlq')
            .where({ dlq_id })
            .update({
              status: 'abandoned',
              retry_count: newRetryCount,
              last_retry_at: new Date(),
              error_message: result.error || 'Unknown error',
              updated_at: new Date(),
            });

          logger.warn(`Verification ${request_id} abandoned after ${newRetryCount} retries`);
        } else {
          const nextRetryAt = this.calculateNextRetry(newRetryCount + 1);

          await db('verification_dlq')
            .where({ dlq_id })
            .update({
              status: 'pending',
              retry_count: newRetryCount,
              next_retry_at: nextRetryAt,
              last_retry_at: new Date(),
              error_message: result.error || 'Unknown error',
              updated_at: new Date(),
            });

          logger.info(`Retry failed for ${request_id}, next retry at ${nextRetryAt}`);
        }
      }
    } catch (error: any) {
      logger.error(`Failed to retry from DLQ: ${request_id}`, { error: error.message });

      // Mark back as pending for next retry cycle
      const newRetryCount = retry_count + 1;

      if (newRetryCount >= this.MAX_RETRIES) {
        await db('verification_dlq')
          .where({ dlq_id })
          .update({
            status: 'abandoned',
            retry_count: newRetryCount,
            last_retry_at: new Date(),
            error_message: error.message,
            error_stack: error.stack,
            updated_at: new Date(),
          });
      } else {
        const nextRetryAt = this.calculateNextRetry(newRetryCount + 1);

        await db('verification_dlq')
          .where({ dlq_id })
          .update({
            status: 'pending',
            retry_count: newRetryCount,
            next_retry_at: nextRetryAt,
            last_retry_at: new Date(),
            error_message: error.message,
            error_stack: error.stack,
            updated_at: new Date(),
          });
      }
    }
  }

  /**
   * Admin: Manually resolve a DLQ entry
   */
  async resolveManually(dlqId: string, adminUserId: string, notes: string): Promise<boolean> {
    try {
      await db('verification_dlq')
        .where({ dlq_id: dlqId })
        .update({
          status: 'resolved',
          resolved_by: adminUserId,
          resolution_notes: notes,
          resolved_at: new Date(),
          updated_at: new Date(),
        });

      logger.info(`DLQ entry ${dlqId} manually resolved by admin ${adminUserId}`);

      return true;
    } catch (error: any) {
      logger.error('Failed to manually resolve DLQ entry', {
        dlqId,
        error: error.message,
      });

      return false;
    }
  }

  /**
   * Admin: Force retry an abandoned DLQ entry
   */
  async forceRetry(dlqId: string, adminUserId: string): Promise<boolean> {
    try {
      const entry = await db('verification_dlq')
        .where({ dlq_id: dlqId })
        .first();

      if (!entry) {
        return false;
      }

      const nextRetryAt = new Date();

      await db('verification_dlq')
        .where({ dlq_id: dlqId })
        .update({
          status: 'pending',
          retry_count: 0, // Reset retry count
          max_retries: this.MAX_RETRIES, // Reset max retries
          next_retry_at: nextRetryAt,
          resolution_notes: `Force retry initiated by admin ${adminUserId}`,
          updated_at: new Date(),
        });

      logger.info(`DLQ entry ${dlqId} force retry by admin ${adminUserId}`);

      return true;
    } catch (error: any) {
      logger.error('Failed to force retry DLQ entry', {
        dlqId,
        error: error.message,
      });

      return false;
    }
  }

  /**
   * Get DLQ stats
   */
  async getStats(): Promise<{
    pending: number;
    retrying: number;
    resolved: number;
    abandoned: number;
    total: number;
  }> {
    try {
      const stats = await db('verification_dlq')
        .select('status')
        .count('* as count')
        .groupBy('status');

      const result = {
        pending: 0,
        retrying: 0,
        resolved: 0,
        abandoned: 0,
        total: 0,
      };

      for (const row of stats) {
        const status = row.status as keyof typeof result;
        const count = Number(row.count);
        if (status in result) {
          result[status] = count;
        }
        result.total += count;
      }

      return result;
    } catch (error: any) {
      logger.error('Failed to get DLQ stats', { error: error.message });
      throw error;
    }
  }

  /**
   * Get abandoned DLQ entries for admin review
   */
  async getAbandonedEntries(limit: number = 20, offset: number = 0): Promise<{
    entries: any[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      const entries = await db('verification_dlq')
        .where({ status: 'abandoned' })
        .leftJoin('verification_requests', 'verification_dlq.request_id', 'verification_requests.request_id')
        .leftJoin('users', 'verification_requests.user_id', 'users.id')
        .select(
          'verification_dlq.*',
          'verification_requests.type',
          'verification_requests.user_id',
          'users.email',
          'users.first_name'
        )
        .orderBy('verification_dlq.updated_at', 'desc')
        .limit(limit)
        .offset(offset);

      const countResult = await db('verification_dlq')
        .where({ status: 'abandoned' })
        .count('* as count')
        .first();

      const total = Number(countResult?.count || 0);

      return {
        entries,
        total,
        hasMore: total > offset + limit,
      };
    } catch (error: any) {
      logger.error('Failed to get abandoned entries', { error: error.message });
      throw error;
    }
  }
}

// Singleton instance
export const verificationWorker = new VerificationWorker();
