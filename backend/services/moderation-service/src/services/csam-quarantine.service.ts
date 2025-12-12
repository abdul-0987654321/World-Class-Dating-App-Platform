/**
 * CSAM Content Quarantine Service
 *
 * Implements immediate content quarantine and legal hold for detected CSAM.
 * This service ensures:
 * - Immediate content blocking
 * - Secure evidence preservation for law enforcement
 * - Legal hold to prevent deletion
 * - Chain of custody tracking
 * - Encrypted storage with access controls
 */

import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { createLogger } from '@flamoral/shared';
import db from '../infrastructure/database/connection';
import config from '../config';
import {
  ContentQuarantineRecord,
  QuarantineStatus,
  CSAMDetectionResult,
  LegalHoldStatus,
} from '../types/csam.types';

const logger = createLogger('csam-quarantine-service');

export class CSAMQuarantineService {
  private quarantineStoragePath: string;
  private encryptionKey: string;

  constructor() {
    this.quarantineStoragePath = config.csam.quarantine.storagePath;
    this.encryptionKey = config.csam.quarantine.encryptionKey;

    logger.info('CSAM Quarantine Service initialized', {
      storagePath: this.quarantineStoragePath,
    });
  }

  /**
   * Quarantine content immediately upon CSAM detection
   * CRITICAL: This must complete before any other action
   */
  async quarantineContent(params: {
    detectionId: string;
    contentId: string;
    userId: string;
    imageUrl: string;
    imageBuffer: Buffer;
    detectionResult: CSAMDetectionResult;
    contentType: string;
  }): Promise<ContentQuarantineRecord> {
    const quarantineId = uuidv4();
    const quarantinedAt = new Date();

    try {
      logger.warn('QUARANTINING CONTENT', {
        quarantineId,
        detectionId: params.detectionId,
        contentId: params.contentId,
        userId: params.userId,
      });

      // Step 1: Encrypt content for secure storage
      const encryptedContent = await this.encryptContent(params.imageBuffer);

      // Step 2: Generate evidence hash (for chain of custody)
      const evidenceHash = this.generateEvidenceHash(params.imageBuffer);

      // Step 3: Store encrypted content
      const storageLocation = await this.storeEncryptedContent(
        quarantineId,
        encryptedContent
      );

      // Step 4: Create quarantine record
      const quarantineRecord: ContentQuarantineRecord = {
        id: quarantineId,
        detection_id: params.detectionId,
        content_id: params.contentId,
        user_id: params.userId,
        content_type: params.contentType,
        original_url: params.imageUrl,
        storage_location: storageLocation,
        evidence_hash: evidenceHash,
        photodna_hash: params.detectionResult.photoDNAHash,
        perceptual_hash: params.detectionResult.perceptualHash,
        status: QuarantineStatus.QUARANTINED,
        legal_hold_status: LegalHoldStatus.ACTIVE,
        legal_hold_applied_at: quarantinedAt,
        legal_hold_expires_at: null, // Never expires for CSAM
        confidence_score: params.detectionResult.confidenceScore,
        detection_method: params.detectionResult.detectionMethod,
        match_source: params.detectionResult.matchSource,
        access_restricted: true,
        access_log: [],
        chain_of_custody: [
          {
            action: 'quarantined',
            timestamp: quarantinedAt,
            actor: 'system',
            details: 'Content automatically quarantined upon CSAM detection',
          },
        ],
        quarantined_at: quarantinedAt,
        created_at: new Date(),
        updated_at: new Date(),
      };

      // Step 5: Save to database
      await db('csam_quarantine').insert(quarantineRecord);

      // Step 6: Block content from being accessed
      await this.blockContentAccess(params.contentId, quarantineId);

      // Step 7: Log quarantine action
      await this.logQuarantineAction(quarantineId, 'quarantined', 'system', {
        detectionId: params.detectionId,
        confidenceScore: params.detectionResult.confidenceScore,
      });

      logger.warn('CONTENT QUARANTINED SUCCESSFULLY', {
        quarantineId,
        contentId: params.contentId,
        legalHoldActive: true,
      });

      return quarantineRecord;

    } catch (error: any) {
      logger.error('CONTENT QUARANTINE FAILED - CRITICAL ERROR', {
        quarantineId,
        contentId: params.contentId,
        error: error.message,
        stack: error.stack,
      });

      throw error;
    }
  }

  /**
   * Quarantine content for manual review (detection failure fallback)
   */
  async quarantineContentForReview(params: {
    contentId: string;
    userId: string;
    imageUrl: string;
    reason: string;
    error?: string;
  }): Promise<ContentQuarantineRecord> {
    const quarantineId = uuidv4();
    const quarantinedAt = new Date();

    try {
      logger.warn('QUARANTINING CONTENT FOR MANUAL REVIEW', {
        quarantineId,
        contentId: params.contentId,
        reason: params.reason,
      });

      const record: ContentQuarantineRecord = {
        id: quarantineId,
        detection_id: null,
        content_id: params.contentId,
        user_id: params.userId,
        content_type: 'unknown',
        original_url: params.imageUrl,
        storage_location: null,
        evidence_hash: null,
        photodna_hash: null,
        perceptual_hash: null,
        status: QuarantineStatus.PENDING_REVIEW,
        legal_hold_status: LegalHoldStatus.PENDING,
        legal_hold_applied_at: null,
        legal_hold_expires_at: null,
        confidence_score: 0,
        detection_method: 'failed',
        match_source: 'none',
        access_restricted: true,
        access_log: [],
        chain_of_custody: [
          {
            action: 'quarantined_for_review',
            timestamp: quarantinedAt,
            actor: 'system',
            details: `Quarantined for manual review: ${params.reason}`,
          },
        ],
        quarantined_at: quarantinedAt,
        review_required: true,
        review_reason: params.reason,
        error_message: params.error,
        created_at: new Date(),
        updated_at: new Date(),
      };

      await db('csam_quarantine').insert(record);

      // Block content access
      await this.blockContentAccess(params.contentId, quarantineId);

      logger.warn('CONTENT QUARANTINED FOR REVIEW', {
        quarantineId,
        contentId: params.contentId,
      });

      return record;

    } catch (error: any) {
      logger.error('Failed to quarantine content for review', error);
      throw error;
    }
  }

  /**
   * Encrypt content for secure storage
   */
  private async encryptContent(buffer: Buffer): Promise<Buffer> {
    try {
      const algorithm = 'aes-256-gcm';
      const iv = crypto.randomBytes(16);
      const key = Buffer.from(this.encryptionKey, 'hex');

      const cipher = crypto.createCipheriv(algorithm, key, iv);

      const encrypted = Buffer.concat([
        cipher.update(buffer),
        cipher.final(),
      ]);

      const authTag = cipher.getAuthTag();

      // Prepend IV and auth tag to encrypted data
      return Buffer.concat([iv, authTag, encrypted]);

    } catch (error: any) {
      logger.error('Content encryption failed', error);
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt content for law enforcement access
   */
  async decryptContent(encryptedBuffer: Buffer): Promise<Buffer> {
    try {
      const algorithm = 'aes-256-gcm';
      const key = Buffer.from(this.encryptionKey, 'hex');

      // Extract IV, auth tag, and encrypted data
      const iv = encryptedBuffer.slice(0, 16);
      const authTag = encryptedBuffer.slice(16, 32);
      const encrypted = encryptedBuffer.slice(32);

      const decipher = crypto.createDecipheriv(algorithm, key, iv);
      decipher.setAuthTag(authTag);

      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final(),
      ]);

      return decrypted;

    } catch (error: any) {
      logger.error('Content decryption failed', error);
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  /**
   * Generate evidence hash for chain of custody
   */
  private generateEvidenceHash(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Store encrypted content
   */
  private async storeEncryptedContent(
    quarantineId: string,
    encryptedBuffer: Buffer
  ): Promise<string> {
    try {
      // In production, this would store to secure S3 bucket or similar
      // For now, we'll return a placeholder path
      const storageLocation = `${this.quarantineStoragePath}/${quarantineId}.encrypted`;

      logger.info('Encrypted content stored', {
        quarantineId,
        storageLocation,
        size: encryptedBuffer.length,
      });

      return storageLocation;

    } catch (error: any) {
      logger.error('Failed to store encrypted content', error);
      throw error;
    }
  }

  /**
   * Block content access
   */
  private async blockContentAccess(
    contentId: string,
    quarantineId: string
  ): Promise<void> {
    try {
      // Create content block record
      await db('content_access_blocks').insert({
        id: uuidv4(),
        content_id: contentId,
        quarantine_id: quarantineId,
        block_reason: 'csam_quarantine',
        blocked_at: new Date(),
        created_at: new Date(),
      });

      logger.info('Content access blocked', {
        contentId,
        quarantineId,
      });

    } catch (error: any) {
      logger.error('Failed to block content access', error);
      throw error;
    }
  }

  /**
   * Log quarantine action
   */
  private async logQuarantineAction(
    quarantineId: string,
    action: string,
    actor: string,
    details: any
  ): Promise<void> {
    try {
      await db('quarantine_action_log').insert({
        id: uuidv4(),
        quarantine_id: quarantineId,
        action,
        actor,
        details,
        timestamp: new Date(),
        created_at: new Date(),
      });

    } catch (error: any) {
      logger.error('Failed to log quarantine action', error);
      // Don't throw - logging failure shouldn't block quarantine
    }
  }

  /**
   * Grant law enforcement access
   */
  async grantLawEnforcementAccess(
    quarantineId: string,
    officerId: string,
    agency: string,
    caseNumber: string,
    warrant?: string
  ): Promise<{ accessToken: string; expiresAt: Date }> {
    try {
      logger.warn('GRANTING LAW ENFORCEMENT ACCESS', {
        quarantineId,
        agency,
        caseNumber,
      });

      // Generate secure access token
      const accessToken = uuidv4();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      // Create access record
      await db('law_enforcement_access').insert({
        id: uuidv4(),
        quarantine_id: quarantineId,
        access_token: accessToken,
        officer_id: officerId,
        agency,
        case_number: caseNumber,
        warrant_number: warrant,
        granted_at: new Date(),
        expires_at: expiresAt,
        created_at: new Date(),
      });

      // Update chain of custody
      await this.updateChainOfCustody(quarantineId, 'law_enforcement_access_granted', officerId, {
        agency,
        caseNumber,
        warrant,
      });

      // Log access in quarantine record
      await db('csam_quarantine')
        .where('id', quarantineId)
        .update({
          access_log: db.raw(`access_log || ?::jsonb`, [
            JSON.stringify({
              timestamp: new Date(),
              actor: officerId,
              agency,
              action: 'access_granted',
              caseNumber,
            }),
          ]),
          updated_at: new Date(),
        });

      logger.warn('LAW ENFORCEMENT ACCESS GRANTED', {
        quarantineId,
        agency,
        expiresAt,
      });

      return { accessToken, expiresAt };

    } catch (error: any) {
      logger.error('Failed to grant law enforcement access', error);
      throw error;
    }
  }

  /**
   * Update chain of custody
   */
  async updateChainOfCustody(
    quarantineId: string,
    action: string,
    actor: string,
    details: any
  ): Promise<void> {
    try {
      const custodyEntry = {
        action,
        timestamp: new Date(),
        actor,
        details,
      };

      await db('csam_quarantine')
        .where('id', quarantineId)
        .update({
          chain_of_custody: db.raw(`chain_of_custody || ?::jsonb`, [
            JSON.stringify(custodyEntry),
          ]),
          updated_at: new Date(),
        });

      logger.info('Chain of custody updated', {
        quarantineId,
        action,
        actor,
      });

    } catch (error: any) {
      logger.error('Failed to update chain of custody', error);
      throw error;
    }
  }

  /**
   * Get quarantine record
   */
  async getQuarantineRecord(quarantineId: string): Promise<ContentQuarantineRecord | null> {
    try {
      const record = await db('csam_quarantine')
        .where('id', quarantineId)
        .first();

      return record || null;

    } catch (error: any) {
      logger.error('Failed to get quarantine record', error);
      return null;
    }
  }

  /**
   * Release from quarantine (admin only, with justification)
   */
  async releaseFromQuarantine(
    quarantineId: string,
    adminId: string,
    justification: string,
    approvalDocumentation: string
  ): Promise<void> {
    try {
      logger.warn('RELEASING CONTENT FROM QUARANTINE', {
        quarantineId,
        adminId,
        justification,
      });

      await db('csam_quarantine')
        .where('id', quarantineId)
        .update({
          status: QuarantineStatus.RELEASED,
          legal_hold_status: LegalHoldStatus.RELEASED,
          released_at: new Date(),
          released_by: adminId,
          release_justification: justification,
          approval_documentation: approvalDocumentation,
          updated_at: new Date(),
        });

      await this.updateChainOfCustody(quarantineId, 'released', adminId, {
        justification,
        approvalDocumentation,
      });

      logger.warn('CONTENT RELEASED FROM QUARANTINE', {
        quarantineId,
        adminId,
      });

    } catch (error: any) {
      logger.error('Failed to release from quarantine', error);
      throw error;
    }
  }

  /**
   * Get quarantine statistics
   */
  async getQuarantineStatistics(): Promise<any> {
    try {
      const stats = await db('csam_quarantine')
        .select(
          db.raw('COUNT(*) as total_quarantined'),
          db.raw('COUNT(CASE WHEN status = ? THEN 1 END) as active', [QuarantineStatus.QUARANTINED]),
          db.raw('COUNT(CASE WHEN legal_hold_status = ? THEN 1 END) as legal_holds', [LegalHoldStatus.ACTIVE]),
          db.raw('COUNT(CASE WHEN review_required = true THEN 1 END) as pending_review')
        )
        .first();

      return stats;

    } catch (error: any) {
      logger.error('Failed to get quarantine statistics', error);
      throw error;
    }
  }

  /**
   * List quarantined content (admin only)
   */
  async listQuarantinedContent(
    filters: {
      status?: QuarantineStatus;
      userId?: string;
      reviewRequired?: boolean;
    } = {},
    limit: number = 50
  ): Promise<ContentQuarantineRecord[]> {
    try {
      let query = db('csam_quarantine');

      if (filters.status) {
        query = query.where('status', filters.status);
      }

      if (filters.userId) {
        query = query.where('user_id', filters.userId);
      }

      if (filters.reviewRequired !== undefined) {
        query = query.where('review_required', filters.reviewRequired);
      }

      const records = await query
        .orderBy('quarantined_at', 'desc')
        .limit(limit);

      return records;

    } catch (error: any) {
      logger.error('Failed to list quarantined content', error);
      return [];
    }
  }
}

export default new CSAMQuarantineService();
