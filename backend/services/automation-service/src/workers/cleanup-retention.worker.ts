/**
 * Cleanup Retention Worker
 * Enforces data retention policies
 * Deletes expired data
 * Archives old records
 */

import { createLogger } from '@flamoral/backend-shared';
import axios from 'axios';
import { Job } from 'bull';

import { BaseWorker, WorkerQueueName, BaseJobData, JobResult, JobPriority } from './base-worker';

const logger = createLogger('cleanup-retention-worker');

// Service URLs
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3002';
const MESSAGING_SERVICE_URL = process.env.MESSAGING_SERVICE_URL || 'http://localhost:3005';
const MATCHING_SERVICE_URL = process.env.MATCHING_SERVICE_URL || 'http://localhost:3004';
const MEDIA_SERVICE_URL = process.env.MEDIA_SERVICE_URL || 'http://localhost:3006';
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3007';
const MODERATION_SERVICE_URL = process.env.MODERATION_SERVICE_URL || 'http://localhost:3008';
const ANALYTICS_SERVICE_URL = process.env.ANALYTICS_SERVICE_URL || 'http://localhost:3011';
const PAYMENT_SERVICE_URL = process.env.PAYMENT_SERVICE_URL || 'http://localhost:3003';

// Retention periods (in days)
export const RetentionPolicies = {
  // User data
  DELETED_USER_DATA: 30, // Data kept after account deletion
  INACTIVE_USER_WARNING: 365, // Warn inactive users
  INACTIVE_USER_DELETION: 730, // Delete after 2 years inactivity

  // Messaging
  MESSAGE_RETENTION: 365, // Keep messages for 1 year
  DELETED_MESSAGES: 30, // Deleted messages kept for 30 days
  READ_RECEIPTS: 90, // Read receipts kept for 90 days
  TYPING_INDICATORS: 1, // Typing indicators kept for 1 day

  // Matching
  SWIPE_HISTORY: 180, // Swipe history kept for 6 months
  EXPIRED_MATCHES: 90, // Expired matches kept for 90 days
  MATCH_ANALYTICS: 365, // Match analytics kept for 1 year

  // Media
  ORPHANED_MEDIA: 7, // Orphaned media deleted after 7 days
  TEMP_UPLOADS: 1, // Temp uploads deleted after 1 day
  REJECTED_MEDIA: 30, // Rejected media kept for 30 days for appeals

  // Notifications
  READ_NOTIFICATIONS: 30, // Read notifications deleted after 30 days
  UNREAD_NOTIFICATIONS: 90, // Unread notifications kept for 90 days

  // Moderation
  RESOLVED_REPORTS: 365, // Resolved reports kept for 1 year
  DLQ_JOBS: 30, // Dead letter queue jobs kept for 30 days

  // Sessions
  EXPIRED_SESSIONS: 7, // Expired sessions kept for 7 days
  REVOKED_TOKENS: 30, // Revoked tokens kept for 30 days

  // Analytics
  DETAILED_ANALYTICS: 90, // Detailed analytics kept for 90 days
  AGGREGATED_ANALYTICS: 1825, // Aggregated data kept for 5 years

  // Audit logs
  AUDIT_LOGS: 1095, // Audit logs kept for 3 years

  // Payment
  TRANSACTION_LOGS: 2555, // Transaction logs kept for 7 years (legal requirement)
};

// Cleanup types
export enum CleanupType {
  MESSAGES = 'messages',
  NOTIFICATIONS = 'notifications',
  MEDIA = 'media',
  SESSIONS = 'sessions',
  MATCHES = 'matches',
  ANALYTICS = 'analytics',
  MODERATION = 'moderation',
  USERS = 'users',
  ALL = 'all',
}

// Job data interfaces
export interface CleanupRetentionJobData extends BaseJobData {
  type: 'cleanup' | 'archive' | 'purge_user' | 'check_inactive' | 'gdpr_deletion';
  cleanupType?: CleanupType;
  userId?: string;
  dryRun?: boolean;
  olderThanDays?: number;
  batchSize?: number;
}

export interface CleanupRetentionResult {
  cleanupType?: CleanupType;
  recordsProcessed: number;
  recordsDeleted: number;
  recordsArchived: number;
  bytesFreed?: number;
  errors?: number;
  dryRun: boolean;
}

/**
 * Cleanup Retention Worker
 */
export class CleanupRetentionWorker extends BaseWorker<
  CleanupRetentionJobData,
  CleanupRetentionResult
> {
  private readonly defaultBatchSize = 1000;

  constructor() {
    super(WorkerQueueName.CLEANUP_RETENTION, 3); // Lower concurrency for heavy operations
  }

  /**
   * Process cleanup retention job
   */
  protected async processJob(
    job: Job<CleanupRetentionJobData>
  ): Promise<JobResult<CleanupRetentionResult>> {
    const { type, cleanupType, userId, dryRun = false } = job.data;
    const startTime = Date.now();

    try {
      let result: CleanupRetentionResult;

      switch (type) {
        case 'cleanup':
          result = await this.runCleanup(job.data);
          break;

        case 'archive':
          result = await this.runArchive(job.data);
          break;

        case 'purge_user':
          if (!userId) {
            throw new Error('userId is required for purge_user');
          }
          result = await this.purgeUserData(userId, dryRun);
          break;

        case 'check_inactive':
          result = await this.checkInactiveUsers();
          break;

        case 'gdpr_deletion':
          if (!userId) {
            throw new Error('userId is required for gdpr_deletion');
          }
          result = await this.gdprDeletion(userId);
          break;

        default:
          throw new Error(`Unknown cleanup type: ${type}`);
      }

      await job.progress(100);

      logger.info(`Cleanup retention completed`, {
        type,
        correlationId: job.data.correlationId,
        cleanupType,
        recordsProcessed: result.recordsProcessed,
        recordsDeleted: result.recordsDeleted,
        processingTimeMs: Date.now() - startTime,
      });

      return {
        success: true,
        data: result,
      };
    } catch (error: any) {
      logger.error(`Cleanup retention failed`, {
        type,
        correlationId: job.data.correlationId,
        cleanupType,
        error: error.message,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Run cleanup based on type
   */
  private async runCleanup(jobData: CleanupRetentionJobData): Promise<CleanupRetentionResult> {
    const {
      cleanupType = CleanupType.ALL,
      dryRun = false,
      batchSize = this.defaultBatchSize,
    } = jobData;

    let totalProcessed = 0;
    let totalDeleted = 0;
    let totalArchived = 0;
    let errors = 0;

    const cleanupFunctions: Record<CleanupType, () => Promise<Partial<CleanupRetentionResult>>> = {
      [CleanupType.MESSAGES]: () => this.cleanupMessages(dryRun, batchSize),
      [CleanupType.NOTIFICATIONS]: () => this.cleanupNotifications(dryRun, batchSize),
      [CleanupType.MEDIA]: () => this.cleanupMedia(dryRun, batchSize),
      [CleanupType.SESSIONS]: () => this.cleanupSessions(dryRun, batchSize),
      [CleanupType.MATCHES]: () => this.cleanupMatches(dryRun, batchSize),
      [CleanupType.ANALYTICS]: () => this.cleanupAnalytics(dryRun, batchSize),
      [CleanupType.MODERATION]: () => this.cleanupModeration(dryRun, batchSize),
      [CleanupType.USERS]: () => this.cleanupUsers(dryRun, batchSize),
      [CleanupType.ALL]: async () => {
        // Run all cleanups
        const results = await Promise.all([
          this.cleanupMessages(dryRun, batchSize),
          this.cleanupNotifications(dryRun, batchSize),
          this.cleanupMedia(dryRun, batchSize),
          this.cleanupSessions(dryRun, batchSize),
          this.cleanupMatches(dryRun, batchSize),
          this.cleanupAnalytics(dryRun, batchSize),
          this.cleanupModeration(dryRun, batchSize),
        ]);

        return {
          recordsProcessed: results.reduce((sum, r) => sum + (r.recordsProcessed || 0), 0),
          recordsDeleted: results.reduce((sum, r) => sum + (r.recordsDeleted || 0), 0),
          recordsArchived: results.reduce((sum, r) => sum + (r.recordsArchived || 0), 0),
        };
      },
    };

    try {
      const cleanupFn = cleanupFunctions[cleanupType];

      if (!cleanupFn) {
        throw new Error(`Unknown cleanup type: ${cleanupType}`);
      }

      const result = await cleanupFn();

      totalProcessed += result.recordsProcessed || 0;
      totalDeleted += result.recordsDeleted || 0;
      totalArchived += result.recordsArchived || 0;
    } catch (error: any) {
      logger.error(`Cleanup failed for ${cleanupType}:`, error);
      errors++;
    }

    return {
      cleanupType,
      recordsProcessed: totalProcessed,
      recordsDeleted: totalDeleted,
      recordsArchived: totalArchived,
      errors,
      dryRun,
    };
  }

  /**
   * Run archive operation
   */
  private async runArchive(jobData: CleanupRetentionJobData): Promise<CleanupRetentionResult> {
    const {
      cleanupType = CleanupType.ALL,
      dryRun = false,
      batchSize = this.defaultBatchSize,
    } = jobData;

    let totalProcessed = 0;
    let totalArchived = 0;

    // Archive old data to cold storage
    const archiveOperations = [
      { type: 'messages', days: RetentionPolicies.MESSAGE_RETENTION },
      { type: 'matches', days: RetentionPolicies.EXPIRED_MATCHES },
      { type: 'analytics', days: RetentionPolicies.DETAILED_ANALYTICS },
    ];

    for (const op of archiveOperations) {
      if (cleanupType !== CleanupType.ALL && cleanupType !== op.type) {
        continue;
      }

      try {
        const result = await this.archiveData(op.type, op.days, dryRun, batchSize);
        totalProcessed += result.recordsProcessed || 0;
        totalArchived += result.recordsArchived || 0;
      } catch (error: any) {
        logger.error(`Archive failed for ${op.type}:`, error);
      }
    }

    return {
      cleanupType,
      recordsProcessed: totalProcessed,
      recordsDeleted: 0,
      recordsArchived: totalArchived,
      dryRun,
    };
  }

  /**
   * Purge all user data (for account deletion)
   */
  private async purgeUserData(userId: string, dryRun: boolean): Promise<CleanupRetentionResult> {
    let totalDeleted = 0;

    logger.info(`Starting user data purge for ${userId} (dryRun: ${dryRun})`);

    // List of services and data to purge
    const purgeOperations = [
      { service: MESSAGING_SERVICE_URL, endpoint: `/api/v1/internal/users/${userId}/data` },
      { service: MATCHING_SERVICE_URL, endpoint: `/api/v1/internal/users/${userId}/data` },
      { service: MEDIA_SERVICE_URL, endpoint: `/api/v1/internal/users/${userId}/data` },
      { service: NOTIFICATION_SERVICE_URL, endpoint: `/api/v1/internal/users/${userId}/data` },
      { service: MODERATION_SERVICE_URL, endpoint: `/api/v1/internal/users/${userId}/data` },
    ];

    for (const op of purgeOperations) {
      try {
        if (!dryRun) {
          const response = await axios.delete(op.service + op.endpoint, {
            headers: {
              'X-Service-Auth': process.env.SERVICE_AUTH_TOKEN,
            },
            timeout: 30000,
          });

          totalDeleted += response.data.deletedCount || 0;
        } else {
          // Dry run - just count
          const response = await axios.get(op.service + op.endpoint + '/count', {
            headers: {
              'X-Service-Auth': process.env.SERVICE_AUTH_TOKEN,
            },
            timeout: 10000,
          });

          totalDeleted += response.data.count || 0;
        }
      } catch (error: any) {
        logger.error(`Failed to purge data from ${op.service}:`, error);
      }
    }

    // Finally purge user profile
    if (!dryRun) {
      try {
        await axios.delete(`${USER_SERVICE_URL}/api/v1/internal/users/${userId}/purge`, {
          headers: {
            'X-Service-Auth': process.env.SERVICE_AUTH_TOKEN,
          },
          timeout: 30000,
        });
        totalDeleted++;
      } catch (error: any) {
        logger.error(`Failed to purge user profile:`, error);
      }
    }

    logger.info(`User data purge completed for ${userId}: ${totalDeleted} records`);

    return {
      recordsProcessed: totalDeleted,
      recordsDeleted: dryRun ? 0 : totalDeleted,
      recordsArchived: 0,
      dryRun,
    };
  }

  /**
   * Check for inactive users
   */
  private async checkInactiveUsers(): Promise<CleanupRetentionResult> {
    let usersWarned = 0;
    let usersMarkedForDeletion = 0;

    try {
      // Get users inactive for warning period
      const warningCutoff = new Date(
        Date.now() - RetentionPolicies.INACTIVE_USER_WARNING * 24 * 60 * 60 * 1000
      );

      const inactiveUsers = await this.getInactiveUsers(warningCutoff);

      for (const user of inactiveUsers) {
        const lastActivity = new Date(user.lastActivityAt);
        const inactiveDays = Math.floor(
          (Date.now() - lastActivity.getTime()) / (24 * 60 * 60 * 1000)
        );

        if (inactiveDays >= RetentionPolicies.INACTIVE_USER_DELETION) {
          // Mark for deletion
          await this.markUserForDeletion(user.id);
          usersMarkedForDeletion++;
        } else if (
          inactiveDays >= RetentionPolicies.INACTIVE_USER_WARNING &&
          !user.inactivityWarningsSent
        ) {
          // Send warning notification
          await this.sendInactivityWarning(user.id, inactiveDays);
          usersWarned++;
        }
      }

      logger.info(
        `Inactive user check: ${usersWarned} warned, ${usersMarkedForDeletion} marked for deletion`
      );
    } catch (error: any) {
      logger.error('Failed to check inactive users:', error);
    }

    return {
      recordsProcessed: usersWarned + usersMarkedForDeletion,
      recordsDeleted: 0,
      recordsArchived: 0,
      dryRun: false,
    };
  }

  /**
   * GDPR compliant data deletion
   */
  private async gdprDeletion(userId: string): Promise<CleanupRetentionResult> {
    logger.info(`Starting GDPR deletion for user ${userId}`);

    let totalDeleted = 0;

    try {
      // Step 1: Export user data (required before deletion)
      const exportResult = await this.exportUserData(userId);

      // Step 2: Delete from all services
      const deleteResult = await this.purgeUserData(userId, false);
      totalDeleted = deleteResult.recordsDeleted;

      // Step 3: Log GDPR deletion request
      await this.logGDPRDeletion(userId, exportResult.exportId);

      // Step 4: Send confirmation email
      await this.sendDeletionConfirmation(userId, exportResult.exportUrl);

      logger.info(`GDPR deletion completed for user ${userId}`);
    } catch (error: any) {
      logger.error(`GDPR deletion failed for user ${userId}:`, error);
      throw error;
    }

    return {
      recordsProcessed: totalDeleted,
      recordsDeleted: totalDeleted,
      recordsArchived: 0,
      dryRun: false,
    };
  }

  // Cleanup implementations for each service

  private async cleanupMessages(
    dryRun: boolean,
    batchSize: number
  ): Promise<Partial<CleanupRetentionResult>> {
    const cutoffDate = new Date(
      Date.now() - RetentionPolicies.MESSAGE_RETENTION * 24 * 60 * 60 * 1000
    );

    try {
      const response = await axios.post(
        `${MESSAGING_SERVICE_URL}/api/v1/internal/cleanup`,
        {
          type: 'messages',
          olderThan: cutoffDate.toISOString(),
          batchSize,
          dryRun,
        },
        {
          headers: {
            'X-Service-Auth': process.env.SERVICE_AUTH_TOKEN,
          },
          timeout: 60000,
        }
      );

      return {
        recordsProcessed: response.data.processed || 0,
        recordsDeleted: response.data.deleted || 0,
      };
    } catch (error: any) {
      logger.error('Message cleanup failed:', error);
      return { recordsProcessed: 0, recordsDeleted: 0 };
    }
  }

  private async cleanupNotifications(
    dryRun: boolean,
    batchSize: number
  ): Promise<Partial<CleanupRetentionResult>> {
    const readCutoff = new Date(
      Date.now() - RetentionPolicies.READ_NOTIFICATIONS * 24 * 60 * 60 * 1000
    );
    const unreadCutoff = new Date(
      Date.now() - RetentionPolicies.UNREAD_NOTIFICATIONS * 24 * 60 * 60 * 1000
    );

    try {
      const response = await axios.post(
        `${NOTIFICATION_SERVICE_URL}/api/v1/internal/cleanup`,
        {
          readOlderThan: readCutoff.toISOString(),
          unreadOlderThan: unreadCutoff.toISOString(),
          batchSize,
          dryRun,
        },
        {
          headers: {
            'X-Service-Auth': process.env.SERVICE_AUTH_TOKEN,
          },
          timeout: 60000,
        }
      );

      return {
        recordsProcessed: response.data.processed || 0,
        recordsDeleted: response.data.deleted || 0,
      };
    } catch (error: any) {
      logger.error('Notification cleanup failed:', error);
      return { recordsProcessed: 0, recordsDeleted: 0 };
    }
  }

  private async cleanupMedia(
    dryRun: boolean,
    batchSize: number
  ): Promise<Partial<CleanupRetentionResult>> {
    const orphanedCutoff = new Date(
      Date.now() - RetentionPolicies.ORPHANED_MEDIA * 24 * 60 * 60 * 1000
    );
    const tempCutoff = new Date(Date.now() - RetentionPolicies.TEMP_UPLOADS * 24 * 60 * 60 * 1000);

    try {
      const response = await axios.post(
        `${MEDIA_SERVICE_URL}/api/v1/internal/cleanup`,
        {
          orphanedOlderThan: orphanedCutoff.toISOString(),
          tempOlderThan: tempCutoff.toISOString(),
          batchSize,
          dryRun,
        },
        {
          headers: {
            'X-Service-Auth': process.env.SERVICE_AUTH_TOKEN,
          },
          timeout: 120000, // Longer timeout for media deletion
        }
      );

      return {
        recordsProcessed: response.data.processed || 0,
        recordsDeleted: response.data.deleted || 0,
        bytesFreed: response.data.bytesFreed || 0,
      };
    } catch (error: any) {
      logger.error('Media cleanup failed:', error);
      return { recordsProcessed: 0, recordsDeleted: 0 };
    }
  }

  private async cleanupSessions(
    dryRun: boolean,
    batchSize: number
  ): Promise<Partial<CleanupRetentionResult>> {
    const sessionCutoff = new Date(
      Date.now() - RetentionPolicies.EXPIRED_SESSIONS * 24 * 60 * 60 * 1000
    );
    const tokenCutoff = new Date(
      Date.now() - RetentionPolicies.REVOKED_TOKENS * 24 * 60 * 60 * 1000
    );

    try {
      const response = await axios.post(
        `${USER_SERVICE_URL}/api/v1/internal/cleanup/sessions`,
        {
          expiredOlderThan: sessionCutoff.toISOString(),
          revokedOlderThan: tokenCutoff.toISOString(),
          batchSize,
          dryRun,
        },
        {
          headers: {
            'X-Service-Auth': process.env.SERVICE_AUTH_TOKEN,
          },
          timeout: 60000,
        }
      );

      return {
        recordsProcessed: response.data.processed || 0,
        recordsDeleted: response.data.deleted || 0,
      };
    } catch (error: any) {
      logger.error('Session cleanup failed:', error);
      return { recordsProcessed: 0, recordsDeleted: 0 };
    }
  }

  private async cleanupMatches(
    dryRun: boolean,
    batchSize: number
  ): Promise<Partial<CleanupRetentionResult>> {
    const swipeCutoff = new Date(
      Date.now() - RetentionPolicies.SWIPE_HISTORY * 24 * 60 * 60 * 1000
    );
    const expiredMatchCutoff = new Date(
      Date.now() - RetentionPolicies.EXPIRED_MATCHES * 24 * 60 * 60 * 1000
    );

    try {
      const response = await axios.post(
        `${MATCHING_SERVICE_URL}/api/v1/internal/cleanup`,
        {
          swipesOlderThan: swipeCutoff.toISOString(),
          expiredMatchesOlderThan: expiredMatchCutoff.toISOString(),
          batchSize,
          dryRun,
        },
        {
          headers: {
            'X-Service-Auth': process.env.SERVICE_AUTH_TOKEN,
          },
          timeout: 60000,
        }
      );

      return {
        recordsProcessed: response.data.processed || 0,
        recordsDeleted: response.data.deleted || 0,
      };
    } catch (error: any) {
      logger.error('Match cleanup failed:', error);
      return { recordsProcessed: 0, recordsDeleted: 0 };
    }
  }

  private async cleanupAnalytics(
    dryRun: boolean,
    batchSize: number
  ): Promise<Partial<CleanupRetentionResult>> {
    const detailedCutoff = new Date(
      Date.now() - RetentionPolicies.DETAILED_ANALYTICS * 24 * 60 * 60 * 1000
    );

    try {
      const response = await axios.post(
        `${ANALYTICS_SERVICE_URL}/api/v1/internal/cleanup`,
        {
          detailedOlderThan: detailedCutoff.toISOString(),
          batchSize,
          dryRun,
        },
        {
          headers: {
            'X-Service-Auth': process.env.SERVICE_AUTH_TOKEN,
          },
          timeout: 120000,
        }
      );

      return {
        recordsProcessed: response.data.processed || 0,
        recordsDeleted: response.data.deleted || 0,
        recordsArchived: response.data.archived || 0,
      };
    } catch (error: any) {
      logger.error('Analytics cleanup failed:', error);
      return { recordsProcessed: 0, recordsDeleted: 0 };
    }
  }

  private async cleanupModeration(
    dryRun: boolean,
    batchSize: number
  ): Promise<Partial<CleanupRetentionResult>> {
    const resolvedCutoff = new Date(
      Date.now() - RetentionPolicies.RESOLVED_REPORTS * 24 * 60 * 60 * 1000
    );
    const dlqCutoff = new Date(Date.now() - RetentionPolicies.DLQ_JOBS * 24 * 60 * 60 * 1000);

    try {
      const response = await axios.post(
        `${MODERATION_SERVICE_URL}/api/v1/internal/cleanup`,
        {
          resolvedOlderThan: resolvedCutoff.toISOString(),
          dlqOlderThan: dlqCutoff.toISOString(),
          batchSize,
          dryRun,
        },
        {
          headers: {
            'X-Service-Auth': process.env.SERVICE_AUTH_TOKEN,
          },
          timeout: 60000,
        }
      );

      return {
        recordsProcessed: response.data.processed || 0,
        recordsDeleted: response.data.deleted || 0,
      };
    } catch (error: any) {
      logger.error('Moderation cleanup failed:', error);
      return { recordsProcessed: 0, recordsDeleted: 0 };
    }
  }

  private async cleanupUsers(
    dryRun: boolean,
    batchSize: number
  ): Promise<Partial<CleanupRetentionResult>> {
    const deletedUserCutoff = new Date(
      Date.now() - RetentionPolicies.DELETED_USER_DATA * 24 * 60 * 60 * 1000
    );

    try {
      const response = await axios.post(
        `${USER_SERVICE_URL}/api/v1/internal/cleanup/deleted-users`,
        {
          deletedOlderThan: deletedUserCutoff.toISOString(),
          batchSize,
          dryRun,
        },
        {
          headers: {
            'X-Service-Auth': process.env.SERVICE_AUTH_TOKEN,
          },
          timeout: 60000,
        }
      );

      return {
        recordsProcessed: response.data.processed || 0,
        recordsDeleted: response.data.deleted || 0,
      };
    } catch (error: any) {
      logger.error('User cleanup failed:', error);
      return { recordsProcessed: 0, recordsDeleted: 0 };
    }
  }

  private async archiveData(
    type: string,
    days: number,
    dryRun: boolean,
    batchSize: number
  ): Promise<Partial<CleanupRetentionResult>> {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // In production, this would move data to cold storage (e.g., S3 Glacier)
    logger.info(`Archiving ${type} data older than ${cutoffDate.toISOString()}`);

    return {
      recordsProcessed: 0,
      recordsArchived: 0,
    };
  }

  // Helper methods

  private async getInactiveUsers(cutoffDate: Date): Promise<any[]> {
    try {
      const response = await axios.get(`${USER_SERVICE_URL}/api/v1/internal/users/inactive`, {
        params: {
          lastActivityBefore: cutoffDate.toISOString(),
          limit: 1000,
        },
        headers: {
          'X-Service-Auth': process.env.SERVICE_AUTH_TOKEN,
        },
        timeout: 30000,
      });

      return response.data.users || [];
    } catch (error) {
      return [];
    }
  }

  private async markUserForDeletion(userId: string): Promise<void> {
    try {
      await axios.patch(
        `${USER_SERVICE_URL}/api/v1/internal/users/${userId}`,
        {
          markedForDeletion: true,
          deletionScheduledAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        },
        {
          headers: {
            'X-Service-Auth': process.env.SERVICE_AUTH_TOKEN,
          },
          timeout: 5000,
        }
      );
    } catch (error: any) {
      logger.error(`Failed to mark user ${userId} for deletion:`, error);
    }
  }

  private async sendInactivityWarning(userId: string, inactiveDays: number): Promise<void> {
    try {
      await axios.post(
        `${NOTIFICATION_SERVICE_URL}/api/v1/notifications`,
        {
          userId,
          type: 'system',
          title: 'We miss you!',
          body: `It's been ${inactiveDays} days since we saw you. Come back and see what's new!`,
          channels: ['email'],
          priority: 'low',
        },
        {
          headers: {
            'X-Service-Auth': process.env.SERVICE_AUTH_TOKEN,
          },
          timeout: 5000,
        }
      );

      // Mark warning as sent
      await axios.patch(
        `${USER_SERVICE_URL}/api/v1/internal/users/${userId}`,
        {
          inactivityWarningsSent: true,
          lastInactivityWarningSentAt: new Date().toISOString(),
        },
        {
          headers: {
            'X-Service-Auth': process.env.SERVICE_AUTH_TOKEN,
          },
          timeout: 5000,
        }
      );
    } catch (error: any) {
      logger.error(`Failed to send inactivity warning to ${userId}:`, error);
    }
  }

  private async exportUserData(userId: string): Promise<{ exportId: string; exportUrl: string }> {
    try {
      const response = await axios.post(
        `${USER_SERVICE_URL}/api/v1/internal/users/${userId}/export`,
        {},
        {
          headers: {
            'X-Service-Auth': process.env.SERVICE_AUTH_TOKEN,
          },
          timeout: 60000,
        }
      );

      return {
        exportId: response.data.exportId,
        exportUrl: response.data.downloadUrl,
      };
    } catch (error: any) {
      logger.error(`Failed to export user data for ${userId}:`, error);
      return { exportId: 'export_failed', exportUrl: '' };
    }
  }

  private async logGDPRDeletion(userId: string, exportId: string): Promise<void> {
    logger.info(`GDPR deletion logged`, {
      userId,
      exportId,
      deletedAt: new Date().toISOString(),
    });
  }

  private async sendDeletionConfirmation(userId: string, exportUrl: string): Promise<void> {
    try {
      // Get user email before deletion (should be cached)
      await axios.post(
        `${NOTIFICATION_SERVICE_URL}/api/v1/internal/email/send`,
        {
          userId,
          subject: 'Your account has been deleted',
          html: `
            <p>Your Flamoral account and all associated data have been deleted.</p>
            <p>If you exported your data before deletion, you can download it here: <a href="${exportUrl}">Download Data</a></p>
            <p>This link will expire in 7 days.</p>
          `,
        },
        {
          headers: {
            'X-Service-Auth': process.env.SERVICE_AUTH_TOKEN,
          },
          timeout: 10000,
        }
      );
    } catch (error: any) {
      logger.error('Failed to send deletion confirmation:', error);
    }
  }

  // Public scheduling methods

  async scheduleCleanup(
    cleanupType: CleanupType = CleanupType.ALL,
    dryRun: boolean = false
  ): Promise<void> {
    await this.addJob(
      {
        type: 'cleanup',
        cleanupType,
        dryRun,
      },
      {
        priority: JobPriority.LOW,
      }
    );
  }

  async scheduleArchive(cleanupType: CleanupType = CleanupType.ALL): Promise<void> {
    await this.addJob(
      {
        type: 'archive',
        cleanupType,
      },
      {
        priority: JobPriority.LOW,
      }
    );
  }

  async scheduleUserPurge(userId: string, dryRun: boolean = false): Promise<void> {
    await this.addJob(
      {
        type: 'purge_user',
        userId,
        dryRun,
      },
      {
        priority: JobPriority.NORMAL,
      }
    );
  }

  async scheduleInactiveUserCheck(): Promise<void> {
    await this.addJob(
      {
        type: 'check_inactive',
      },
      {
        priority: JobPriority.LOW,
      }
    );
  }

  async scheduleGDPRDeletion(userId: string): Promise<void> {
    await this.addJob(
      {
        type: 'gdpr_deletion',
        userId,
      },
      {
        priority: JobPriority.HIGH,
      }
    );
  }
}

// Export singleton instance
export const cleanupRetentionWorker = new CleanupRetentionWorker();
export default cleanupRetentionWorker;
