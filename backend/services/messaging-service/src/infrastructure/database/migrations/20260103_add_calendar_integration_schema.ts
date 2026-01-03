/**
 * Migration: Add Calendar Integration Schema
 * Date: 2026-01-03
 *
 * This migration creates the Cosmos DB containers for calendar integration:
 * - CalendarConnections: OAuth connections to external calendars
 * - DateProposals: Date proposals within conversations
 * - ScheduledDates: Confirmed/scheduled dates
 * - VenueBookmarks: User's saved venue suggestions
 * - DateReminders: Scheduled reminders for dates
 */

import { CosmosClient, Database } from '@azure/cosmos';
import { createLogger } from '../../../utils/logger';

const logger = createLogger('calendar-migration');

interface MigrationContext {
  client: CosmosClient;
  database: Database;
}

/**
 * Container definitions for calendar integration
 */
const containers = [
  {
    id: 'CalendarConnections',
    partitionKey: '/userId',
    description: 'OAuth connections to external calendars (Google, Apple, Outlook)',
    indexingPolicy: {
      automatic: true,
      indexingMode: 'consistent' as const,
      includedPaths: [{ path: '/*' }],
      excludedPaths: [{ path: '/"_etag"/?' }],
      compositeIndexes: [
        [
          { path: '/userId', order: 'ascending' as const },
          { path: '/provider', order: 'ascending' as const },
        ],
        [
          { path: '/userId', order: 'ascending' as const },
          { path: '/isActive', order: 'ascending' as const },
        ],
      ],
    },
    uniqueKeyPolicy: {
      uniqueKeys: [
        { paths: ['/userId', '/provider'] }, // One connection per provider per user
      ],
    },
  },
  {
    id: 'DateProposals',
    partitionKey: '/conversationId',
    description: 'Date proposals within conversations',
    indexingPolicy: {
      automatic: true,
      indexingMode: 'consistent' as const,
      includedPaths: [{ path: '/*' }],
      excludedPaths: [{ path: '/"_etag"/?' }],
      compositeIndexes: [
        [
          { path: '/conversationId', order: 'ascending' as const },
          { path: '/createdAt', order: 'descending' as const },
        ],
        [
          { path: '/proposerId', order: 'ascending' as const },
          { path: '/status', order: 'ascending' as const },
        ],
        [
          { path: '/recipientId', order: 'ascending' as const },
          { path: '/status', order: 'ascending' as const },
        ],
      ],
    },
  },
  {
    id: 'ScheduledDates',
    partitionKey: '/participantIds',
    description: 'Confirmed scheduled dates between users',
    indexingPolicy: {
      automatic: true,
      indexingMode: 'consistent' as const,
      includedPaths: [{ path: '/*' }],
      excludedPaths: [{ path: '/"_etag"/?' }],
      compositeIndexes: [
        [
          { path: '/scheduledAt', order: 'ascending' as const },
          { path: '/status', order: 'ascending' as const },
        ],
        [
          { path: '/status', order: 'ascending' as const },
          { path: '/scheduledAt', order: 'ascending' as const },
        ],
      ],
    },
  },
  {
    id: 'VenueBookmarks',
    partitionKey: '/userId',
    description: 'User saved venue suggestions for dates',
    indexingPolicy: {
      automatic: true,
      indexingMode: 'consistent' as const,
      includedPaths: [{ path: '/*' }],
      excludedPaths: [{ path: '/"_etag"/?' }],
      compositeIndexes: [
        [
          { path: '/userId', order: 'ascending' as const },
          { path: '/category', order: 'ascending' as const },
        ],
        [
          { path: '/userId', order: 'ascending' as const },
          { path: '/createdAt', order: 'descending' as const },
        ],
      ],
    },
  },
  {
    id: 'DateReminders',
    partitionKey: '/scheduledDateId',
    description: 'Scheduled reminders for dates',
    indexingPolicy: {
      automatic: true,
      indexingMode: 'consistent' as const,
      includedPaths: [{ path: '/*' }],
      excludedPaths: [{ path: '/"_etag"/?' }],
      compositeIndexes: [
        [
          { path: '/reminderAt', order: 'ascending' as const },
          { path: '/sent', order: 'ascending' as const },
        ],
        [
          { path: '/userId', order: 'ascending' as const },
          { path: '/reminderAt', order: 'ascending' as const },
        ],
      ],
    },
  },
];

/**
 * Run the migration
 */
export async function up(context: MigrationContext): Promise<void> {
  logger.info('Starting calendar integration migration...');

  for (const containerDef of containers) {
    try {
      logger.info(`Creating container: ${containerDef.id}`);

      const containerConfig: any = {
        id: containerDef.id,
        partitionKey: containerDef.partitionKey,
        indexingPolicy: containerDef.indexingPolicy,
      };

      // Add unique key policy if defined
      if ('uniqueKeyPolicy' in containerDef) {
        containerConfig.uniqueKeyPolicy = containerDef.uniqueKeyPolicy;
      }

      await context.database.containers.createIfNotExists(containerConfig);

      logger.info(`Container "${containerDef.id}" created successfully - ${containerDef.description}`);
    } catch (error: any) {
      logger.error(`Failed to create container ${containerDef.id}:`, error);
      throw error;
    }
  }

  logger.info('Calendar integration migration completed successfully');
}

/**
 * Rollback the migration
 */
export async function down(context: MigrationContext): Promise<void> {
  logger.warn('Rolling back calendar integration migration...');

  // Rollback in reverse order
  for (const containerDef of [...containers].reverse()) {
    try {
      logger.info(`Deleting container: ${containerDef.id}`);
      const container = context.database.container(containerDef.id);
      await container.delete();
      logger.info(`Container "${containerDef.id}" deleted successfully`);
    } catch (error: any) {
      // Container might not exist if migration failed partway
      if (error.code !== 404) {
        logger.warn(`Failed to delete container ${containerDef.id}:`, error.message);
      }
    }
  }

  logger.info('Calendar integration migration rollback completed');
}

export default { up, down };
