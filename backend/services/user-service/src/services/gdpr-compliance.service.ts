import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

import archiver from 'archiver';
import { Knex } from 'knex';

import logger from '../utils/logger';

const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);
const mkdir = promisify(fs.mkdir);

interface DataExportRequest {
  id: string;
  user_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  file_path?: string;
  download_url?: string;
  expires_at?: Date;
  requested_at: Date;
  completed_at?: Date;
  error_message?: string;
}

interface DeletionRequest {
  id: string;
  user_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  requested_at: Date;
  scheduled_deletion_at: Date;
  completed_at?: Date;
  cancellation_token?: string;
  ip_address?: string;
  user_agent?: string;
}

/**
 * GDPR Compliance Service
 * Handles data export, right to deletion, and GDPR compliance
 */
export class GDPRComplianceService {
  private db: Knex;
  private readonly EXPORT_EXPIRY_DAYS = 7;
  private readonly DELETION_GRACE_PERIOD_DAYS = 30;
  private readonly TEMP_EXPORT_DIR = path.join(process.cwd(), 'temp', 'exports');

  constructor(database: Knex) {
    this.db = database;
    this.ensureTempDirectory();
  }

  /**
   * Ensure temporary export directory exists
   */
  private async ensureTempDirectory(): Promise<void> {
    try {
      await mkdir(this.TEMP_EXPORT_DIR, { recursive: true });
    } catch (error) {
      logger.error(`Failed to create temp directory: ${error}`);
    }
  }

  /**
   * Request user data export (GDPR Article 15 - Right of Access)
   */
  async requestDataExport(userId: string): Promise<DataExportRequest> {
    try {
      // Check if there's already a pending request
      const existingRequest = await this.db('data_export_requests')
        .where({ user_id: userId })
        .whereIn('status', ['pending', 'processing'])
        .first();

      if (existingRequest) {
        throw new Error('A data export request is already in progress');
      }

      // Create new export request
      const [request] = await this.db('data_export_requests')
        .insert({
          user_id: userId,
          status: 'pending',
          requested_at: new Date(),
        })
        .returning('*');

      logger.info(`Data export requested for user ${userId}`);

      // Start export process asynchronously
      this.processDataExport(request.id).catch((error) => {
        logger.error(`Failed to process data export: ${error}`);
      });

      return request;
    } catch (error) {
      logger.error(`Failed to request data export: ${error}`);
      throw error;
    }
  }

  /**
   * Process data export (generate ZIP file)
   */
  private async processDataExport(requestId: string): Promise<void> {
    let exportPath: string | undefined;

    try {
      // Update status to processing
      await this.db('data_export_requests')
        .where({ id: requestId })
        .update({ status: 'processing' });

      const request = await this.db('data_export_requests').where({ id: requestId }).first();

      if (!request) {
        throw new Error('Export request not found');
      }

      const userId = request.user_id;

      // Collect all user data
      const userData = await this.collectUserData(userId);

      // Create ZIP file
      exportPath = path.join(this.TEMP_EXPORT_DIR, `user_data_${userId}_${Date.now()}.zip`);
      await this.createZipArchive(userData, exportPath);

      // Update request with file info
      const expiresAt = new Date(Date.now() + this.EXPORT_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

      await this.db('data_export_requests')
        .where({ id: requestId })
        .update({
          status: 'completed',
          file_path: exportPath,
          download_url: `/api/privacy/data-export/${requestId}/download`,
          expires_at: expiresAt,
          completed_at: new Date(),
        });

      logger.info(`Data export completed for request ${requestId}`);
    } catch (error) {
      logger.error(`Failed to process data export: ${error}`);

      await this.db('data_export_requests')
        .where({ id: requestId })
        .update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error',
        });

      // Clean up partial export
      if (exportPath) {
        try {
          await unlink(exportPath);
        } catch (cleanupError) {
          logger.error(`Failed to cleanup failed export: ${cleanupError}`);
        }
      }
    }
  }

  /**
   * Collect all user data from all tables
   */
  private async collectUserData(userId: string): Promise<Record<string, any>> {
    const data: Record<string, any> = {};

    // User profile
    data.user = await this.db('users').where({ id: userId }).first();

    data.profile = await this.db('profiles').where({ user_id: userId }).first();

    data.preferences = await this.db('preferences').where({ user_id: userId }).first();

    // Photos
    data.photos = await this.db('photos').where({ user_id: userId }).select('*');

    // Prompts and answers
    data.userPrompts = await this.db('user_prompts').where({ user_id: userId }).select('*');

    // Swipes and matches
    data.swipes = await this.db('swipes')
      .where('swiper_id', userId)
      .orWhere('swiped_id', userId)
      .select('*');

    data.matches = await this.db('matches')
      .where('user1_id', userId)
      .orWhere('user2_id', userId)
      .select('*');

    // Messages (without encryption keys for security)
    data.conversations = await this.db('conversations')
      .where('user1_id', userId)
      .orWhere('user2_id', userId)
      .select('*');

    data.messages = await this.db('messages')
      .where('sender_id', userId)
      .orWhere('receiver_id', userId)
      .select(
        'id',
        'conversation_id',
        'sender_id',
        'receiver_id',
        'content',
        'created_at',
        'read_at'
      );

    // Subscription and payments
    data.subscriptions = await this.db('subscriptions').where({ user_id: userId }).select('*');

    data.coinTransactions = await this.db('coin_transactions')
      .where({ user_id: userId })
      .select('*');

    data.boosts = await this.db('boosts').where({ user_id: userId }).select('*');

    // Privacy and safety
    data.blockedUsers = await this.db('blocked_users')
      .where('blocker_id', userId)
      .orWhere('blocked_id', userId)
      .select('*');

    data.reports = await this.db('reports').where({ reporter_id: userId }).select('*');

    data.privacySettings = await this.db('privacy_settings').where({ user_id: userId }).first();

    // GDPR consent
    data.gdprConsent = await this.db('gdpr_consent').where({ user_id: userId }).select('*');

    // Login history (last 90 days for security)
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    data.loginAttempts = await this.db('login_attempts')
      .where({ user_id: userId })
      .where('attempted_at', '>', ninetyDaysAgo)
      .select('*');

    // Remove sensitive information
    if (data.user) {
      delete data.user.password_hash;
    }

    return data;
  }

  /**
   * Create ZIP archive from user data
   */
  private async createZipArchive(data: Record<string, any>, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(outputPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', () => {
        logger.info(`Archive created: ${archive.pointer()} bytes`);
        resolve();
      });

      archive.on('error', (err) => {
        reject(err);
      });

      archive.pipe(output);

      // Add JSON files for each data type
      Object.keys(data).forEach((key) => {
        if (data[key]) {
          archive.append(JSON.stringify(data[key], null, 2), {
            name: `${key}.json`,
          });
        }
      });

      // Add README
      const readme = this.generateReadme();
      archive.append(readme, { name: 'README.txt' });

      archive.finalize();
    });
  }

  /**
   * Generate README for data export
   */
  private generateReadme(): string {
    return `
GDPR Data Export
================

This archive contains all your personal data stored in our system.

Contents:
- user.json: Your account information
- profile.json: Your profile details
- preferences.json: Your matching preferences
- photos.json: List of your photos
- userPrompts.json: Your profile prompts and answers
- swipes.json: Your swipe history
- matches.json: Your matches
- conversations.json: Your conversation metadata
- messages.json: Your message history
- subscriptions.json: Your subscription history
- coinTransactions.json: Your coin transaction history
- boosts.json: Your boost history
- blockedUsers.json: Users you've blocked
- reports.json: Reports you've submitted
- privacySettings.json: Your privacy settings
- gdprConsent.json: Your consent records
- loginAttempts.json: Your recent login history

Data Format: JSON
Generated: ${new Date().toISOString()}
Valid Until: ${new Date(Date.now() + this.EXPORT_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString()}

If you have any questions about this data, please contact our support team.
    `.trim();
  }

  /**
   * Get data export request status
   */
  async getExportRequestStatus(
    requestId: string,
    userId: string
  ): Promise<DataExportRequest | null> {
    return this.db('data_export_requests').where({ id: requestId, user_id: userId }).first();
  }

  /**
   * Request account deletion (GDPR Article 17 - Right to Erasure)
   */
  async requestAccountDeletion(
    userId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<DeletionRequest> {
    try {
      // Check if there's already a pending deletion request
      const existingRequest = await this.db('deletion_requests')
        .where({ user_id: userId })
        .whereIn('status', ['pending', 'processing'])
        .first();

      if (existingRequest) {
        return existingRequest;
      }

      // Generate cancellation token
      const cancellationToken = this.generateCancellationToken();

      // Schedule deletion after grace period
      const scheduledDeletionAt = new Date(
        Date.now() + this.DELETION_GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000
      );

      // Create deletion request
      const [request] = await this.db('deletion_requests')
        .insert({
          user_id: userId,
          status: 'pending',
          requested_at: new Date(),
          scheduled_deletion_at: scheduledDeletionAt,
          cancellation_token: cancellationToken,
          ip_address: ipAddress,
          user_agent: userAgent,
        })
        .returning('*');

      // Deactivate user account immediately
      await this.db('users').where({ id: userId }).update({
        is_active: false,
        deactivated_at: new Date(),
      });

      logger.info(
        `Account deletion requested for user ${userId}, scheduled for ${scheduledDeletionAt}`
      );

      return request;
    } catch (error) {
      logger.error(`Failed to request account deletion: ${error}`);
      throw error;
    }
  }

  /**
   * Cancel account deletion request
   */
  async cancelAccountDeletion(userId: string, cancellationToken: string): Promise<boolean> {
    try {
      const request = await this.db('deletion_requests')
        .where({
          user_id: userId,
          cancellation_token: cancellationToken,
          status: 'pending',
        })
        .first();

      if (!request) {
        throw new Error('Deletion request not found or already processed');
      }

      // Check if still within grace period
      if (new Date() > new Date(request.scheduled_deletion_at)) {
        throw new Error('Grace period has expired');
      }

      // Update request status
      await this.db('deletion_requests')
        .where({ id: request.id })
        .update({ status: 'cancelled', completed_at: new Date() });

      // Reactivate user account
      await this.db('users').where({ id: userId }).update({
        is_active: true,
        deactivated_at: null,
      });

      logger.info(`Account deletion cancelled for user ${userId}`);

      return true;
    } catch (error) {
      logger.error(`Failed to cancel account deletion: ${error}`);
      throw error;
    }
  }

  /**
   * Process pending deletions (called by cron job)
   */
  async processPendingDeletions(): Promise<void> {
    try {
      const now = new Date();

      // Get all pending deletions past scheduled time
      const pendingDeletions = await this.db('deletion_requests')
        .where({ status: 'pending' })
        .where('scheduled_deletion_at', '<=', now)
        .select('*');

      for (const request of pendingDeletions) {
        try {
          await this.db('deletion_requests')
            .where({ id: request.id })
            .update({ status: 'processing' });

          await this.deleteUserData(request.user_id);

          await this.db('deletion_requests').where({ id: request.id }).update({
            status: 'completed',
            completed_at: new Date(),
          });

          logger.info(`Completed account deletion for user ${request.user_id}`);
        } catch (error) {
          logger.error(`Failed to delete user ${request.user_id}: ${error}`);

          await this.db('deletion_requests')
            .where({ id: request.id })
            .update({
              status: 'failed',
              error_message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
      }
    } catch (error) {
      logger.error(`Failed to process pending deletions: ${error}`);
    }
  }

  /**
   * Delete all user data from system
   */
  private async deleteUserData(userId: string): Promise<void> {
    await this.db.transaction(async (trx) => {
      // Delete in order to respect foreign key constraints
      await trx('messages').where('sender_id', userId).orWhere('receiver_id', userId).delete();
      await trx('conversations').where('user1_id', userId).orWhere('user2_id', userId).delete();
      await trx('matches').where('user1_id', userId).orWhere('user2_id', userId).delete();
      await trx('swipes').where('swiper_id', userId).orWhere('swiped_id', userId).delete();
      await trx('blocked_users').where('blocker_id', userId).orWhere('blocked_id', userId).delete();
      await trx('reports').where('reporter_id', userId).orWhere('reported_id', userId).delete();
      await trx('boosts').where({ user_id: userId }).delete();
      await trx('coin_transactions').where({ user_id: userId }).delete();
      await trx('subscriptions').where({ user_id: userId }).delete();
      await trx('user_prompts').where({ user_id: userId }).delete();
      await trx('photos').where({ user_id: userId }).delete();
      await trx('privacy_settings').where({ user_id: userId }).delete();
      await trx('preferences').where({ user_id: userId }).delete();
      await trx('profiles').where({ user_id: userId }).delete();
      await trx('gdpr_consent').where({ user_id: userId }).delete();
      await trx('ccpa_opt_outs').where({ user_id: userId }).delete();
      await trx('data_access_logs').where({ user_id: userId }).delete();
      await trx('login_attempts').where({ user_id: userId }).delete();
      await trx('account_lockouts').where({ user_id: userId }).delete();
      await trx('security_sessions').where({ user_id: userId }).delete();
      await trx('encryption_keys').where({ user_id: userId }).delete();
      await trx('one_time_prekeys').where({ user_id: userId }).delete();
      await trx('refresh_tokens').where({ user_id: userId }).delete();
      await trx('verification_tokens').where({ user_id: userId }).delete();
      await trx('users').where({ id: userId }).delete();

      logger.info(`Deleted all data for user ${userId}`);
    });
  }

  /**
   * Clean up expired data exports
   */
  async cleanupExpiredExports(): Promise<void> {
    try {
      const expiredExports = await this.db('data_export_requests')
        .where('status', 'completed')
        .where('expires_at', '<', new Date())
        .select('*');

      for (const exportRequest of expiredExports) {
        if (exportRequest.file_path) {
          try {
            await unlink(exportRequest.file_path);
          } catch (error) {
            logger.error(`Failed to delete export file: ${error}`);
          }
        }

        await this.db('data_export_requests').where({ id: exportRequest.id }).delete();
      }

      logger.info(`Cleaned up ${expiredExports.length} expired exports`);
    } catch (error) {
      logger.error(`Failed to cleanup expired exports: ${error}`);
    }
  }

  /**
   * Generate cancellation token
   */
  private generateCancellationToken(): string {
    return require('crypto').randomBytes(32).toString('hex');
  }
}
