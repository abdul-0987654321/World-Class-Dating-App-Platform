import { Container } from '@azure/cosmos';
import { createLogger } from '../../utils/logger';
import { cosmosClient } from '../../infrastructure/database/cosmos-client';

const logger = createLogger('chat-export-repository');

/**
 * Export status enum
 */
export type ExportStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'expired';

/**
 * Export format type
 */
export type ExportFormat = 'json' | 'txt' | 'pdf';

/**
 * Chat export document stored in Cosmos DB
 */
export interface ChatExportDocument {
  id: string;
  userId: string; // Partition key
  conversationId: string;
  format: ExportFormat;
  status: ExportStatus;
  url?: string;
  fileSize?: number;
  messageCount?: number;
  startDate?: string;
  endDate?: string;
  includeMedia: boolean;
  createdAt: string;
  completedAt?: string;
  expiresAt?: string;
  errorMessage?: string;
}

/**
 * Export statistics interface
 */
export interface ExportStatistics {
  totalExports: number;
  exportsThisMonth: number;
  storageUsed: number;
  exportsByFormat: {
    json: number;
    txt: number;
    pdf: number;
  };
  exportsByStatus: {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    expired: number;
  };
  averageFileSize: number;
  lastExportDate?: string;
}

/**
 * Global export statistics (admin use)
 */
export interface GlobalExportStatistics {
  totalExports: number;
  exportsToday: number;
  exportsThisWeek: number;
  exportsThisMonth: number;
  totalStorageUsed: number;
  exportsByFormat: {
    json: number;
    txt: number;
    pdf: number;
  };
  averageFileSize: number;
  uniqueUsers: number;
}

export class ChatExportRepository {
  private _container: Container | null = null;

  private get container(): Container {
    if (!this._container) {
      this._container = cosmosClient.getChatExportsContainer();
    }
    return this._container;
  }

  /**
   * Create a new export record
   */
  async create(exportDoc: ChatExportDocument): Promise<ChatExportDocument> {
    try {
      logger.info(`Creating export record: ${exportDoc.id}`);

      const { resource } = await this.container.items.create(exportDoc);

      logger.info(`Export record created: ${exportDoc.id}`);
      return resource as ChatExportDocument;
    } catch (error: any) {
      logger.error(`Failed to create export record ${exportDoc.id}:`, error);
      throw new Error(`Failed to create export record: ${error.message}`);
    }
  }

  /**
   * Find export by ID
   */
  async findById(exportId: string, userId: string): Promise<ChatExportDocument | null> {
    try {
      const { resource } = await this.container.item(exportId, userId).read<ChatExportDocument>();
      return resource || null;
    } catch (error: any) {
      if (error.code === 404) {
        return null;
      }
      logger.error(`Failed to find export ${exportId}:`, error);
      throw error;
    }
  }

  /**
   * Find export by ID across all users (cross-partition query)
   * Use sparingly as it's more expensive
   */
  async findByIdCrossPartition(exportId: string): Promise<ChatExportDocument | null> {
    try {
      const querySpec = {
        query: 'SELECT * FROM c WHERE c.id = @exportId',
        parameters: [{ name: '@exportId', value: exportId }],
      };

      // Note: In Cosmos DB SDK v4, cross-partition queries are enabled by default
      const { resources } = await this.container.items
        .query<ChatExportDocument>(querySpec)
        .fetchAll();

      return resources[0] || null;
    } catch (error: any) {
      logger.error(`Failed to find export ${exportId}:`, error);
      throw error;
    }
  }

  /**
   * Update export record
   */
  async update(
    exportId: string,
    userId: string,
    updates: Partial<ChatExportDocument>
  ): Promise<ChatExportDocument> {
    try {
      logger.info(`Updating export record: ${exportId}`);

      const existing = await this.findById(exportId, userId);
      if (!existing) {
        throw new Error(`Export ${exportId} not found`);
      }

      const updated = { ...existing, ...updates };
      const { resource } = await this.container.item(exportId, userId).replace(updated);

      logger.info(`Export record updated: ${exportId}`);
      return resource as ChatExportDocument;
    } catch (error: any) {
      logger.error(`Failed to update export ${exportId}:`, error);
      throw error;
    }
  }

  /**
   * Update export status
   */
  async updateStatus(
    exportId: string,
    userId: string,
    status: ExportStatus,
    additionalUpdates?: Partial<ChatExportDocument>
  ): Promise<ChatExportDocument> {
    const updates: Partial<ChatExportDocument> = {
      status,
      ...additionalUpdates,
    };

    if (status === 'completed') {
      updates.completedAt = new Date().toISOString();
    }

    return this.update(exportId, userId, updates);
  }

  /**
   * Delete export record
   */
  async delete(exportId: string, userId: string): Promise<void> {
    try {
      logger.info(`Deleting export record: ${exportId}`);
      await this.container.item(exportId, userId).delete();
      logger.info(`Export record deleted: ${exportId}`);
    } catch (error: any) {
      logger.error(`Failed to delete export ${exportId}:`, error);
      throw error;
    }
  }

  /**
   * Get exports for a user with pagination
   */
  async getExportsByUser(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<ChatExportDocument[]> {
    try {
      const querySpec = {
        query: `SELECT * FROM c
                WHERE c.userId = @userId
                ORDER BY c.createdAt DESC
                OFFSET @offset LIMIT @limit`,
        parameters: [
          { name: '@userId', value: userId },
          { name: '@offset', value: offset },
          { name: '@limit', value: limit },
        ],
      };

      const { resources } = await this.container.items
        .query<ChatExportDocument>(querySpec)
        .fetchAll();

      return resources;
    } catch (error: any) {
      logger.error('Failed to get exports by user:', error);
      throw error;
    }
  }

  /**
   * Get exports for a specific conversation
   */
  async getExportsByConversation(
    userId: string,
    conversationId: string,
    limit: number = 20
  ): Promise<ChatExportDocument[]> {
    try {
      const querySpec = {
        query: `SELECT * FROM c
                WHERE c.userId = @userId
                AND c.conversationId = @conversationId
                ORDER BY c.createdAt DESC
                OFFSET 0 LIMIT @limit`,
        parameters: [
          { name: '@userId', value: userId },
          { name: '@conversationId', value: conversationId },
          { name: '@limit', value: limit },
        ],
      };

      const { resources } = await this.container.items
        .query<ChatExportDocument>(querySpec)
        .fetchAll();

      return resources;
    } catch (error: any) {
      logger.error('Failed to get exports by conversation:', error);
      throw error;
    }
  }

  /**
   * Get expired exports that need cleanup
   * Note: This is a cross-partition query (enabled by default in SDK v4)
   */
  async getExpiredExports(limit: number = 100): Promise<ChatExportDocument[]> {
    try {
      const now = new Date().toISOString();
      const querySpec = {
        query: `SELECT * FROM c
                WHERE c.status = 'completed'
                AND c.expiresAt < @now
                OFFSET 0 LIMIT @limit`,
        parameters: [
          { name: '@now', value: now },
          { name: '@limit', value: limit },
        ],
      };

      const { resources } = await this.container.items
        .query<ChatExportDocument>(querySpec)
        .fetchAll();

      return resources;
    } catch (error: any) {
      logger.error('Failed to get expired exports:', error);
      throw error;
    }
  }

  /**
   * Mark exports as expired
   */
  async markAsExpired(exports: ChatExportDocument[]): Promise<number> {
    let count = 0;
    for (const exp of exports) {
      try {
        await this.updateStatus(exp.id, exp.userId, 'expired');
        count++;
      } catch (error: any) {
        logger.error(`Failed to mark export ${exp.id} as expired:`, error);
      }
    }
    return count;
  }

  /**
   * Get export statistics for a user
   */
  async getExportStatistics(userId: string): Promise<ExportStatistics> {
    try {
      // Get total exports and storage
      const totalsQuery = {
        query: `SELECT VALUE {
                  totalExports: COUNT(1),
                  storageUsed: SUM(c.fileSize)
                }
                FROM c
                WHERE c.userId = @userId`,
        parameters: [{ name: '@userId', value: userId }],
      };

      const { resources: totalsResults } = await this.container.items
        .query<{ totalExports: number; storageUsed: number }>(totalsQuery)
        .fetchAll();

      const totals = totalsResults[0] || { totalExports: 0, storageUsed: 0 };

      // Get exports this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const monthQuery = {
        query: `SELECT VALUE COUNT(1)
                FROM c
                WHERE c.userId = @userId
                AND c.createdAt >= @startOfMonth`,
        parameters: [
          { name: '@userId', value: userId },
          { name: '@startOfMonth', value: startOfMonth.toISOString() },
        ],
      };

      const { resources: monthResults } = await this.container.items
        .query<number>(monthQuery)
        .fetchAll();

      const exportsThisMonth = monthResults[0] || 0;

      // Get exports by format
      const formatQuery = {
        query: `SELECT c.format, COUNT(1) as count
                FROM c
                WHERE c.userId = @userId
                GROUP BY c.format`,
        parameters: [{ name: '@userId', value: userId }],
      };

      const { resources: formatResults } = await this.container.items
        .query<{ format: ExportFormat; count: number }>(formatQuery)
        .fetchAll();

      const exportsByFormat = { json: 0, txt: 0, pdf: 0 };
      for (const result of formatResults) {
        if (result.format in exportsByFormat) {
          exportsByFormat[result.format] = result.count;
        }
      }

      // Get exports by status
      const statusQuery = {
        query: `SELECT c.status, COUNT(1) as count
                FROM c
                WHERE c.userId = @userId
                GROUP BY c.status`,
        parameters: [{ name: '@userId', value: userId }],
      };

      const { resources: statusResults } = await this.container.items
        .query<{ status: ExportStatus; count: number }>(statusQuery)
        .fetchAll();

      const exportsByStatus = { pending: 0, processing: 0, completed: 0, failed: 0, expired: 0 };
      for (const result of statusResults) {
        if (result.status in exportsByStatus) {
          exportsByStatus[result.status] = result.count;
        }
      }

      // Get average file size (only completed exports with fileSize)
      const avgQuery = {
        query: `SELECT VALUE AVG(c.fileSize)
                FROM c
                WHERE c.userId = @userId
                AND c.status = 'completed'
                AND IS_NUMBER(c.fileSize)`,
        parameters: [{ name: '@userId', value: userId }],
      };

      const { resources: avgResults } = await this.container.items
        .query<number>(avgQuery)
        .fetchAll();

      const averageFileSize = Math.round(avgResults[0] || 0);

      // Get last export date
      const lastExportQuery = {
        query: `SELECT TOP 1 c.createdAt
                FROM c
                WHERE c.userId = @userId
                ORDER BY c.createdAt DESC`,
        parameters: [{ name: '@userId', value: userId }],
      };

      const { resources: lastExportResults } = await this.container.items
        .query<{ createdAt: string }>(lastExportQuery)
        .fetchAll();

      const lastExportDate = lastExportResults[0]?.createdAt;

      return {
        totalExports: totals.totalExports || 0,
        exportsThisMonth,
        storageUsed: totals.storageUsed || 0,
        exportsByFormat,
        exportsByStatus,
        averageFileSize,
        lastExportDate,
      };
    } catch (error: any) {
      logger.error('Failed to get export statistics:', error);
      throw error;
    }
  }

  /**
   * Get global export statistics (for admin/monitoring)
   * Note: Uses cross-partition queries (enabled by default in SDK v4)
   */
  async getGlobalExportStatistics(): Promise<GlobalExportStatistics> {
    try {
      const now = new Date();
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);

      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      const startOfMonth = new Date(now);
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      // Total exports and storage
      const totalsQuery = {
        query: `SELECT VALUE {
                  totalExports: COUNT(1),
                  totalStorageUsed: SUM(c.fileSize)
                }
                FROM c`,
        parameters: [],
      };

      const { resources: totalsResults } = await this.container.items
        .query<{ totalExports: number; totalStorageUsed: number }>(totalsQuery)
        .fetchAll();

      const totals = totalsResults[0] || { totalExports: 0, totalStorageUsed: 0 };

      // Due to Cosmos DB limitations with conditional counts, we'll do separate queries
      const todayQuery = {
        query: `SELECT VALUE COUNT(1)
                FROM c
                WHERE c.createdAt >= @startOfDay`,
        parameters: [{ name: '@startOfDay', value: startOfDay.toISOString() }],
      };

      const weekQuery = {
        query: `SELECT VALUE COUNT(1)
                FROM c
                WHERE c.createdAt >= @startOfWeek`,
        parameters: [{ name: '@startOfWeek', value: startOfWeek.toISOString() }],
      };

      const monthQuery = {
        query: `SELECT VALUE COUNT(1)
                FROM c
                WHERE c.createdAt >= @startOfMonth`,
        parameters: [{ name: '@startOfMonth', value: startOfMonth.toISOString() }],
      };

      const [todayResults, weekResults, monthResults] = await Promise.all([
        this.container.items.query<number>(todayQuery).fetchAll(),
        this.container.items.query<number>(weekQuery).fetchAll(),
        this.container.items.query<number>(monthQuery).fetchAll(),
      ]);

      // Exports by format
      const formatQuery = {
        query: `SELECT c.format, COUNT(1) as count
                FROM c
                GROUP BY c.format`,
        parameters: [],
      };

      const { resources: formatResults } = await this.container.items
        .query<{ format: ExportFormat; count: number }>(formatQuery)
        .fetchAll();

      const exportsByFormat = { json: 0, txt: 0, pdf: 0 };
      for (const result of formatResults) {
        if (result.format in exportsByFormat) {
          exportsByFormat[result.format] = result.count;
        }
      }

      // Average file size
      const avgQuery = {
        query: `SELECT VALUE AVG(c.fileSize)
                FROM c
                WHERE c.status = 'completed'
                AND IS_NUMBER(c.fileSize)`,
        parameters: [],
      };

      const { resources: avgResults } = await this.container.items
        .query<number>(avgQuery)
        .fetchAll();

      // Unique users count - use a simpler approach for Cosmos DB
      const uniqueUsersQuery = {
        query: `SELECT DISTINCT VALUE c.userId FROM c`,
        parameters: [],
      };

      const { resources: uniqueUsersResults } = await this.container.items
        .query<string>(uniqueUsersQuery)
        .fetchAll();

      return {
        totalExports: totals.totalExports || 0,
        exportsToday: todayResults.resources[0] || 0,
        exportsThisWeek: weekResults.resources[0] || 0,
        exportsThisMonth: monthResults.resources[0] || 0,
        totalStorageUsed: totals.totalStorageUsed || 0,
        exportsByFormat,
        averageFileSize: Math.round(avgResults[0] || 0),
        uniqueUsers: uniqueUsersResults.length,
      };
    } catch (error: any) {
      logger.error('Failed to get global export statistics:', error);
      throw error;
    }
  }

  /**
   * Get recent exports (for admin monitoring)
   * Note: This is a cross-partition query (enabled by default in SDK v4)
   */
  async getRecentExports(limit: number = 50): Promise<ChatExportDocument[]> {
    try {
      const querySpec = {
        query: `SELECT * FROM c
                ORDER BY c.createdAt DESC
                OFFSET 0 LIMIT @limit`,
        parameters: [{ name: '@limit', value: limit }],
      };

      const { resources } = await this.container.items
        .query<ChatExportDocument>(querySpec)
        .fetchAll();

      return resources;
    } catch (error: any) {
      logger.error('Failed to get recent exports:', error);
      throw error;
    }
  }

  /**
   * Count pending/processing exports for a user (rate limiting)
   */
  async countActiveExports(userId: string): Promise<number> {
    try {
      const querySpec = {
        query: `SELECT VALUE COUNT(1)
                FROM c
                WHERE c.userId = @userId
                AND (c.status = 'pending' OR c.status = 'processing')`,
        parameters: [{ name: '@userId', value: userId }],
      };

      const { resources } = await this.container.items.query<number>(querySpec).fetchAll();
      return resources[0] || 0;
    } catch (error: any) {
      logger.error('Failed to count active exports:', error);
      throw error;
    }
  }
}

export const chatExportRepository = new ChatExportRepository();
export default chatExportRepository;
