#!/usr/bin/env node

/**
 * Process Failed Webhooks Script
 *
 * This script retries failed webhook events with exponential backoff.
 * Should be run periodically via cron job (e.g., every 5 minutes).
 *
 * Usage:
 *   node dist/scripts/process-failed-webhooks.js
 *
 * Cron example (runs every 5 minutes):
 *   *\/5 * * * * cd /path/to/payment-service && node dist/scripts/process-failed-webhooks.js >> /var/log/webhook-retry.log 2>&1
 */

import { WebhookRetryService } from '../domain/services/webhook-retry.service';
import logger from '../utils/logger';

async function main() {
  const startTime = Date.now();

  try {
    logger.info('Starting failed webhook processing job...');

    const retryService = new WebhookRetryService();

    // Process failed events
    await retryService.processFailedEvents();

    // Get statistics
    const stats = await retryService.getWebhookStats();
    logger.info('Webhook statistics:', stats);

    // Optional: Clean up old events (run less frequently, e.g., daily)
    const hour = new Date().getHours();
    if (hour === 3) {
      // Run at 3 AM
      logger.info('Running webhook event cleanup...');
      await retryService.cleanupOldEvents();
    }

    const duration = Date.now() - startTime;
    logger.info(`Failed webhook processing completed in ${duration}ms`);

    process.exit(0);
  } catch (error: any) {
    logger.error('Failed webhook processing error:', error);
    process.exit(1);
  }
}

// Run the script
main();
