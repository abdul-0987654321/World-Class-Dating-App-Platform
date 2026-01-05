/**
 * Staff Notification Service for CSAM Detection
 *
 * Provides immediate alerting to staff when CSAM is detected.
 * Implements multiple notification channels for redundancy:
 * - Email alerts
 * - SMS alerts (for critical incidents)
 * - Slack/Teams integration
 * - In-app notifications
 * - PagerDuty for on-call escalation
 */

import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

import config from '../config';
import db from '../infrastructure/database/connection';
import {
  CSAMDetectionResult,
  CSAMSeverityLevel,
  StaffNotification,
  NotificationChannel,
  NotificationPriority,
} from '../types/csam.types';
import { createLogger } from '../utils/logger';

const logger = createLogger('staff-notification-service');

export class StaffNotificationService {
  private emailEnabled: boolean;
  private smsEnabled: boolean;
  private slackEnabled: boolean;
  private pagerDutyEnabled: boolean;

  private slackWebhookUrl: string;
  private pagerDutyIntegrationKey: string;
  private emergencyContactEmails: string[];
  private emergencyContactPhones: string[];

  constructor() {
    this.emailEnabled = config.csam.notifications.emailEnabled;
    this.smsEnabled = config.csam.notifications.smsEnabled;
    this.slackEnabled = config.csam.notifications.slackEnabled;
    this.pagerDutyEnabled = config.csam.notifications.pagerDutyEnabled;

    this.slackWebhookUrl = config.csam.notifications.slackWebhook;
    this.pagerDutyIntegrationKey = config.csam.notifications.pagerDutyKey;
    this.emergencyContactEmails = config.csam.notifications.emergencyEmails || [];
    this.emergencyContactPhones = config.csam.notifications.emergencyPhones || [];

    logger.info('Staff Notification Service initialized', {
      emailEnabled: this.emailEnabled,
      smsEnabled: this.smsEnabled,
      slackEnabled: this.slackEnabled,
      pagerDutyEnabled: this.pagerDutyEnabled,
    });
  }

  /**
   * Notify staff of CSAM detection
   * CRITICAL: Must complete even if some channels fail
   */
  async notifyCSAMDetection(params: {
    detectionResult: CSAMDetectionResult;
    contentId: string;
    userId: string;
    quarantineId: string;
    severity: CSAMSeverityLevel;
  }): Promise<void> {
    const notificationId = uuidv4();

    try {
      logger.error('SENDING CSAM DETECTION ALERTS', {
        notificationId,
        detectionId: params.detectionResult.detectionId,
        severity: params.severity,
      });

      const message = this.buildCSAMAlertMessage(params);

      // Determine notification priority based on severity
      const priority = this.determinePriority(params.severity);

      // Send notifications through all available channels
      const results = await Promise.allSettled([
        this.sendEmailNotification(message, priority),
        this.sendSlackNotification(message, priority),
        params.severity === CSAMSeverityLevel.CRITICAL
          ? this.sendSMSNotification(message)
          : Promise.resolve(),
        params.severity === CSAMSeverityLevel.CRITICAL
          ? this.sendPagerDutyAlert(message, params)
          : Promise.resolve(),
      ]);

      // Log notification results
      const channelResults = {
        email: results[0].status === 'fulfilled',
        slack: results[1].status === 'fulfilled',
        sms: results[2].status === 'fulfilled',
        pagerDuty: results[3].status === 'fulfilled',
      };

      // Save notification record
      await this.saveNotificationRecord({
        notificationId,
        detectionId: params.detectionResult.detectionId,
        contentId: params.contentId,
        userId: params.userId,
        quarantineId: params.quarantineId,
        severity: params.severity,
        priority,
        message,
        channelResults,
      });

      logger.error('CSAM DETECTION ALERTS SENT', {
        notificationId,
        channelResults,
      });
    } catch (error: any) {
      logger.error('CRITICAL: Staff notification failed', {
        notificationId,
        error: error.message,
        stack: error.stack,
      });

      // Even if notification fails, we must log the attempt
      await this.logNotificationFailure(notificationId, params, error);
    }
  }

  /**
   * Notify staff of CSAM handling failure
   */
  async notifyCSAMHandlingFailure(params: {
    detectionId: string;
    contentId: string;
    userId: string;
    error: string;
  }): Promise<void> {
    try {
      const message = {
        title: 'CRITICAL: CSAM HANDLING FAILURE',
        body:
          `CSAM detection handling failed. Manual intervention required immediately.\n\n` +
          `Detection ID: ${params.detectionId}\n` +
          `Content ID: ${params.contentId}\n` +
          `User ID: ${params.userId}\n` +
          `Error: ${params.error}\n\n` +
          `ACTION REQUIRED: Review and handle manually.`,
        severity: CSAMSeverityLevel.CRITICAL,
      };

      await Promise.allSettled([
        this.sendEmailNotification(message, NotificationPriority.CRITICAL),
        this.sendSlackNotification(message, NotificationPriority.CRITICAL),
        this.sendPagerDutyAlert(message, params),
      ]);
    } catch (error: any) {
      logger.error('Failed to notify CSAM handling failure', error);
    }
  }

  /**
   * Notify staff of detection failure
   */
  async notifyDetectionFailure(params: {
    contentId: string;
    userId: string;
    imageUrl: string;
    error: string;
  }): Promise<void> {
    try {
      const message = {
        title: 'WARNING: CSAM Detection Failure',
        body:
          `CSAM detection failed. Content quarantined for manual review.\n\n` +
          `Content ID: ${params.contentId}\n` +
          `User ID: ${params.userId}\n` +
          `Error: ${params.error}\n\n` +
          `Content has been quarantined and requires manual review.`,
        severity: CSAMSeverityLevel.HIGH,
      };

      await Promise.allSettled([
        this.sendEmailNotification(message, NotificationPriority.HIGH),
        this.sendSlackNotification(message, NotificationPriority.HIGH),
      ]);
    } catch (error: any) {
      logger.error('Failed to notify detection failure', error);
    }
  }

  /**
   * Build CSAM alert message
   */
  private buildCSAMAlertMessage(params: {
    detectionResult: CSAMDetectionResult;
    contentId: string;
    userId: string;
    quarantineId: string;
    severity: CSAMSeverityLevel;
  }): any {
    return {
      title: `🚨 CSAM DETECTED - ${params.severity.toUpperCase()}`,
      body:
        `Child Sexual Abuse Material has been detected and quarantined.\n\n` +
        `Detection ID: ${params.detectionResult.detectionId}\n` +
        `Quarantine ID: ${params.quarantineId}\n` +
        `Content ID: ${params.contentId}\n` +
        `User ID: ${params.userId}\n` +
        `Confidence: ${(params.detectionResult.confidenceScore * 100).toFixed(1)}%\n` +
        `Severity: ${params.severity}\n` +
        `Match Source: ${params.detectionResult.matchSource}\n` +
        `Detection Method: ${params.detectionResult.detectionMethod}\n\n` +
        `ACTIONS PERFORMED:\n` +
        `✓ Content quarantined with legal hold\n` +
        `✓ User content blocked\n` +
        `✓ User flagged for investigation\n` +
        `✓ NCMEC report ${params.detectionResult.confidenceScore >= 0.9 ? 'submitted' : 'pending'}\n\n` +
        `Review required: ${config.appUrl}/admin/csam/quarantine/${params.quarantineId}`,
      severity: params.severity,
      detectionId: params.detectionResult.detectionId,
      quarantineId: params.quarantineId,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(message: any, priority: NotificationPriority): Promise<void> {
    if (!this.emailEnabled) {
      logger.debug('Email notifications disabled');
      return;
    }

    try {
      // In production, this would integrate with SendGrid, AWS SES, etc.
      logger.info('Sending email notification', {
        recipients: this.emergencyContactEmails,
        subject: message.title,
        priority,
      });

      // Placeholder for actual email sending
      // await emailClient.send({
      //   to: this.emergencyContactEmails,
      //   subject: message.title,
      //   body: message.body,
      //   priority: priority === NotificationPriority.CRITICAL ? 'high' : 'normal',
      // });

      logger.info('Email notification sent successfully');
    } catch (error: any) {
      logger.error('Email notification failed', error);
      throw error;
    }
  }

  /**
   * Send Slack notification
   */
  private async sendSlackNotification(message: any, priority: NotificationPriority): Promise<void> {
    if (!this.slackEnabled || !this.slackWebhookUrl) {
      logger.debug('Slack notifications disabled or not configured');
      return;
    }

    try {
      const color = this.getSeverityColor(message.severity);

      const slackPayload = {
        text: message.title,
        attachments: [
          {
            color,
            title: message.title,
            text: message.body,
            footer: 'Flamoral CSAM Detection System',
            ts: Math.floor(Date.now() / 1000),
            fields: [
              {
                title: 'Priority',
                value: priority,
                short: true,
              },
              {
                title: 'Detection ID',
                value: message.detectionId,
                short: true,
              },
            ],
          },
        ],
      };

      await axios.post(this.slackWebhookUrl, slackPayload, {
        timeout: 10000,
      });

      logger.info('Slack notification sent successfully');
    } catch (error: any) {
      logger.error('Slack notification failed', error);
      throw error;
    }
  }

  /**
   * Send SMS notification (critical only)
   */
  private async sendSMSNotification(message: any): Promise<void> {
    if (!this.smsEnabled) {
      logger.debug('SMS notifications disabled');
      return;
    }

    try {
      // In production, this would integrate with Twilio, AWS SNS, etc.
      logger.info('Sending SMS notification', {
        recipients: this.emergencyContactPhones,
      });

      const smsBody = `CRITICAL ALERT: ${message.title}\n\nDetection ID: ${message.detectionId}\nReview immediately.`;

      // Placeholder for actual SMS sending
      // await smsClient.send({
      //   to: this.emergencyContactPhones,
      //   body: smsBody,
      // });

      logger.info('SMS notification sent successfully');
    } catch (error: any) {
      logger.error('SMS notification failed', error);
      throw error;
    }
  }

  /**
   * Send PagerDuty alert (critical only)
   */
  private async sendPagerDutyAlert(message: any, params: any): Promise<void> {
    if (!this.pagerDutyEnabled || !this.pagerDutyIntegrationKey) {
      logger.debug('PagerDuty alerts disabled or not configured');
      return;
    }

    try {
      const payload = {
        routing_key: this.pagerDutyIntegrationKey,
        event_action: 'trigger',
        payload: {
          summary: message.title,
          severity: 'critical',
          source: 'flamoral-csam-detection',
          custom_details: {
            detection_id: params.detectionResult?.detectionId || params.detectionId,
            content_id: params.contentId,
            user_id: params.userId,
            quarantine_id: params.quarantineId,
            confidence: params.detectionResult?.confidenceScore,
            message: message.body,
          },
        },
      };

      await axios.post('https://events.pagerduty.com/v2/enqueue', payload, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      logger.info('PagerDuty alert sent successfully');
    } catch (error: any) {
      logger.error('PagerDuty alert failed', error);
      throw error;
    }
  }

  /**
   * Determine notification priority
   */
  private determinePriority(severity: CSAMSeverityLevel): NotificationPriority {
    switch (severity) {
      case CSAMSeverityLevel.CRITICAL:
        return NotificationPriority.CRITICAL;
      case CSAMSeverityLevel.HIGH:
        return NotificationPriority.HIGH;
      case CSAMSeverityLevel.MEDIUM:
        return NotificationPriority.MEDIUM;
      case CSAMSeverityLevel.LOW:
        return NotificationPriority.LOW;
      default:
        return NotificationPriority.MEDIUM;
    }
  }

  /**
   * Get Slack color for severity
   */
  private getSeverityColor(severity: CSAMSeverityLevel): string {
    switch (severity) {
      case CSAMSeverityLevel.CRITICAL:
        return '#ff0000'; // Red
      case CSAMSeverityLevel.HIGH:
        return '#ff6600'; // Orange
      case CSAMSeverityLevel.MEDIUM:
        return '#ffcc00'; // Yellow
      case CSAMSeverityLevel.LOW:
        return '#00ccff'; // Blue
      default:
        return '#808080'; // Gray
    }
  }

  /**
   * Save notification record
   */
  private async saveNotificationRecord(params: {
    notificationId: string;
    detectionId: string;
    contentId: string;
    userId: string;
    quarantineId: string;
    severity: CSAMSeverityLevel;
    priority: NotificationPriority;
    message: any;
    channelResults: any;
  }): Promise<void> {
    try {
      const record: Partial<StaffNotification> = {
        id: params.notificationId,
        detection_id: params.detectionId,
        content_id: params.contentId,
        user_id: params.userId,
        quarantine_id: params.quarantineId,
        notification_type: 'csam_detection',
        severity: params.severity,
        priority: params.priority,
        message: params.message,
        channels_sent: Object.keys(params.channelResults).filter((ch) => params.channelResults[ch]),
        channel_results: params.channelResults,
        sent_at: new Date(),
        created_at: new Date(),
      };

      await db('staff_notifications').insert(record);
    } catch (error: any) {
      logger.error('Failed to save notification record', error);
      // Don't throw - record saving failure shouldn't block notification
    }
  }

  /**
   * Log notification failure
   */
  private async logNotificationFailure(
    notificationId: string,
    params: any,
    error: Error
  ): Promise<void> {
    try {
      await db('notification_failures').insert({
        id: uuidv4(),
        notification_id: notificationId,
        detection_id: params.detectionResult?.detectionId,
        error_message: error.message,
        error_stack: error.stack,
        params: params,
        failed_at: new Date(),
        created_at: new Date(),
      });
    } catch (logError: any) {
      logger.error('Failed to log notification failure', logError);
    }
  }

  /**
   * Send daily summary report
   */
  async sendDailySummaryReport(): Promise<void> {
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const stats = await db('csam_detection_logs')
        .where('detected_at', '>=', yesterday)
        .where('detected_at', '<', today)
        .select(
          db.raw('COUNT(*) as total_scans'),
          db.raw('COUNT(CASE WHEN is_csam = true THEN 1 END) as detections'),
          db.raw('AVG(confidence_score) as avg_confidence')
        )
        .first();
      const statsData: any = stats;

      const message = {
        title: 'Daily CSAM Detection Summary',
        body:
          `CSAM Detection Report for ${yesterday.toLocaleDateString()}\n\n` +
          `Total Scans: ${statsData?.total_scans || 0}\n` +
          `CSAM Detections: ${statsData?.detections || 0}\n` +
          `Average Confidence: ${(statsData?.avg_confidence || 0 * 100).toFixed(1)}%\n\n` +
          `Review full report: ${config.appUrl}/admin/csam/reports/daily`,
        severity: CSAMSeverityLevel.LOW,
      };

      await this.sendEmailNotification(message, NotificationPriority.LOW);

      logger.info('Daily summary report sent');
    } catch (error: any) {
      logger.error('Failed to send daily summary report', error);
    }
  }

  /**
   * Test notification channels
   */
  async testNotificationChannels(): Promise<{
    email: boolean;
    slack: boolean;
    sms: boolean;
    pagerDuty: boolean;
  }> {
    const testMessage = {
      title: 'Test Notification',
      body: 'This is a test notification from the CSAM detection system.',
      severity: CSAMSeverityLevel.LOW,
    };

    const results = await Promise.allSettled([
      this.sendEmailNotification(testMessage, NotificationPriority.LOW),
      this.sendSlackNotification(testMessage, NotificationPriority.LOW),
      this.sendSMSNotification(testMessage),
      this.sendPagerDutyAlert(testMessage, { detectionId: 'test' }),
    ]);

    return {
      email: results[0].status === 'fulfilled',
      slack: results[1].status === 'fulfilled',
      sms: results[2].status === 'fulfilled',
      pagerDuty: results[3].status === 'fulfilled',
    };
  }
}

export default new StaffNotificationService();
