/**
 * Match Expiration Background Job
 * Runs every 5 minutes to process expired matches and send expiration warnings
 */

import { createLogger } from '@flamoral/backend-shared';
import cron, { ScheduledTask } from 'node-cron';

import matchService from '../domain/services/match.service';

const logger = createLogger('match-expiration-job');

export class MatchExpirationJob {
  private expirationTask: ScheduledTask | null = null;
  private sixHourWarningTask: ScheduledTask | null = null;
  private oneHourWarningTask: ScheduledTask | null = null;

  /**
   * Start the match expiration cron job
   * Runs every 5 minutes to check for expired matches
   */
  startExpirationJob(): void {
    // Run every 5 minutes
    this.expirationTask = cron.schedule('*/5 * * * *', async () => {
      try {
        logger.info('Running match expiration job...');
        await matchService.processExpiredMatches();
        logger.info('Match expiration job completed successfully');
      } catch (error) {
        logger.error('Match expiration job failed', error);
      }
    });

    logger.info('Match expiration job scheduled - runs every 5 minutes');
  }

  /**
   * Start the 6-hour warning job
   * Runs every hour to check for matches expiring in 6 hours
   */
  startSixHourWarningJob(): void {
    // Run every hour at minute 0
    this.sixHourWarningTask = cron.schedule('0 * * * *', async () => {
      try {
        logger.info('Running 6-hour expiration warning job...');
        await matchService.sendExpirationWarnings(6);
        logger.info('6-hour expiration warning job completed successfully');
      } catch (error) {
        logger.error('6-hour expiration warning job failed', error);
      }
    });

    logger.info('6-hour expiration warning job scheduled - runs every hour');
  }

  /**
   * Start the 1-hour warning job
   * Runs every 15 minutes to check for matches expiring in 1 hour
   */
  startOneHourWarningJob(): void {
    // Run every 15 minutes
    this.oneHourWarningTask = cron.schedule('*/15 * * * *', async () => {
      try {
        logger.info('Running 1-hour expiration warning job...');
        await matchService.sendExpirationWarnings(1);
        logger.info('1-hour expiration warning job completed successfully');
      } catch (error) {
        logger.error('1-hour expiration warning job failed', error);
      }
    });

    logger.info('1-hour expiration warning job scheduled - runs every 15 minutes');
  }

  /**
   * Start all expiration jobs
   */
  startAll(): void {
    this.startExpirationJob();
    this.startSixHourWarningJob();
    this.startOneHourWarningJob();
    logger.info('All match expiration jobs started');
  }

  /**
   * Stop all expiration jobs
   */
  stopAll(): void {
    if (this.expirationTask) {
      this.expirationTask.stop();
      this.expirationTask = null;
    }

    if (this.sixHourWarningTask) {
      this.sixHourWarningTask.stop();
      this.sixHourWarningTask = null;
    }

    if (this.oneHourWarningTask) {
      this.oneHourWarningTask.stop();
      this.oneHourWarningTask = null;
    }

    logger.info('All match expiration jobs stopped');
  }
}

export default new MatchExpirationJob();
