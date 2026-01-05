/**
 * Speed Dating Job
 * Scheduled tasks for managing speed dating events
 */

import { createLogger } from '@flamoral/backend-shared';
import * as cron from 'node-cron';

import { SpeedDatingEventStatus } from '../domain/entities/SpeedDatingEvent.entity';
import speedDatingRepository from '../domain/repositories/speed-dating.repository';
import speedDatingService from '../domain/services/speed-dating.service';

const logger = createLogger('speed-dating-job');

class SpeedDatingJob {
  private startEventsTask: cron.ScheduledTask | null = null;
  private cleanupEventsTask: cron.ScheduledTask | null = null;

  /**
   * Start all speed dating scheduled jobs
   */
  startAll(): void {
    this.startEventStarterJob();
    this.startCleanupJob();
    logger.info('Speed dating jobs started');
  }

  /**
   * Stop all speed dating scheduled jobs
   */
  stopAll(): void {
    if (this.startEventsTask) {
      this.startEventsTask.stop();
      this.startEventsTask = null;
    }
    if (this.cleanupEventsTask) {
      this.cleanupEventsTask.stop();
      this.cleanupEventsTask = null;
    }
    logger.info('Speed dating jobs stopped');
  }

  /**
   * Job to check and start events that should begin
   * Runs every minute
   */
  private startEventStarterJob(): void {
    // Run every minute
    this.startEventsTask = cron.schedule('* * * * *', async () => {
      try {
        await this.processEventsToStart();
      } catch (error) {
        logger.error('Error in event starter job', error);
      }
    });
  }

  /**
   * Job to clean up old events
   * Runs daily at 3 AM
   */
  private startCleanupJob(): void {
    this.cleanupEventsTask = cron.schedule('0 3 * * *', async () => {
      try {
        await this.cleanupOldEvents();
      } catch (error) {
        logger.error('Error in cleanup job', error);
      }
    });
  }

  /**
   * Find and start events that should begin
   */
  private async processEventsToStart(): Promise<void> {
    try {
      const now = new Date();
      const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

      // Get upcoming events that are about to start (within 5 minutes)
      const events = await speedDatingRepository.getUpcomingEvents(
        {
          status: SpeedDatingEventStatus.UPCOMING,
          toDate: fiveMinutesFromNow,
        },
        100,
        0
      );

      for (const event of events) {
        // Check if event should start now
        if (event.startTime <= now) {
          logger.info(`Starting event ${event.id}: ${event.name}`);
          try {
            await speedDatingService.startEvent(event.id);
            // Note: In production, this would trigger WebSocket broadcasts
            // through a message queue or direct WebSocket handler call
            logger.info(`Event ${event.id} started successfully`);
          } catch (error) {
            logger.error(`Failed to start event ${event.id}`, error);
          }
        }
      }
    } catch (error) {
      logger.error('Error processing events to start', error);
    }
  }

  /**
   * Clean up old completed/cancelled events
   * Archives events older than 30 days
   */
  private async cleanupOldEvents(): Promise<void> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Note: In production, this would archive old events to cold storage
      // For now, we just log what would be cleaned up
      const completedEvents = await speedDatingRepository.getUpcomingEvents(
        {
          status: SpeedDatingEventStatus.COMPLETED,
          toDate: thirtyDaysAgo,
        },
        100,
        0
      );

      logger.info(`Found ${completedEvents.length} old events to archive`);

      // Archive logic would go here
    } catch (error) {
      logger.error('Error cleaning up old events', error);
    }
  }

  /**
   * Manually trigger event processing (for testing)
   */
  async processNow(): Promise<void> {
    await this.processEventsToStart();
  }
}

export default new SpeedDatingJob();
