/**
 * SOS Escalation Worker
 * Background job to process:
 * - Missed safety check-ins
 * - Retry failed notifications
 * - Escalate long-running active alerts
 */

import { sosService } from '../domain/services/sos.service';
import { db } from '../infrastructure/database';
import logger from '../utils/logger';

// Configuration
const WORKER_INTERVAL_MS = 60 * 1000; // Run every minute
const MAX_RETRY_ATTEMPTS = 3;
const STALE_ALERT_THRESHOLD_MINUTES = 60; // Alerts older than this get logged for review

export class SOSEscalationWorker {
  private isRunning: boolean = false;
  private intervalId: NodeJS.Timeout | null = null;

  /**
   * Start the worker
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('SOS Escalation Worker is already running');
      return;
    }

    this.isRunning = true;
    logger.info('SOS Escalation Worker started');

    // Run immediately on start
    this.run();

    // Then run on interval
    this.intervalId = setInterval(() => {
      this.run();
    }, WORKER_INTERVAL_MS);
  }

  /**
   * Stop the worker
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    logger.info('SOS Escalation Worker stopped');
  }

  /**
   * Main worker run function
   */
  private async run(): Promise<void> {
    try {
      // Process missed check-ins
      await this.processMissedCheckins();

      // Retry failed notifications
      await this.retryFailedNotifications();

      // Check for stale alerts
      await this.checkStaleAlerts();

      // Update notification delivery statuses
      await this.updateDeliveryStatuses();
    } catch (error) {
      logger.error('SOS Escalation Worker error:', error);
    }
  }

  /**
   * Process missed safety check-ins
   */
  private async processMissedCheckins(): Promise<void> {
    try {
      const processedCount = await sosService.processMissedCheckins();
      if (processedCount > 0) {
        logger.info(`Processed ${processedCount} missed check-ins`);
      }
    } catch (error) {
      logger.error('Error processing missed check-ins:', error);
    }
  }

  /**
   * Retry failed SOS notifications
   */
  private async retryFailedNotifications(): Promise<void> {
    try {
      // Find alerts with failed notifications that haven't exceeded retry limit
      const alertsWithFailedNotifications = await db('sos_notification_logs')
        .select('alert_id')
        .where('status', 'failed')
        .where('retry_count', '<', MAX_RETRY_ATTEMPTS)
        .groupBy('alert_id');

      let totalRetried = 0;
      for (const { alert_id } of alertsWithFailedNotifications) {
        const retriedCount = await sosService.retryFailedNotifications(alert_id);
        totalRetried += retriedCount;
      }

      if (totalRetried > 0) {
        logger.info(`Retried ${totalRetried} failed notifications`);
      }
    } catch (error) {
      logger.error('Error retrying failed notifications:', error);
    }
  }

  /**
   * Check for stale/long-running active alerts
   */
  private async checkStaleAlerts(): Promise<void> {
    try {
      const staleThreshold = new Date(Date.now() - STALE_ALERT_THRESHOLD_MINUTES * 60 * 1000);

      const staleAlerts = await db('sos_alerts')
        .where('status', 'active')
        .where('created_at', '<', staleThreshold)
        .select('id', 'user_id', 'created_at', 'alert_type');

      for (const alert of staleAlerts) {
        logger.warn(`STALE SOS ALERT DETECTED: ${alert.id}`, {
          alertId: alert.id,
          userId: alert.user_id,
          createdAt: alert.created_at,
          alertType: alert.alert_type,
          ageMinutes: Math.floor((Date.now() - new Date(alert.created_at).getTime()) / 60000),
        });

        // Check if already escalated recently
        const recentEscalation = await db('sos_escalation_logs')
          .where('alert_id', alert.id)
          .where('created_at', '>', new Date(Date.now() - 30 * 60 * 1000)) // Last 30 minutes
          .first();

        if (!recentEscalation) {
          // Escalate to support
          await sosService.escalateSOS(
            alert.id,
            `Alert has been active for over ${STALE_ALERT_THRESHOLD_MINUTES} minutes without resolution`,
            true
          );
        }
      }
    } catch (error) {
      logger.error('Error checking stale alerts:', error);
    }
  }

  /**
   * Update delivery status for sent notifications
   */
  private async updateDeliveryStatuses(): Promise<void> {
    try {
      // Find SMS notifications that were sent but not yet confirmed delivered
      const pendingDeliveries = await db('sos_notification_logs')
        .where('status', 'sent')
        .where('channel', 'sms')
        .whereNotNull('external_id')
        .whereNull('delivered_at')
        .where('sent_at', '>', db.raw("NOW() - INTERVAL '24 hours'"))
        .limit(50);

      // Import Twilio service for status checks
      const twilioService = (await import('../infrastructure/sms/twilio.service')).default;

      for (const notification of pendingDeliveries) {
        if (!notification.external_id) continue;

        try {
          // Note: This would need the TwilioService to have a getMessageStatus method
          // For now, we'll just log that we would check status
          logger.debug(`Would check delivery status for message ${notification.external_id}`);
        } catch (error) {
          logger.error(`Error checking delivery status for ${notification.id}:`, error);
        }
      }
    } catch (error) {
      logger.error('Error updating delivery statuses:', error);
    }
  }
}

// Export singleton instance
export const sosEscalationWorker = new SOSEscalationWorker();

// Auto-start if running as main process
if (process.env.SOS_WORKER_ENABLED === 'true') {
  sosEscalationWorker.start();

  // Graceful shutdown
  process.on('SIGTERM', () => {
    sosEscalationWorker.stop();
  });

  process.on('SIGINT', () => {
    sosEscalationWorker.stop();
  });
}
