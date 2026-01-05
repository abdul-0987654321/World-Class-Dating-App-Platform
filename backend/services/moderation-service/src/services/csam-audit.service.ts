/**
 * CSAM Audit Logging Service
 *
 * Implements comprehensive audit trail for CSAM detection and handling.
 * This is critical for:
 * - Legal compliance and evidence preservation
 * - Forensic analysis
 * - Regulatory audits
 * - Internal investigations
 * - Proving due diligence
 *
 * All CSAM-related actions are logged with:
 * - Immutable records
 * - Cryptographic signatures
 * - Complete context
 * - Tamper detection
 */

import crypto from 'crypto';

import { v4 as uuidv4 } from 'uuid';

import db from '../infrastructure/database/connection';
import {
  CSAMDetectionResult,
  CSAMAuditLog,
  AuditEventType,
  AuditSeverity,
} from '../types/csam.types';
import { createLogger } from '../utils/logger';

const logger = createLogger('csam-audit-service');

export class CSAMAuditService {
  private signingKey: string;

  constructor() {
    this.signingKey = process.env.AUDIT_SIGNING_KEY || 'default-signing-key-change-in-production';

    logger.info('CSAM Audit Service initialized');
  }

  /**
   * Log CSAM detection event
   */
  async logDetectionEvent(
    detectionResult: CSAMDetectionResult,
    metadata: {
      imageUrl: string;
      contentType: string;
      imageSize: number;
    }
  ): Promise<void> {
    try {
      await this.createAuditLog({
        eventType: detectionResult.isCSAM
          ? AuditEventType.CSAM_DETECTED
          : AuditEventType.CSAM_SCAN_CLEAN,
        severity: detectionResult.isCSAM ? AuditSeverity.CRITICAL : AuditSeverity.INFO,
        detectionId: detectionResult.detectionId,
        contentId: detectionResult.contentId,
        userId: detectionResult.userId,
        actor: 'system',
        eventData: {
          detectionResult,
          metadata,
        },
        sensitiveData: true,
      });
    } catch (error: any) {
      logger.error('Failed to log detection event', error);
      // Don't throw - audit failure shouldn't block detection
    }
  }

  /**
   * Log CSAM incident (positive detection with all actions)
   */
  async logCSAMIncident(params: {
    detectionResult: CSAMDetectionResult;
    quarantineId: string;
    actionsPerformed: string[];
  }): Promise<void> {
    try {
      await this.createAuditLog({
        eventType: AuditEventType.CSAM_INCIDENT,
        severity: AuditSeverity.CRITICAL,
        detectionId: params.detectionResult.detectionId,
        contentId: params.detectionResult.contentId,
        userId: params.detectionResult.userId,
        actor: 'system',
        eventData: {
          detectionResult: params.detectionResult,
          quarantineId: params.quarantineId,
          actionsPerformed: params.actionsPerformed,
        },
        sensitiveData: true,
      });

      logger.warn('CSAM incident logged', {
        detectionId: params.detectionResult.detectionId,
        quarantineId: params.quarantineId,
      });
    } catch (error: any) {
      logger.error('Failed to log CSAM incident', error);
    }
  }

  /**
   * Log NCMEC report submission
   */
  async logNCMECReport(params: {
    reportId: string;
    detectionId: string;
    contentId: string;
    userId: string;
    ncmecReportId?: string;
    status: string;
  }): Promise<void> {
    try {
      await this.createAuditLog({
        eventType: AuditEventType.NCMEC_REPORT_SUBMITTED,
        severity: AuditSeverity.HIGH,
        detectionId: params.detectionId,
        contentId: params.contentId,
        userId: params.userId,
        actor: 'system',
        eventData: {
          reportId: params.reportId,
          ncmecReportId: params.ncmecReportId,
          status: params.status,
        },
        sensitiveData: true,
      });
    } catch (error: any) {
      logger.error('Failed to log NCMEC report', error);
    }
  }

  /**
   * Log content quarantine
   */
  async logContentQuarantine(params: {
    quarantineId: string;
    detectionId: string;
    contentId: string;
    userId: string;
    reason: string;
  }): Promise<void> {
    try {
      await this.createAuditLog({
        eventType: AuditEventType.CONTENT_QUARANTINED,
        severity: AuditSeverity.HIGH,
        detectionId: params.detectionId,
        contentId: params.contentId,
        userId: params.userId,
        actor: 'system',
        eventData: {
          quarantineId: params.quarantineId,
          reason: params.reason,
        },
        sensitiveData: true,
      });
    } catch (error: any) {
      logger.error('Failed to log content quarantine', error);
    }
  }

  /**
   * Log law enforcement access
   */
  async logLawEnforcementAccess(params: {
    quarantineId: string;
    officerId: string;
    agency: string;
    caseNumber: string;
    accessType: string;
  }): Promise<void> {
    try {
      await this.createAuditLog({
        eventType: AuditEventType.LAW_ENFORCEMENT_ACCESS,
        severity: AuditSeverity.HIGH,
        detectionId: null,
        contentId: null,
        userId: null,
        actor: params.officerId,
        eventData: {
          quarantineId: params.quarantineId,
          agency: params.agency,
          caseNumber: params.caseNumber,
          accessType: params.accessType,
        },
        sensitiveData: true,
      });
    } catch (error: any) {
      logger.error('Failed to log law enforcement access', error);
    }
  }

  /**
   * Log user account action (ban, suspension, etc.)
   */
  async logUserAccountAction(params: {
    userId: string;
    action: string;
    reason: string;
    detectionId?: string;
    performedBy: string;
  }): Promise<void> {
    try {
      await this.createAuditLog({
        eventType: AuditEventType.USER_ACCOUNT_ACTION,
        severity: AuditSeverity.HIGH,
        detectionId: params.detectionId || null,
        contentId: null,
        userId: params.userId,
        actor: params.performedBy,
        eventData: {
          action: params.action,
          reason: params.reason,
        },
        sensitiveData: false,
      });
    } catch (error: any) {
      logger.error('Failed to log user account action', error);
    }
  }

  /**
   * Log system error or failure
   */
  async logSystemError(params: {
    errorType: string;
    errorMessage: string;
    detectionId?: string;
    contentId?: string;
    userId?: string;
    stackTrace?: string;
  }): Promise<void> {
    try {
      await this.createAuditLog({
        eventType: AuditEventType.SYSTEM_ERROR,
        severity: AuditSeverity.ERROR,
        detectionId: params.detectionId || null,
        contentId: params.contentId || null,
        userId: params.userId || null,
        actor: 'system',
        eventData: {
          errorType: params.errorType,
          errorMessage: params.errorMessage,
          stackTrace: params.stackTrace,
        },
        sensitiveData: false,
      });
    } catch (error: any) {
      logger.error('Failed to log system error', error);
    }
  }

  /**
   * Log admin action
   */
  async logAdminAction(params: {
    action: string;
    adminId: string;
    targetUserId?: string;
    targetContentId?: string;
    quarantineId?: string;
    reason: string;
    details: any;
  }): Promise<void> {
    try {
      await this.createAuditLog({
        eventType: AuditEventType.ADMIN_ACTION,
        severity: AuditSeverity.MEDIUM,
        detectionId: null,
        contentId: params.targetContentId || null,
        userId: params.targetUserId || null,
        actor: params.adminId,
        eventData: {
          action: params.action,
          quarantineId: params.quarantineId,
          reason: params.reason,
          details: params.details,
        },
        sensitiveData: true,
      });
    } catch (error: any) {
      logger.error('Failed to log admin action', error);
    }
  }

  /**
   * Create audit log entry
   */
  private async createAuditLog(params: {
    eventType: AuditEventType;
    severity: AuditSeverity;
    detectionId: string | null;
    contentId: string | null;
    userId: string | null;
    actor: string;
    eventData: any;
    sensitiveData: boolean;
  }): Promise<void> {
    const auditId = uuidv4();
    const timestamp = new Date();

    try {
      // Generate cryptographic signature for tamper detection
      const signature = this.generateSignature({
        auditId,
        eventType: params.eventType,
        timestamp,
        actor: params.actor,
        eventData: params.eventData,
      });

      const auditLog: Partial<CSAMAuditLog> = {
        id: auditId,
        event_type: params.eventType,
        severity: params.severity,
        detection_id: params.detectionId,
        content_id: params.contentId,
        user_id: params.userId,
        actor: params.actor,
        event_data: params.eventData,
        sensitive_data: params.sensitiveData,
        signature,
        timestamp,
        created_at: timestamp,
      };

      await db('csam_audit_logs').insert(auditLog);

      logger.debug('Audit log created', {
        auditId,
        eventType: params.eventType,
        severity: params.severity,
      });
    } catch (error: any) {
      logger.error('Failed to create audit log', {
        eventType: params.eventType,
        error: error.message,
      });

      // CRITICAL: If audit logging fails, we should alert
      throw error;
    }
  }

  /**
   * Generate cryptographic signature for audit entry
   */
  private generateSignature(data: any): string {
    const dataString = JSON.stringify(data);
    return crypto.createHmac('sha256', this.signingKey).update(dataString).digest('hex');
  }

  /**
   * Verify audit log signature
   */
  async verifySignature(auditLog: CSAMAuditLog): Promise<boolean> {
    try {
      const data = {
        auditId: auditLog.id,
        eventType: auditLog.event_type,
        timestamp: auditLog.timestamp,
        actor: auditLog.actor,
        eventData: auditLog.event_data,
      };

      const expectedSignature = this.generateSignature(data);
      return expectedSignature === auditLog.signature;
    } catch (error: any) {
      logger.error('Signature verification failed', error);
      return false;
    }
  }

  /**
   * Get audit logs
   */
  async getAuditLogs(
    filters: {
      eventType?: AuditEventType;
      severity?: AuditSeverity;
      detectionId?: string;
      userId?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    } = {}
  ): Promise<CSAMAuditLog[]> {
    try {
      let query = db('csam_audit_logs');

      if (filters.eventType) {
        query = query.where('event_type', filters.eventType);
      }

      if (filters.severity) {
        query = query.where('severity', filters.severity);
      }

      if (filters.detectionId) {
        query = query.where('detection_id', filters.detectionId);
      }

      if (filters.userId) {
        query = query.where('user_id', filters.userId);
      }

      if (filters.startDate) {
        query = query.where('timestamp', '>=', filters.startDate);
      }

      if (filters.endDate) {
        query = query.where('timestamp', '<=', filters.endDate);
      }

      const logs = await query.orderBy('timestamp', 'desc').limit(filters.limit || 100);

      return logs;
    } catch (error: any) {
      logger.error('Failed to get audit logs', error);
      return [];
    }
  }

  /**
   * Get audit statistics
   */
  async getAuditStatistics(timeRange: 'day' | 'week' | 'month' = 'day'): Promise<any> {
    try {
      const startDate = new Date();

      if (timeRange === 'week') {
        startDate.setDate(startDate.getDate() - 7);
      } else if (timeRange === 'month') {
        startDate.setMonth(startDate.getMonth() - 1);
      } else {
        startDate.setDate(startDate.getDate() - 1);
      }

      const stats = await db('csam_audit_logs')
        .where('timestamp', '>=', startDate)
        .select(
          db.raw('COUNT(*) as total_events'),
          db.raw('COUNT(CASE WHEN event_type = ? THEN 1 END) as csam_detected', [
            AuditEventType.CSAM_DETECTED,
          ]),
          db.raw('COUNT(CASE WHEN event_type = ? THEN 1 END) as ncmec_reports', [
            AuditEventType.NCMEC_REPORT_SUBMITTED,
          ]),
          db.raw('COUNT(CASE WHEN event_type = ? THEN 1 END) as quarantines', [
            AuditEventType.CONTENT_QUARANTINED,
          ]),
          db.raw('COUNT(CASE WHEN severity = ? THEN 1 END) as critical_events', [
            AuditSeverity.CRITICAL,
          ]),
          db.raw('COUNT(CASE WHEN event_type = ? THEN 1 END) as law_enforcement_access', [
            AuditEventType.LAW_ENFORCEMENT_ACCESS,
          ])
        )
        .first();

      return {
        timeRange,
        startDate,
        ...stats,
      };
    } catch (error: any) {
      logger.error('Failed to get audit statistics', error);
      throw error;
    }
  }

  /**
   * Export audit logs for compliance
   */
  async exportAuditLogs(params: {
    startDate: Date;
    endDate: Date;
    eventTypes?: AuditEventType[];
  }): Promise<CSAMAuditLog[]> {
    try {
      let query = db('csam_audit_logs')
        .where('timestamp', '>=', params.startDate)
        .where('timestamp', '<=', params.endDate);

      if (params.eventTypes && params.eventTypes.length > 0) {
        query = query.whereIn('event_type', params.eventTypes);
      }

      const logs = await query.orderBy('timestamp', 'asc');

      logger.info('Audit logs exported', {
        startDate: params.startDate,
        endDate: params.endDate,
        count: logs.length,
      });

      return logs;
    } catch (error: any) {
      logger.error('Failed to export audit logs', error);
      throw error;
    }
  }

  /**
   * Verify audit log chain integrity
   */
  async verifyAuditChainIntegrity(
    startDate: Date,
    endDate: Date
  ): Promise<{
    valid: boolean;
    totalLogs: number;
    tamperedLogs: number;
    tamperedIds: string[];
  }> {
    try {
      const logs = await db('csam_audit_logs')
        .where('timestamp', '>=', startDate)
        .where('timestamp', '<=', endDate)
        .orderBy('timestamp', 'asc');

      let tamperedCount = 0;
      const tamperedIds: string[] = [];

      for (const log of logs) {
        const isValid = await this.verifySignature(log);
        if (!isValid) {
          tamperedCount++;
          tamperedIds.push(log.id);
        }
      }

      const result = {
        valid: tamperedCount === 0,
        totalLogs: logs.length,
        tamperedLogs: tamperedCount,
        tamperedIds,
      };

      if (tamperedCount > 0) {
        logger.error('AUDIT LOG TAMPERING DETECTED', result);
      }

      return result;
    } catch (error: any) {
      logger.error('Failed to verify audit chain integrity', error);
      throw error;
    }
  }
}

export default new CSAMAuditService();
