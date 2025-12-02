import { db } from '../../infrastructure/database/connection';
import logger from '../../utils/logger';
import archiver from 'archiver';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface ConsentRequest {
  userId: string;
  consentType: string;
  granted: boolean;
  version: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface DataExportRequest {
  userId: string;
  format: 'json' | 'zip';
  ipAddress?: string;
}

export interface DeletionRequest {
  userId: string;
  deletionType: 'soft_delete' | 'hard_delete' | 'anonymize';
  reason?: string;
  ipAddress?: string;
}

/**
 * GDPR Compliance Service
 * Handles data subject rights under GDPR
 */
export class GDPRService {
  private readonly EXPORT_EXPIRY_HOURS = 48; // Export URL valid for 48 hours
  private readonly DELETION_GRACE_PERIOD_DAYS = 30; // 30-day grace period before deletion

  /**
   * Record user consent
   */
  async recordConsent(request: ConsentRequest): Promise<void> {
    try {
      const existingConsent = await db('gdpr_consents')
        .where({
          user_id: request.userId,
          consent_type: request.consentType,
        })
        .orderBy('granted_at', 'desc')
        .first();

      // If consent status changed or new consent, record it
      if (!existingConsent || existingConsent.granted !== request.granted) {
        await db('gdpr_consents').insert({
          user_id: request.userId,
          consent_type: request.consentType,
          granted: request.granted,
          version: request.version,
          ip_address: request.ipAddress,
          user_agent: request.userAgent,
          granted_at: new Date(),
          revoked_at: request.granted ? null : new Date(),
        });

        logger.info(`Consent recorded for user ${request.userId}: ${request.consentType} = ${request.granted}`);
      }
    } catch (error) {
      logger.error('Error recording consent:', error);
      throw new Error('Failed to record consent');
    }
  }

  /**
   * Get user's consent status
   */
  async getUserConsents(userId: string): Promise<any[]> {
    try {
      // Get latest consent for each type
      const consents = await db('gdpr_consents')
        .select('consent_type', 'granted', 'version', 'granted_at', 'revoked_at')
        .where({ user_id: userId })
        .whereIn('id', function() {
          this.select(db.raw('MAX(id)'))
            .from('gdpr_consents')
            .where({ user_id: userId })
            .groupBy('consent_type');
        });

      return consents;
    } catch (error) {
      logger.error('Error getting user consents:', error);
      throw new Error('Failed to get user consents');
    }
  }

  /**
   * Revoke specific consent
   */
  async revokeConsent(userId: string, consentType: string, reason?: string): Promise<void> {
    try {
      await this.recordConsent({
        userId,
        consentType,
        granted: false,
        version: 'current', // Should track actual version
      });

      // Update the revocation reason
      await db('gdpr_consents')
        .where({ user_id: userId, consent_type: consentType })
        .orderBy('granted_at', 'desc')
        .limit(1)
        .update({ revocation_reason: reason });

      logger.info(`Consent revoked for user ${userId}: ${consentType}`);
    } catch (error) {
      logger.error('Error revoking consent:', error);
      throw new Error('Failed to revoke consent');
    }
  }

  /**
   * Request data export (Right to Data Portability)
   */
  async requestDataExport(request: DataExportRequest): Promise<string> {
    try {
      // Check for existing pending/processing requests
      const existingRequest = await db('data_export_requests')
        .where({
          user_id: request.userId,
          status: ['pending', 'processing'],
        })
        .first();

      if (existingRequest) {
        return existingRequest.id;
      }

      // Create new export request
      const [exportRequest] = await db('data_export_requests')
        .insert({
          user_id: request.userId,
          status: 'pending',
          format: request.format,
          ip_address: request.ipAddress,
          requested_at: new Date(),
        })
        .returning('*');

      // Process export asynchronously
      this.processDataExport(exportRequest.id).catch((error) => {
        logger.error('Error processing data export:', error);
      });

      logger.info(`Data export requested for user ${request.userId}`);
      return exportRequest.id;
    } catch (error) {
      logger.error('Error requesting data export:', error);
      throw new Error('Failed to request data export');
    }
  }

  /**
   * Process data export request
   */
  private async processDataExport(requestId: string): Promise<void> {
    try {
      // Update status to processing
      await db('data_export_requests')
        .where({ id: requestId })
        .update({ status: 'processing' });

      const request = await db('data_export_requests').where({ id: requestId }).first();
      const userId = request.user_id;

      // Collect all user data
      const userData = await this.collectUserData(userId);

      // Create export file
      const exportPath = await this.createExportFile(userId, userData, request.format);
      const fileStats = fs.statSync(exportPath);

      // Generate temporary download URL
      const downloadToken = crypto.randomBytes(32).toString('hex');
      const exportUrl = `${process.env.API_URL}/api/gdpr/download/${downloadToken}`;
      const expiresAt = new Date(Date.now() + this.EXPORT_EXPIRY_HOURS * 60 * 60 * 1000);

      // Update request with export details
      await db('data_export_requests')
        .where({ id: requestId })
        .update({
          status: 'completed',
          export_url: exportUrl,
          url_expires_at: expiresAt,
          file_path: exportPath,
          file_size: fileStats.size,
          included_data: JSON.stringify(Object.keys(userData)),
          completed_at: new Date(),
        });

      // TODO: Send email notification to user with download link

      logger.info(`Data export completed for request ${requestId}`);
    } catch (error) {
      logger.error('Error processing data export:', error);
      await db('data_export_requests')
        .where({ id: requestId })
        .update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
  }

  /**
   * Collect all user data from various tables
   */
  private async collectUserData(userId: string): Promise<any> {
    try {
      // Collect data from all relevant tables
      const [
        user,
        profile,
        preferences,
        photos,
        prompts,
        matches,
        swipes,
        messages,
        conversations,
        subscriptions,
        coins,
        consents,
        loginAttempts,
      ] = await Promise.all([
        db('users').where({ id: userId }).first(),
        db('profiles').where({ user_id: userId }).first(),
        db('preferences').where({ user_id: userId }).first(),
        db('photos').where({ user_id: userId }).select('*'),
        db('user_prompts').where({ user_id: userId }).select('*'),
        db('matches').where('user1_id', userId).orWhere('user2_id', userId).select('*'),
        db('swipes').where('swiper_id', userId).orWhere('swiped_id', userId).select('*'),
        db('messages').where('sender_id', userId).orWhere('receiver_id', userId).select('*'),
        db('conversations').whereRaw(`'${userId}' = ANY(participant_ids)`).select('*'),
        db('subscriptions').where({ user_id: userId }).select('*'),
        db('coins').where({ user_id: userId }).first(),
        db('gdpr_consents').where({ user_id: userId }).select('*'),
        db('login_attempts').where({ user_id: userId }).orderBy('attempted_at', 'desc').limit(100).select('*'),
      ]);

      return {
        user: this.sanitizeUserData(user),
        profile,
        preferences,
        photos: photos.map(p => ({ ...p, url: p.photo_url })), // Include photo URLs
        prompts,
        matches,
        swipes,
        messages: messages.map(m => ({ ...m, content: '[ENCRYPTED]' })), // Don't include message content
        conversations,
        subscriptions,
        coins,
        consents,
        loginAttempts: loginAttempts.map(la => ({
          attempted_at: la.attempted_at,
          successful: la.successful,
          ip_address: la.ip_address,
          location: la.location,
        })),
        exportMetadata: {
          exportedAt: new Date().toISOString(),
          dataVersion: '1.0',
          userId,
        },
      };
    } catch (error) {
      logger.error('Error collecting user data:', error);
      throw new Error('Failed to collect user data');
    }
  }

  /**
   * Sanitize user data for export (remove sensitive fields)
   */
  private sanitizeUserData(user: any): any {
    if (!user) return null;

    const { password_hash, ...sanitized } = user;
    return sanitized;
  }

  /**
   * Create export file (JSON or ZIP)
   */
  private async createExportFile(userId: string, data: any, format: 'json' | 'zip'): Promise<string> {
    const exportDir = path.join(__dirname, '../../../exports');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    const timestamp = Date.now();
    const filename = `user_data_${userId}_${timestamp}`;

    if (format === 'json') {
      const filepath = path.join(exportDir, `${filename}.json`);
      fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
      return filepath;
    } else {
      // Create ZIP archive
      const filepath = path.join(exportDir, `${filename}.zip`);
      const output = fs.createWriteStream(filepath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      return new Promise((resolve, reject) => {
        output.on('close', () => resolve(filepath));
        archive.on('error', reject);

        archive.pipe(output);

        // Add JSON file to archive
        archive.append(JSON.stringify(data, null, 2), { name: 'user_data.json' });

        // Add README
        const readme = this.generateExportReadme();
        archive.append(readme, { name: 'README.txt' });

        archive.finalize();
      });
    }
  }

  /**
   * Generate README for export
   */
  private generateExportReadme(): string {
    return `
YOUR PERSONAL DATA EXPORT
=========================

This archive contains all personal data we have collected about you.

Contents:
- user_data.json: All your personal information in JSON format

Data Categories:
- User Account Information
- Profile Details
- Preferences
- Photos
- Matches and Swipes
- Messages (encrypted)
- Subscription History
- Consent Records
- Login History

For questions about this data or your privacy rights, please contact:
privacy@flamoral.com

Export generated: ${new Date().toISOString()}
    `.trim();
  }

  /**
   * Get export request status
   */
  async getExportStatus(requestId: string): Promise<any> {
    try {
      const request = await db('data_export_requests')
        .where({ id: requestId })
        .first();

      if (!request) {
        throw new Error('Export request not found');
      }

      return {
        id: request.id,
        status: request.status,
        format: request.format,
        requestedAt: request.requested_at,
        completedAt: request.completed_at,
        expiresAt: request.url_expires_at,
        downloadUrl: request.export_url,
        fileSize: request.file_size,
      };
    } catch (error) {
      logger.error('Error getting export status:', error);
      throw new Error('Failed to get export status');
    }
  }

  /**
   * Request account deletion (Right to Erasure)
   */
  async requestDeletion(request: DeletionRequest): Promise<string> {
    try {
      // Check for existing pending deletion
      const existingRequest = await db('deletion_requests')
        .where({
          user_id: request.userId,
          status: ['pending', 'scheduled'],
        })
        .first();

      if (existingRequest) {
        return existingRequest.id;
      }

      // Generate cancellation token
      const cancellationToken = crypto.randomBytes(32).toString('hex');

      // Schedule deletion after grace period
      const scheduledFor = new Date(Date.now() + this.DELETION_GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000);

      const [deletionRequest] = await db('deletion_requests')
        .insert({
          user_id: request.userId,
          status: 'scheduled',
          deletion_type: request.deletionType,
          requested_at: new Date(),
          scheduled_for: scheduledFor,
          reason: request.reason,
          cancellation_token: cancellationToken,
          ip_address: request.ipAddress,
        })
        .returning('*');

      // TODO: Send email with cancellation link

      logger.info(`Deletion requested for user ${request.userId}, scheduled for ${scheduledFor}`);
      return deletionRequest.id;
    } catch (error) {
      logger.error('Error requesting deletion:', error);
      throw new Error('Failed to request deletion');
    }
  }

  /**
   * Cancel deletion request
   */
  async cancelDeletion(cancellationToken: string): Promise<void> {
    try {
      const request = await db('deletion_requests')
        .where({ cancellation_token: cancellationToken })
        .first();

      if (!request) {
        throw new Error('Deletion request not found');
      }

      if (request.status === 'completed') {
        throw new Error('Deletion already completed');
      }

      await db('deletion_requests')
        .where({ id: request.id })
        .update({
          status: 'cancelled',
          cancelled_at: new Date(),
        });

      logger.info(`Deletion cancelled for user ${request.user_id}`);
    } catch (error) {
      logger.error('Error cancelling deletion:', error);
      throw new Error('Failed to cancel deletion');
    }
  }

  /**
   * Process scheduled deletions (called by cron job)
   */
  async processScheduledDeletions(): Promise<void> {
    try {
      const scheduledDeletions = await db('deletion_requests')
        .where({ status: 'scheduled' })
        .andWhere('scheduled_for', '<=', new Date())
        .select('*');

      for (const deletion of scheduledDeletions) {
        try {
          await this.executeDeletion(deletion.id);
        } catch (error) {
          logger.error(`Error executing deletion ${deletion.id}:`, error);
        }
      }
    } catch (error) {
      logger.error('Error processing scheduled deletions:', error);
    }
  }

  /**
   * Execute account deletion
   */
  private async executeDeletion(requestId: string): Promise<void> {
    try {
      const request = await db('deletion_requests').where({ id: requestId }).first();
      if (!request) {
        throw new Error('Deletion request not found');
      }

      await db('deletion_requests')
        .where({ id: requestId })
        .update({ status: 'processing' });

      const userId = request.user_id;
      const deletedData: any = {};

      await db.transaction(async (trx) => {
        if (request.deletion_type === 'hard_delete') {
          // Permanently delete all data
          deletedData.photos = await trx('photos').where({ user_id: userId }).delete();
          deletedData.prompts = await trx('user_prompts').where({ user_id: userId }).delete();
          deletedData.swipes = await trx('swipes')
            .where('swiper_id', userId)
            .orWhere('swiped_id', userId)
            .delete();
          deletedData.matches = await trx('matches')
            .where('user1_id', userId)
            .orWhere('user2_id', userId)
            .delete();
          deletedData.messages = await trx('messages')
            .where('sender_id', userId)
            .orWhere('receiver_id', userId)
            .delete();
          deletedData.subscriptions = await trx('subscriptions').where({ user_id: userId }).delete();
          deletedData.profile = await trx('profiles').where({ user_id: userId }).delete();
          deletedData.preferences = await trx('preferences').where({ user_id: userId }).delete();
          deletedData.user = await trx('users').where({ id: userId }).delete();
        } else if (request.deletion_type === 'anonymize') {
          // Anonymize data but keep statistical records
          await trx('users').where({ id: userId }).update({
            email: `deleted_${userId}@deleted.com`,
            first_name: 'Deleted',
            last_name: 'User',
            phone_number: null,
            is_active: false,
          });
          await trx('profiles').where({ user_id: userId }).update({
            bio: null,
            job_title: null,
            company: null,
          });
        } else {
          // Soft delete - mark as deleted but retain data
          await trx('users').where({ id: userId }).update({
            is_active: false,
            deleted_at: new Date(),
          });
        }
      });

      await db('deletion_requests')
        .where({ id: requestId })
        .update({
          status: 'completed',
          completed_at: new Date(),
          deleted_data_summary: JSON.stringify(deletedData),
        });

      logger.info(`Deletion completed for user ${userId}`);
    } catch (error) {
      logger.error('Error executing deletion:', error);
      await db('deletion_requests')
        .where({ id: requestId })
        .update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error',
        });
      throw error;
    }
  }

  /**
   * Log data access for transparency
   */
  async logDataAccess(
    userId: string,
    accessType: string,
    accessedBy: string,
    purpose: string,
    dataAccessed?: any,
    ipAddress?: string
  ): Promise<void> {
    try {
      await db('data_access_logs').insert({
        user_id: userId,
        access_type: accessType,
        accessed_by: accessedBy,
        purpose,
        data_accessed: dataAccessed ? JSON.stringify(dataAccessed) : null,
        ip_address: ipAddress,
        accessed_at: new Date(),
      });
    } catch (error) {
      logger.error('Error logging data access:', error);
      // Don't throw - logging failures shouldn't break the main flow
    }
  }

  /**
   * Get user's data access history
   */
  async getDataAccessHistory(userId: string, limit: number = 100): Promise<any[]> {
    try {
      return await db('data_access_logs')
        .where({ user_id: userId })
        .orderBy('accessed_at', 'desc')
        .limit(limit)
        .select('*');
    } catch (error) {
      logger.error('Error getting data access history:', error);
      throw new Error('Failed to get data access history');
    }
  }
}
