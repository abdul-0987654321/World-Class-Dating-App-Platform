/**
 * NCMEC (National Center for Missing & Exploited Children) CyberTipline Reporting Service
 *
 * MANDATORY LEGAL COMPLIANCE
 * 18 U.S.C. § 2258A requires electronic service providers to report known CSAM to NCMEC.
 * Failure to report can result in:
 * - Civil penalties up to $150,000 per violation
 * - Criminal prosecution for intentional violations
 * - Loss of safe harbor protections under 18 U.S.C. § 2258
 *
 * This service implements:
 * - CyberTipline API integration
 * - Mandatory reporting workflow
 * - Report tracking and audit trail
 * - Automatic submission within 24 hours of detection
 * - Preservation of evidence for law enforcement
 */

import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

import config from '../config';
import db from '../infrastructure/database/connection';
import {
  NCMECReport,
  NCMECReportStatus,
  NCMECReportRequest,
  NCMECReportResponse,
  CSAMDetectionResult,
} from '../types/csam.types';
import { createLogger } from '../utils/logger';

const logger = createLogger('ncmec-reporting-service');

export class NCMECReportingService {
  private cybertiplineEndpoint: string;
  private cybertiplineApiKey: string;
  private reportingEnabled: boolean;
  private espId: string; // Electronic Service Provider ID
  private espName: string;
  private espContactEmail: string;
  private espContactPhone: string;

  constructor() {
    this.cybertiplineEndpoint = config.csam.ncmec.endpoint;
    this.cybertiplineApiKey = config.csam.ncmec.apiKey;
    this.reportingEnabled = config.csam.ncmec.reportingEnabled;
    this.espId = config.csam.ncmec.espId;
    this.espName = config.csam.ncmec.espName || 'Flamoral Dating Platform';
    this.espContactEmail = config.csam.ncmec.contactEmail;
    this.espContactPhone = config.csam.ncmec.contactPhone;

    logger.info('NCMEC Reporting Service initialized', {
      enabled: this.reportingEnabled,
      espId: this.espId,
      espName: this.espName,
    });
  }

  /**
   * Create and submit NCMEC CyberTipline report
   * MUST be called when CSAM is detected
   */
  async createReport(params: {
    detectionResult: CSAMDetectionResult;
    contentId: string;
    userId: string;
    imageUrl: string;
    contentType: string;
    quarantineId: string;
  }): Promise<NCMECReport> {
    const reportId = uuidv4();
    const reportCreatedAt = new Date();

    try {
      logger.warn('CREATING NCMEC REPORT', {
        reportId,
        detectionId: params.detectionResult.detectionId,
        contentId: params.contentId,
        userId: params.userId,
        confidenceScore: params.detectionResult.confidenceScore,
      });

      // Step 1: Gather user information
      const userInfo = await this.getUserInformation(params.userId);

      // Step 2: Gather incident details
      const incidentDetails = await this.prepareIncidentDetails(params);

      // Step 3: Create report record in database (before submission)
      const report = await this.createReportRecord({
        reportId,
        detectionResult: params.detectionResult,
        contentId: params.contentId,
        userId: params.userId,
        quarantineId: params.quarantineId,
        userInfo,
        incidentDetails,
        reportCreatedAt,
      });

      // Step 4: Submit to NCMEC CyberTipline
      if (this.reportingEnabled) {
        try {
          const submissionResult = await this.submitToNCMEC(report, incidentDetails, userInfo);

          // Update report with NCMEC response
          await this.updateReportAfterSubmission(
            reportId,
            submissionResult,
            NCMECReportStatus.SUBMITTED
          );

          logger.warn('NCMEC REPORT SUBMITTED SUCCESSFULLY', {
            reportId,
            ncmecReportId: submissionResult.ncmecReportId,
            ncmecReference: submissionResult.referenceNumber,
          });

          return {
            ...report,
            status: NCMECReportStatus.SUBMITTED,
            ncmec_report_id: submissionResult.ncmecReportId,
            ncmec_reference_number: submissionResult.referenceNumber,
            submitted_at: new Date(),
          };
        } catch (submissionError: any) {
          logger.error('NCMEC REPORT SUBMISSION FAILED', {
            reportId,
            error: submissionError.message,
            stack: submissionError.stack,
          });

          // Update report status to failed
          await this.updateReportAfterSubmission(
            reportId,
            null,
            NCMECReportStatus.FAILED,
            submissionError.message
          );

          // Schedule retry
          await this.scheduleReportRetry(reportId);

          throw submissionError;
        }
      } else {
        logger.warn('NCMEC REPORTING DISABLED - Report created but not submitted', {
          reportId,
        });

        // Update status to pending (will be submitted when enabled)
        await db('ncmec_reports').where('id', reportId).update({
          status: NCMECReportStatus.PENDING,
          updated_at: new Date(),
        });

        return report;
      }
    } catch (error: any) {
      logger.error('NCMEC REPORT CREATION FAILED', {
        reportId,
        error: error.message,
        stack: error.stack,
      });

      throw error;
    }
  }

  /**
   * Submit report to NCMEC CyberTipline API
   */
  private async submitToNCMEC(
    report: NCMECReport,
    incidentDetails: any,
    userInfo: any
  ): Promise<NCMECReportResponse> {
    try {
      const requestPayload: NCMECReportRequest = {
        reportingESP: {
          espId: this.espId,
          espName: this.espName,
          contactEmail: this.espContactEmail,
          contactPhone: this.espContactPhone,
        },
        incidentSummary: {
          incidentType: 'child_sexual_abuse_material',
          incidentDateTime: incidentDetails.detectedAt,
          reportedContent: {
            contentType: incidentDetails.contentType,
            contentId: incidentDetails.contentId,
            photoDNAHash: incidentDetails.photoDNAHash,
            contentUrl: incidentDetails.contentUrl, // Secure access URL for law enforcement
            confidenceScore: incidentDetails.confidenceScore,
          },
        },
        reporter: {
          userId: userInfo.userId,
          username: userInfo.username,
          email: userInfo.email,
          ipAddress: userInfo.lastKnownIp,
          registrationDate: userInfo.registeredAt,
          lastActiveDate: userInfo.lastActiveAt,
          accountStatus: userInfo.accountStatus,
        },
        additionalInformation: {
          detectionMethod: incidentDetails.detectionMethod,
          matchSource: incidentDetails.matchSource,
          quarantineId: report.quarantine_id,
          internalReportId: report.id,
        },
      };

      logger.info('Submitting report to NCMEC CyberTipline', {
        reportId: report.id,
        endpoint: this.cybertiplineEndpoint,
      });

      const response = await axios.post(`${this.cybertiplineEndpoint}/api/report`, requestPayload, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.cybertiplineApiKey}`,
          'X-ESP-ID': this.espId,
        },
        timeout: 30000, // 30 second timeout
      });

      return {
        success: true,
        ncmecReportId: response.data.reportId,
        referenceNumber: response.data.referenceNumber,
        submittedAt: new Date(response.data.submittedAt),
        status: response.data.status,
        message: response.data.message,
      };
    } catch (error: any) {
      logger.error('NCMEC API submission failed', {
        error: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });

      throw new Error(`NCMEC submission failed: ${error.message}`);
    }
  }

  /**
   * Get user information for report
   */
  private async getUserInformation(userId: string): Promise<any> {
    try {
      // This would typically call the user service
      // For now, we'll query a hypothetical user table
      const user = await db('users')
        .where('id', userId)
        .select(
          'id as userId',
          'username',
          'email',
          'last_known_ip as lastKnownIp',
          'created_at as registeredAt',
          'last_active_at as lastActiveAt',
          'status as accountStatus'
        )
        .first();

      if (!user) {
        logger.warn('User not found for NCMEC report', { userId });
        return {
          userId,
          username: 'unknown',
          email: 'unknown',
          lastKnownIp: 'unknown',
          registeredAt: new Date(),
          lastActiveAt: new Date(),
          accountStatus: 'unknown',
        };
      }

      return user;
    } catch (error: any) {
      logger.error('Failed to get user information', error);
      return {
        userId,
        username: 'error',
        email: 'error',
        lastKnownIp: 'error',
        registeredAt: new Date(),
        lastActiveAt: new Date(),
        accountStatus: 'error',
      };
    }
  }

  /**
   * Prepare incident details for report
   */
  private async prepareIncidentDetails(params: {
    detectionResult: CSAMDetectionResult;
    contentId: string;
    imageUrl: string;
    contentType: string;
  }): Promise<any> {
    // Generate secure access URL for law enforcement
    const secureAccessUrl = await this.generateSecureAccessUrl(
      params.contentId,
      params.detectionResult.detectionId
    );

    return {
      contentId: params.contentId,
      contentType: params.contentType,
      contentUrl: secureAccessUrl,
      photoDNAHash: params.detectionResult.photoDNAHash,
      perceptualHash: params.detectionResult.perceptualHash,
      confidenceScore: params.detectionResult.confidenceScore,
      detectionMethod: params.detectionResult.detectionMethod,
      matchSource: params.detectionResult.matchSource,
      detectedAt: params.detectionResult.detectedAt,
      ncmecMatch: params.detectionResult.ncmecMatch,
    };
  }

  /**
   * Generate secure access URL for law enforcement
   */
  private async generateSecureAccessUrl(contentId: string, detectionId: string): Promise<string> {
    // Generate a secure token for law enforcement access
    const token = uuidv4();

    // Store token in database
    await db('law_enforcement_access_tokens').insert({
      id: uuidv4(),
      token,
      content_id: contentId,
      detection_id: detectionId,
      expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
      created_at: new Date(),
    });

    // Return secure URL
    return `${config.csam.lawEnforcementPortalUrl}/evidence/${token}`;
  }

  /**
   * Create report record in database
   */
  private async createReportRecord(params: {
    reportId: string;
    detectionResult: CSAMDetectionResult;
    contentId: string;
    userId: string;
    quarantineId: string;
    userInfo: any;
    incidentDetails: any;
    reportCreatedAt: Date;
  }): Promise<NCMECReport> {
    const record = {
      id: params.reportId,
      detection_id: params.detectionResult.detectionId,
      content_id: params.contentId,
      user_id: params.userId,
      quarantine_id: params.quarantineId,
      status: NCMECReportStatus.PENDING,
      confidence_score: params.detectionResult.confidenceScore,
      photodna_hash: params.detectionResult.photoDNAHash,
      perceptual_hash: params.detectionResult.perceptualHash,
      match_source: params.detectionResult.matchSource,
      user_info: params.userInfo,
      incident_details: params.incidentDetails,
      esp_id: this.espId,
      esp_name: this.espName,
      report_created_at: params.reportCreatedAt,
      created_at: new Date(),
      updated_at: new Date(),
    };

    await db('ncmec_reports').insert(record);

    logger.info('NCMEC report record created', { reportId: params.reportId });

    return record as NCMECReport;
  }

  /**
   * Update report after submission
   */
  private async updateReportAfterSubmission(
    reportId: string,
    submissionResult: NCMECReportResponse | null,
    status: NCMECReportStatus,
    errorMessage?: string
  ): Promise<void> {
    const updates: any = {
      status,
      updated_at: new Date(),
    };

    if (submissionResult) {
      updates.ncmec_report_id = submissionResult.ncmecReportId;
      updates.ncmec_reference_number = submissionResult.referenceNumber;
      updates.submitted_at = submissionResult.submittedAt;
      updates.ncmec_response = submissionResult;
    }

    if (errorMessage) {
      updates.error_message = errorMessage;
      updates.last_error_at = new Date();
      updates.retry_count = db.raw('COALESCE(retry_count, 0) + 1');
    }

    await db('ncmec_reports').where('id', reportId).update(updates);
  }

  /**
   * Schedule report retry
   */
  private async scheduleReportRetry(reportId: string): Promise<void> {
    try {
      const report = await db('ncmec_reports').where('id', reportId).first();

      if (!report) return;

      const retryCount = report.retry_count || 0;
      const maxRetries = 5;

      if (retryCount >= maxRetries) {
        logger.error('NCMEC report max retries exceeded', {
          reportId,
          retryCount,
        });

        await db('ncmec_reports').where('id', reportId).update({
          status: NCMECReportStatus.FAILED,
          error_message: 'Max retries exceeded',
          updated_at: new Date(),
        });

        return;
      }

      // Calculate retry delay (exponential backoff)
      const retryDelayMinutes = Math.pow(2, retryCount) * 5; // 5, 10, 20, 40, 80 minutes
      const retryAt = new Date(Date.now() + retryDelayMinutes * 60 * 1000);

      await db('ncmec_reports').where('id', reportId).update({
        next_retry_at: retryAt,
        updated_at: new Date(),
      });

      logger.info('NCMEC report retry scheduled', {
        reportId,
        retryCount: retryCount + 1,
        retryAt: retryAt.toISOString(),
      });
    } catch (error: any) {
      logger.error('Failed to schedule report retry', error);
    }
  }

  /**
   * Retry failed reports (scheduled task)
   */
  async retryFailedReports(): Promise<void> {
    try {
      logger.info('Retrying failed NCMEC reports...');

      const failedReports = await db('ncmec_reports')
        .where('status', NCMECReportStatus.FAILED)
        .where('next_retry_at', '<=', new Date())
        .where('retry_count', '<', 5)
        .limit(10);

      for (const report of failedReports) {
        try {
          // Prepare data for resubmission
          const incidentDetails = report.incident_details;
          const userInfo = report.user_info;

          const submissionResult = await this.submitToNCMEC(report, incidentDetails, userInfo);

          await this.updateReportAfterSubmission(
            report.id,
            submissionResult,
            NCMECReportStatus.SUBMITTED
          );

          logger.info('NCMEC report retry successful', {
            reportId: report.id,
            retryCount: report.retry_count + 1,
          });
        } catch (error: any) {
          logger.error('NCMEC report retry failed', {
            reportId: report.id,
            error: error.message,
          });

          await this.updateReportAfterSubmission(
            report.id,
            null,
            NCMECReportStatus.FAILED,
            error.message
          );

          await this.scheduleReportRetry(report.id);
        }
      }

      logger.info('Failed NCMEC reports retry complete', {
        processed: failedReports.length,
      });
    } catch (error: any) {
      logger.error('Failed to retry NCMEC reports', error);
    }
  }

  /**
   * Get report by ID
   */
  async getReport(reportId: string): Promise<NCMECReport | null> {
    try {
      const report = await db('ncmec_reports').where('id', reportId).first();
      return report || null;
    } catch (error: any) {
      logger.error('Failed to get NCMEC report', error);
      return null;
    }
  }

  /**
   * Get reports by status
   */
  async getReportsByStatus(status: NCMECReportStatus, limit: number = 50): Promise<NCMECReport[]> {
    try {
      const reports = await db('ncmec_reports')
        .where('status', status)
        .orderBy('created_at', 'desc')
        .limit(limit);

      return reports;
    } catch (error: any) {
      logger.error('Failed to get NCMEC reports by status', error);
      return [];
    }
  }

  /**
   * Get report statistics
   */
  async getReportStatistics(timeRange: 'day' | 'week' | 'month' = 'day'): Promise<any> {
    try {
      const startDate = new Date();

      if (timeRange === 'week') {
        startDate.setDate(startDate.getDate() - 7);
      } else if (timeRange === 'month') {
        startDate.setMonth(startDate.getMonth() - 1);
      } else {
        startDate.setDate(startDate.getDate() - 1);
      }

      const stats = await db('ncmec_reports')
        .where('created_at', '>=', startDate)
        .select(
          db.raw('COUNT(*) as total_reports'),
          db.raw('COUNT(CASE WHEN status = ? THEN 1 END) as submitted', [
            NCMECReportStatus.SUBMITTED,
          ]),
          db.raw('COUNT(CASE WHEN status = ? THEN 1 END) as pending', [NCMECReportStatus.PENDING]),
          db.raw('COUNT(CASE WHEN status = ? THEN 1 END) as failed', [NCMECReportStatus.FAILED]),
          db.raw('AVG(confidence_score) as avg_confidence')
        )
        .first();

      return {
        timeRange,
        startDate,
        ...stats,
      };
    } catch (error: any) {
      logger.error('Failed to get report statistics', error);
      throw error;
    }
  }

  /**
   * Check if reporting is enabled
   */
  isEnabled(): boolean {
    return this.reportingEnabled;
  }

  /**
   * Validate NCMEC configuration
   */
  validateConfiguration(): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!this.espId) {
      errors.push('NCMEC ESP ID not configured');
    }

    if (!this.cybertiplineApiKey) {
      errors.push('NCMEC CyberTipline API key not configured');
    }

    if (!this.cybertiplineEndpoint) {
      errors.push('NCMEC CyberTipline endpoint not configured');
    }

    if (!this.espContactEmail) {
      errors.push('ESP contact email not configured');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

export default new NCMECReportingService();
