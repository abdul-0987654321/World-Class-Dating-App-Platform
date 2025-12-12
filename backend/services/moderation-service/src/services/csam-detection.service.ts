/**
 * CSAM (Child Sexual Abuse Material) Detection Service
 *
 * CRITICAL LEGAL COMPLIANCE IMPLEMENTATION
 * This service implements mandatory CSAM detection and reporting as required by:
 * - 18 U.S.C. § 2258A (NCMEC reporting requirement)
 * - EARN IT Act compliance
 * - International child protection laws
 *
 * FEATURES:
 * 1. Microsoft PhotoDNA hash matching
 * 2. NCMEC database integration
 * 3. Perceptual hashing for duplicate detection
 * 4. Immediate content blocking on positive match
 * 5. Automatic legal hold and quarantine
 * 6. Mandatory reporting workflow
 * 7. Comprehensive audit logging
 */

import axios from 'axios';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '@flamoral/shared';
import db from '../infrastructure/database/connection';
import config from '../config';
import ncmecReportingService from './ncmec-reporting.service';
import csamQuarantineService from './csam-quarantine.service';
import csamAuditService from './csam-audit.service';
import staffNotificationService from './staff-notification.service';
import perceptualHashService from './perceptual-hash.service';
import {
  CSAMDetectionResult,
  CSAMDetectionStatus,
  CSAMSeverityLevel,
  CSAMDetectionLog,
  PhotoDNAResponse,
  ContentQuarantineRecord,
} from '../types/csam.types';

const logger = createLogger('csam-detection-service');

export class CSAMDetectionService {
  private photoDNAEndpoint: string;
  private photoDNAApiKey: string;
  private ncmecHashDatabase: Set<string>;
  private detectionEnabled: boolean;

  constructor() {
    this.photoDNAEndpoint = config.csam.photoDNA.endpoint;
    this.photoDNAApiKey = config.csam.photoDNA.apiKey;
    this.ncmecHashDatabase = new Set();
    this.detectionEnabled = config.csam.detectionEnabled;

    // Initialize NCMEC hash database
    this.initializeNCMECHashDatabase();

    logger.info('CSAM Detection Service initialized', {
      enabled: this.detectionEnabled,
      photoDNAConfigured: !!this.photoDNAApiKey,
    });
  }

  /**
   * PRIMARY DETECTION METHOD
   * Performs comprehensive CSAM detection on image content
   *
   * CRITICAL: This must be called BEFORE any image is stored or displayed
   */
  async detectCSAM(
    imageUrl: string,
    imageBuffer: Buffer,
    contentId: string,
    userId: string,
    contentType: string = 'user_upload'
  ): Promise<CSAMDetectionResult> {
    const detectionStartTime = Date.now();
    const detectionId = uuidv4();

    try {
      logger.warn('CSAM DETECTION INITIATED', {
        detectionId,
        contentId,
        userId,
        contentType,
        imageSize: imageBuffer.length,
      });

      // Step 1: Generate PhotoDNA hash
      const photoDNAResult = await this.generatePhotoDNAHash(imageBuffer);

      // Step 2: Generate perceptual hash (pHash) for duplicate detection
      const perceptualHash = await perceptualHashService.generateHash(imageBuffer);

      // Step 3: Check against NCMEC database
      const ncmecMatch = await this.checkNCMECDatabase(photoDNAResult.hash);

      // Step 4: Check against our internal CSAM hash database
      const internalMatch = await this.checkInternalDatabase(photoDNAResult.hash, perceptualHash);

      // Step 5: Perform PhotoDNA cloud matching (if configured)
      const cloudMatch = await this.performPhotoDNACloudMatching(photoDNAResult.hash);

      // Determine detection result
      const isCSAM = ncmecMatch.matched || internalMatch.matched || cloudMatch.matched;
      const confidenceScore = Math.max(
        ncmecMatch.confidence,
        internalMatch.confidence,
        cloudMatch.confidence
      );

      // Determine severity
      const severity = this.determineSeverity(confidenceScore, ncmecMatch.matched);

      const detectionResult: CSAMDetectionResult = {
        detectionId,
        contentId,
        userId,
        status: isCSAM ? CSAMDetectionStatus.DETECTED : CSAMDetectionStatus.CLEAN,
        isCSAM,
        confidenceScore,
        severity,
        photoDNAHash: photoDNAResult.hash,
        perceptualHash,
        ncmecMatch: ncmecMatch.matched,
        ncmecHashId: ncmecMatch.hashId,
        internalMatch: internalMatch.matched,
        cloudMatch: cloudMatch.matched,
        matchSource: this.determineMatchSource(ncmecMatch.matched, internalMatch.matched, cloudMatch.matched),
        detectionMethod: 'photodna_perceptual_hybrid',
        detectedAt: new Date(),
        processingTimeMs: Date.now() - detectionStartTime,
      };

      // IMMEDIATE ACTION: If CSAM detected
      if (isCSAM) {
        await this.handleCSAMDetection(
          detectionResult,
          imageUrl,
          imageBuffer,
          contentId,
          userId,
          contentType
        );
      }

      // Log detection (both positive and negative for audit trail)
      await this.logDetection(detectionResult, imageUrl, contentType);

      // Log to audit service
      await csamAuditService.logDetectionEvent(detectionResult, {
        imageUrl,
        contentType,
        imageSize: imageBuffer.length,
      });

      logger.info('CSAM DETECTION COMPLETE', {
        detectionId,
        status: detectionResult.status,
        isCSAM,
        confidenceScore,
        processingTime: detectionResult.processingTimeMs,
      });

      return detectionResult;

    } catch (error: any) {
      logger.error('CSAM DETECTION FAILED - CRITICAL ERROR', {
        detectionId,
        contentId,
        userId,
        error: error.message,
        stack: error.stack,
      });

      // FAIL SECURE: On detection failure, quarantine content for manual review
      await this.handleDetectionFailure(contentId, userId, imageUrl, error);

      // Return failure result
      return {
        detectionId,
        contentId,
        userId,
        status: CSAMDetectionStatus.ERROR,
        isCSAM: false, // Unknown, requires manual review
        confidenceScore: 0,
        severity: CSAMSeverityLevel.UNKNOWN,
        photoDNAHash: null,
        perceptualHash: null,
        ncmecMatch: false,
        internalMatch: false,
        cloudMatch: false,
        matchSource: 'none',
        detectionMethod: 'failed',
        detectedAt: new Date(),
        processingTimeMs: Date.now() - detectionStartTime,
        error: error.message,
      };
    }
  }

  /**
   * Generate PhotoDNA hash from image buffer
   */
  private async generatePhotoDNAHash(imageBuffer: Buffer): Promise<PhotoDNAResponse> {
    try {
      if (!this.photoDNAApiKey || !this.photoDNAEndpoint) {
        logger.warn('PhotoDNA not configured, using fallback SHA-256 hash');
        // Fallback to SHA-256 if PhotoDNA not configured
        const hash = crypto.createHash('sha256').update(imageBuffer).digest('hex');
        return {
          hash,
          confidence: 0.5,
          method: 'sha256_fallback',
        };
      }

      // Call Microsoft PhotoDNA service
      const response = await axios.post(
        `${this.photoDNAEndpoint}/api/photodna/hash`,
        {
          image: imageBuffer.toString('base64'),
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Ocp-Apim-Subscription-Key': this.photoDNAApiKey,
          },
          timeout: 10000, // 10 second timeout
        }
      );

      return {
        hash: response.data.hash,
        confidence: response.data.confidence || 1.0,
        method: 'photodna',
        details: response.data,
      };

    } catch (error: any) {
      logger.error('PhotoDNA hash generation failed', error);

      // Fallback to SHA-256
      const hash = crypto.createHash('sha256').update(imageBuffer).digest('hex');
      return {
        hash,
        confidence: 0.5,
        method: 'sha256_fallback',
        error: error.message,
      };
    }
  }

  /**
   * Check hash against NCMEC database
   */
  private async checkNCMECDatabase(hash: string): Promise<{
    matched: boolean;
    confidence: number;
    hashId?: string;
  }> {
    try {
      // Check local cached NCMEC hashes
      if (this.ncmecHashDatabase.has(hash)) {
        logger.warn('NCMEC HASH MATCH DETECTED', { hash: hash.substring(0, 16) + '...' });
        return {
          matched: true,
          confidence: 1.0,
          hashId: hash,
        };
      }

      // Check database for known NCMEC hashes
      const result = await db('csam_known_hashes')
        .where('hash', hash)
        .where('source', 'ncmec')
        .first();

      if (result) {
        logger.warn('NCMEC DATABASE MATCH DETECTED', { hashId: result.id });
        return {
          matched: true,
          confidence: 1.0,
          hashId: result.id,
        };
      }

      return { matched: false, confidence: 0 };

    } catch (error: any) {
      logger.error('NCMEC database check failed', error);
      return { matched: false, confidence: 0 };
    }
  }

  /**
   * Check against internal CSAM hash database
   */
  private async checkInternalDatabase(
    photoDNAHash: string,
    perceptualHash: string
  ): Promise<{ matched: boolean; confidence: number }> {
    try {
      // Check PhotoDNA hash
      const photoDNAResult = await db('csam_known_hashes')
        .where('hash', photoDNAHash)
        .where('source', 'internal')
        .first();

      if (photoDNAResult) {
        logger.warn('INTERNAL PHOTODNA HASH MATCH', { hashId: photoDNAResult.id });
        return { matched: true, confidence: 0.95 };
      }

      // Check perceptual hash (with similarity threshold)
      const perceptualResults = await db('csam_known_hashes')
        .where('perceptual_hash', perceptualHash)
        .where('source', 'internal');

      if (perceptualResults.length > 0) {
        logger.warn('INTERNAL PERCEPTUAL HASH MATCH', {
          matches: perceptualResults.length
        });
        return { matched: true, confidence: 0.90 };
      }

      // Check similar perceptual hashes (Hamming distance)
      const similarHashes = await this.findSimilarPerceptualHashes(perceptualHash);
      if (similarHashes.length > 0) {
        logger.warn('SIMILAR PERCEPTUAL HASH DETECTED', {
          matches: similarHashes.length,
        });
        return { matched: true, confidence: 0.85 };
      }

      return { matched: false, confidence: 0 };

    } catch (error: any) {
      logger.error('Internal database check failed', error);
      return { matched: false, confidence: 0 };
    }
  }

  /**
   * Perform PhotoDNA cloud matching against Microsoft's CSAM database
   */
  private async performPhotoDNACloudMatching(hash: string): Promise<{
    matched: boolean;
    confidence: number;
  }> {
    try {
      if (!this.photoDNAApiKey || !this.photoDNAEndpoint) {
        return { matched: false, confidence: 0 };
      }

      // Call PhotoDNA cloud matching service
      const response = await axios.post(
        `${this.photoDNAEndpoint}/api/photodna/match`,
        { hash },
        {
          headers: {
            'Content-Type': 'application/json',
            'Ocp-Apim-Subscription-Key': this.photoDNAApiKey,
          },
          timeout: 15000, // 15 second timeout
        }
      );

      if (response.data.matched) {
        logger.warn('PHOTODNA CLOUD MATCH DETECTED', {
          confidence: response.data.confidence,
        });
      }

      return {
        matched: response.data.matched || false,
        confidence: response.data.confidence || 0,
      };

    } catch (error: any) {
      logger.error('PhotoDNA cloud matching failed', error);
      return { matched: false, confidence: 0 };
    }
  }

  /**
   * Find similar perceptual hashes using Hamming distance
   */
  private async findSimilarPerceptualHashes(
    perceptualHash: string,
    maxDistance: number = 5
  ): Promise<any[]> {
    try {
      // Get all known CSAM perceptual hashes
      const knownHashes = await db('csam_known_hashes')
        .select('perceptual_hash', 'id')
        .whereNotNull('perceptual_hash');

      // Calculate Hamming distance for each
      const similarHashes = knownHashes.filter((record) => {
        if (!record.perceptual_hash) return false;
        const distance = this.calculateHammingDistance(
          perceptualHash,
          record.perceptual_hash
        );
        return distance <= maxDistance;
      });

      return similarHashes;

    } catch (error: any) {
      logger.error('Similar hash search failed', error);
      return [];
    }
  }

  /**
   * Calculate Hamming distance between two hashes
   */
  private calculateHammingDistance(hash1: string, hash2: string): number {
    if (hash1.length !== hash2.length) return Infinity;

    let distance = 0;
    for (let i = 0; i < hash1.length; i++) {
      if (hash1[i] !== hash2[i]) distance++;
    }

    return distance;
  }

  /**
   * Determine severity level based on confidence and match source
   */
  private determineSeverity(
    confidenceScore: number,
    ncmecMatch: boolean
  ): CSAMSeverityLevel {
    if (ncmecMatch) {
      return CSAMSeverityLevel.CRITICAL; // NCMEC match = critical
    }

    if (confidenceScore >= 0.95) {
      return CSAMSeverityLevel.CRITICAL;
    } else if (confidenceScore >= 0.85) {
      return CSAMSeverityLevel.HIGH;
    } else if (confidenceScore >= 0.70) {
      return CSAMSeverityLevel.MEDIUM;
    } else if (confidenceScore >= 0.50) {
      return CSAMSeverityLevel.LOW;
    }

    return CSAMSeverityLevel.UNKNOWN;
  }

  /**
   * Determine match source
   */
  private determineMatchSource(
    ncmecMatch: boolean,
    internalMatch: boolean,
    cloudMatch: boolean
  ): string {
    const sources: string[] = [];
    if (ncmecMatch) sources.push('ncmec');
    if (internalMatch) sources.push('internal');
    if (cloudMatch) sources.push('photodna_cloud');
    return sources.length > 0 ? sources.join(',') : 'none';
  }

  /**
   * CRITICAL: Handle CSAM detection
   * This method performs all required actions when CSAM is detected
   */
  private async handleCSAMDetection(
    detectionResult: CSAMDetectionResult,
    imageUrl: string,
    imageBuffer: Buffer,
    contentId: string,
    userId: string,
    contentType: string
  ): Promise<void> {
    logger.error('CSAM DETECTED - INITIATING EMERGENCY PROTOCOLS', {
      detectionId: detectionResult.detectionId,
      contentId,
      userId,
      confidenceScore: detectionResult.confidenceScore,
      severity: detectionResult.severity,
    });

    try {
      // Step 1: IMMEDIATE CONTENT QUARANTINE (must happen first)
      const quarantineRecord = await csamQuarantineService.quarantineContent({
        detectionId: detectionResult.detectionId,
        contentId,
        userId,
        imageUrl,
        imageBuffer,
        detectionResult,
        contentType,
      });

      logger.warn('CONTENT QUARANTINED', {
        quarantineId: quarantineRecord.id,
        legalHold: true,
      });

      // Step 2: Add hash to internal database for future detection
      await this.addToInternalDatabase(detectionResult);

      // Step 3: MANDATORY NCMEC REPORTING
      if (detectionResult.confidenceScore >= config.csam.ncmecReportingThreshold) {
        await ncmecReportingService.createReport({
          detectionResult,
          contentId,
          userId,
          imageUrl,
          contentType,
          quarantineId: quarantineRecord.id,
        });

        logger.warn('NCMEC REPORT CREATED', {
          detectionId: detectionResult.detectionId,
        });
      }

      // Step 4: IMMEDIATE STAFF NOTIFICATION
      await staffNotificationService.notifyCSAMDetection({
        detectionResult,
        contentId,
        userId,
        quarantineId: quarantineRecord.id,
        severity: detectionResult.severity,
      });

      // Step 5: Block user's content immediately
      await this.blockUserContent(userId, detectionResult.detectionId);

      // Step 6: Flag user account for investigation
      await this.flagUserForInvestigation(userId, detectionResult);

      // Step 7: Comprehensive audit logging
      await csamAuditService.logCSAMIncident({
        detectionResult,
        quarantineId: quarantineRecord.id,
        actionsPerformed: [
          'content_quarantined',
          'legal_hold_applied',
          'ncmec_report_created',
          'staff_notified',
          'user_content_blocked',
          'user_flagged',
        ],
      });

      logger.error('CSAM DETECTION PROTOCOLS COMPLETED', {
        detectionId: detectionResult.detectionId,
        quarantineId: quarantineRecord.id,
      });

    } catch (error: any) {
      logger.error('CSAM HANDLING FAILED - CRITICAL ERROR', {
        detectionId: detectionResult.detectionId,
        error: error.message,
        stack: error.stack,
      });

      // Emergency notification to staff
      await staffNotificationService.notifyCSAMHandlingFailure({
        detectionId: detectionResult.detectionId,
        contentId,
        userId,
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * Add detected CSAM hash to internal database
   */
  private async addToInternalDatabase(
    detectionResult: CSAMDetectionResult
  ): Promise<void> {
    try {
      // Check if hash already exists
      const existing = await db('csam_known_hashes')
        .where('hash', detectionResult.photoDNAHash)
        .first();

      if (!existing) {
        await db('csam_known_hashes').insert({
          id: uuidv4(),
          hash: detectionResult.photoDNAHash,
          perceptual_hash: detectionResult.perceptualHash,
          source: 'internal',
          confidence: detectionResult.confidenceScore,
          detection_count: 1,
          first_detected_at: new Date(),
          last_detected_at: new Date(),
          created_at: new Date(),
          updated_at: new Date(),
        });

        logger.info('Hash added to internal CSAM database', {
          hash: detectionResult.photoDNAHash?.substring(0, 16) + '...',
        });
      } else {
        // Update detection count
        await db('csam_known_hashes')
          .where('id', existing.id)
          .update({
            detection_count: db.raw('detection_count + 1'),
            last_detected_at: new Date(),
            updated_at: new Date(),
          });

        logger.info('CSAM hash detection count updated', {
          hashId: existing.id,
          detectionCount: existing.detection_count + 1,
        });
      }

    } catch (error: any) {
      logger.error('Failed to add hash to internal database', error);
      // Don't throw - this is not critical for immediate safety
    }
  }

  /**
   * Block all content from user
   */
  private async blockUserContent(
    userId: string,
    detectionId: string
  ): Promise<void> {
    try {
      await db('user_content_blocks').insert({
        id: uuidv4(),
        user_id: userId,
        detection_id: detectionId,
        block_reason: 'csam_detection',
        blocked_at: new Date(),
        created_at: new Date(),
      });

      logger.warn('USER CONTENT BLOCKED', { userId, detectionId });

    } catch (error: any) {
      logger.error('Failed to block user content', error);
      throw error; // This is critical
    }
  }

  /**
   * Flag user for investigation
   */
  private async flagUserForInvestigation(
    userId: string,
    detectionResult: CSAMDetectionResult
  ): Promise<void> {
    try {
      await db('user_moderation_records')
        .where('user_id', userId)
        .update({
          status: 'csam_investigation',
          csam_flag: true,
          csam_detection_id: detectionResult.detectionId,
          csam_flagged_at: new Date(),
          permanently_banned: true,
          banned_at: new Date(),
          banned_reason: 'CSAM detection - automatic permanent ban',
          updated_at: new Date(),
        });

      logger.warn('USER FLAGGED FOR CSAM INVESTIGATION', {
        userId,
        detectionId: detectionResult.detectionId,
      });

    } catch (error: any) {
      logger.error('Failed to flag user for investigation', error);
      throw error; // This is critical
    }
  }

  /**
   * Handle detection failure (fail secure)
   */
  private async handleDetectionFailure(
    contentId: string,
    userId: string,
    imageUrl: string,
    error: Error
  ): Promise<void> {
    try {
      // Quarantine content for manual review
      await csamQuarantineService.quarantineContentForReview({
        contentId,
        userId,
        imageUrl,
        reason: 'detection_failure',
        error: error.message,
      });

      // Notify staff
      await staffNotificationService.notifyDetectionFailure({
        contentId,
        userId,
        imageUrl,
        error: error.message,
      });

      logger.warn('CONTENT QUARANTINED DUE TO DETECTION FAILURE', {
        contentId,
        userId,
      });

    } catch (quarantineError: any) {
      logger.error('CRITICAL: Failed to quarantine content after detection failure', {
        contentId,
        userId,
        originalError: error.message,
        quarantineError: quarantineError.message,
      });
    }
  }

  /**
   * Log detection to database
   */
  private async logDetection(
    detectionResult: CSAMDetectionResult,
    imageUrl: string,
    contentType: string
  ): Promise<void> {
    try {
      const log: Partial<CSAMDetectionLog> = {
        id: detectionResult.detectionId,
        content_id: detectionResult.contentId,
        user_id: detectionResult.userId,
        status: detectionResult.status,
        is_csam: detectionResult.isCSAM,
        confidence_score: detectionResult.confidenceScore,
        severity: detectionResult.severity,
        photodna_hash: detectionResult.photoDNAHash,
        perceptual_hash: detectionResult.perceptualHash,
        ncmec_match: detectionResult.ncmecMatch,
        internal_match: detectionResult.internalMatch,
        cloud_match: detectionResult.cloudMatch,
        match_source: detectionResult.matchSource,
        detection_method: detectionResult.detectionMethod,
        content_url: imageUrl,
        content_type: contentType,
        processing_time_ms: detectionResult.processingTimeMs,
        detected_at: detectionResult.detectedAt,
        created_at: new Date(),
      };

      await db('csam_detection_logs').insert(log);

    } catch (error: any) {
      logger.error('Failed to log CSAM detection', error);
      // Don't throw - logging failure shouldn't block detection
    }
  }

  /**
   * Initialize NCMEC hash database (load from external source)
   */
  private async initializeNCMECHashDatabase(): Promise<void> {
    try {
      logger.info('Loading NCMEC hash database...');

      // Load hashes from database
      const hashes = await db('csam_known_hashes')
        .where('source', 'ncmec')
        .select('hash');

      hashes.forEach((record) => {
        if (record.hash) {
          this.ncmecHashDatabase.add(record.hash);
        }
      });

      logger.info(`NCMEC hash database loaded: ${this.ncmecHashDatabase.size} hashes`);

    } catch (error: any) {
      logger.error('Failed to initialize NCMEC hash database', error);
    }
  }

  /**
   * Refresh NCMEC hash database (scheduled task)
   */
  async refreshNCMECDatabase(): Promise<void> {
    try {
      logger.info('Refreshing NCMEC hash database...');

      // Clear current cache
      this.ncmecHashDatabase.clear();

      // Reload from database
      await this.initializeNCMECHashDatabase();

      logger.info('NCMEC hash database refreshed successfully');

    } catch (error: any) {
      logger.error('Failed to refresh NCMEC hash database', error);
    }
  }

  /**
   * Check if CSAM detection is enabled
   */
  isEnabled(): boolean {
    return this.detectionEnabled;
  }

  /**
   * Get detection statistics
   */
  async getDetectionStatistics(timeRange: 'day' | 'week' | 'month' = 'day'): Promise<any> {
    try {
      const startDate = new Date();

      if (timeRange === 'week') {
        startDate.setDate(startDate.getDate() - 7);
      } else if (timeRange === 'month') {
        startDate.setMonth(startDate.getMonth() - 1);
      } else {
        startDate.setDate(startDate.getDate() - 1);
      }

      const stats = await db('csam_detection_logs')
        .where('detected_at', '>=', startDate)
        .select(
          db.raw('COUNT(*) as total_detections'),
          db.raw('COUNT(CASE WHEN is_csam = true THEN 1 END) as positive_detections'),
          db.raw('COUNT(CASE WHEN status = ? THEN 1 END, ?)', [CSAMDetectionStatus.ERROR, 'errors']),
          db.raw('AVG(confidence_score) as avg_confidence'),
          db.raw('AVG(processing_time_ms) as avg_processing_time')
        )
        .first();

      return {
        timeRange,
        startDate,
        ...stats,
      };

    } catch (error: any) {
      logger.error('Failed to get detection statistics', error);
      throw error;
    }
  }
}

export default new CSAMDetectionService();
