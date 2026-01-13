import { postgresClient } from '../../infrastructure/database/postgres-client';
import { createLogger } from '../../utils/logger';

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
 * Chat export document stored in PostgreSQL
 */
export interface ChatExportDocument {
  id: string;
  userId: string;
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
  /**
   * Create a new export record
   */
  async create(exportDoc: ChatExportDocument): Promise<ChatExportDocument> {
    try {
      logger.info(`Creating export record: ${exportDoc.id}`);

      const [result] = await postgresClient.chatExports().insert(exportDoc).returning('*');

      logger.info(`Export record created: ${exportDoc.id}`);
      return result as ChatExportDocument;
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
      const result = await postgresClient
        .chatExports()
        .where('id', exportId)
        .andWhere('user_id', userId)
        .first();
      return result || null;
    } catch (error: any) {
      logger.error(`Failed to find export ${exportId}:`, error);
      throw error;
    }
  }

  /**
   * Find export by ID across all users
   */
  async findByIdCrossPartition(exportId: string): Promise<ChatExportDocument | null> {
    try {
      const result = await postgresClient.chatExports().where('id', exportId).first();
      return result || null;
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

      const [result] = await postgresClient
        .chatExports()
        .where('id', exportId)
        .andWhere('user_id', userId)
        .update(updates)
        .returning('*');

      logger.info(`Export record updated: ${exportId}`);
      return result as ChatExportDocument;
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
      await postgresClient.chatExports().where('id', exportId).andWhere('user_id', userId).delete();
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
      const results = await postgresClient
        .chatExports()
        .where('user_id', userId)
        .orderBy('created_at', 'desc')
        .limit(limit)
        .offset(offset);

      return results as ChatExportDocument[];
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
      const results = await postgresClient
        .chatExports()
        .where('user_id', userId)
        .andWhere('conversation_id', conversationId)
        .orderBy('created_at', 'desc')
        .limit(limit);

      return results as ChatExportDocument[];
    } catch (error: any) {
      logger.error('Failed to get exports by conversation:', error);
      throw error;
    }
  }

  /**
   * Get expired exports that need cleanup
   */
  async getExpiredExports(limit: number = 100): Promise<ChatExportDocument[]> {
    try {
      const now = new Date().toISOString();
      const results = await postgresClient
        .chatExports()
        .where('status', 'completed')
        .andWhere('expires_at', '<', now)
        .limit(limit);

      return results as ChatExportDocument[];
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
      // Get totals
      const totalsResult = await postgresClient
        .chatExports()
        .where('user_id', userId)
        .select(
          postgresClient.chatExports().client.raw('COUNT(*) as total_exports'),
          postgresClient.chatExports().client.raw('COALESCE(SUM(file_size), 0) as storage_used')
        )
        .first();

      const totals = totalsResult || { total_exports: 0, storage_used: 0 };

      // Get exports this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const monthResult = await postgresClient
        .chatExports()
        .where('user_id', userId)
        .andWhere('created_at', '>=', startOfMonth.toISOString())
        .count('* as count')
        .first();

      const exportsThisMonth = Number(monthResult?.count) || 0;

      // Get exports by format
      const formatResults = await postgresClient
        .chatExports()
        .where('user_id', userId)
        .select('format')
        .count('* as count')
        .groupBy('format');

      const exportsByFormat = { json: 0, txt: 0, pdf: 0 };
      for (const result of formatResults) {
        if (result.format in exportsByFormat) {
          exportsByFormat[result.format as ExportFormat] = Number(result.count);
        }
      }

      // Get exports by status
      const statusResults = await postgresClient
        .chatExports()
        .where('user_id', userId)
        .select('status')
        .count('* as count')
        .groupBy('status');

      const exportsByStatus = { pending: 0, processing: 0, completed: 0, failed: 0, expired: 0 };
      for (const result of statusResults) {
        if (result.status in exportsByStatus) {
          exportsByStatus[result.status as ExportStatus] = Number(result.count);
        }
      }

      // Get average file size
      const avgResult = await postgresClient
        .chatExports()
        .where('user_id', userId)
        .andWhere('status', 'completed')
        .whereNotNull('file_size')
        .avg('file_size as avg')
        .first();

      const averageFileSize = Math.round(Number(avgResult?.avg) || 0);

      // Get last export date
      const lastExportResult = await postgresClient
        .chatExports()
        .where('user_id', userId)
        .orderBy('created_at', 'desc')
        .select('created_at')
        .first();

      const lastExportDate = lastExportResult?.created_at;

      return {
        totalExports: Number(totals.total_exports) || 0,
        exportsThisMonth,
        storageUsed: Number(totals.storage_used) || 0,
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
      const totalsResult = await postgresClient
        .chatExports()
        .select(
          postgresClient.chatExports().client.raw('COUNT(*) as total_exports'),
          postgresClient.chatExports().client.raw('COALESCE(SUM(file_size), 0) as total_storage_used')
        )
        .first();

      const totals = totalsResult || { total_exports: 0, total_storage_used: 0 };

      // Exports today
      const todayResult = await postgresClient
        .chatExports()
        .where('created_at', '>=', startOfDay.toISOString())
        .count('* as count')
        .first();

      // Exports this week
      const weekResult = await postgresClient
        .chatExports()
        .where('created_at', '>=', startOfWeek.toISOString())
        .count('* as count')
        .first();

      // Exports this month
      const monthResult = await postgresClient
        .chatExports()
        .where('created_at', '>=', startOfMonth.toISOString())
        .count('* as count')
        .first();

      // Exports by format
      const formatResults = await postgresClient
        .chatExports()
        .select('format')
        .count('* as count')
        .groupBy('format');

      const exportsByFormat = { json: 0, txt: 0, pdf: 0 };
      for (const result of formatResults) {
        if (result.format in exportsByFormat) {
          exportsByFormat[result.format as ExportFormat] = Number(result.count);
        }
      }

      // Average file size
      const avgResult = await postgresClient
        .chatExports()
        .where('status', 'completed')
        .whereNotNull('file_size')
        .avg('file_size as avg')
        .first();

      // Unique users count
      const uniqueUsersResult = await postgresClient
        .chatExports()
        .countDistinct('user_id as count')
        .first();

      return {
        totalExports: Number(totals.total_exports) || 0,
        exportsToday: Number(todayResult?.count) || 0,
        exportsThisWeek: Number(weekResult?.count) || 0,
        exportsThisMonth: Number(monthResult?.count) || 0,
        totalStorageUsed: Number(totals.total_storage_used) || 0,
        exportsByFormat,
        averageFileSize: Math.round(Number(avgResult?.avg) || 0),
        uniqueUsers: Number(uniqueUsersResult?.count) || 0,
      };
    } catch (error: any) {
      logger.error('Failed to get global export statistics:', error);
      throw error;
    }
  }

  /**
   * Get recent exports (for admin monitoring)
   */
  async getRecentExports(limit: number = 50): Promise<ChatExportDocument[]> {
    try {
      const results = await postgresClient
        .chatExports()
        .orderBy('created_at', 'desc')
        .limit(limit);

      return results as ChatExportDocument[];
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
      const result = await postgresClient
        .chatExports()
        .where('user_id', userId)
        .andWhere(function () {
          this.where('status', 'pending').orWhere('status', 'processing');
        })
        .count('* as count')
        .first();

      return Number(result?.count) || 0;
    } catch (error: any) {
      logger.error('Failed to count active exports:', error);
      throw error;
    }
  }
}

export const chatExportRepository = new ChatExportRepository();
export default chatExportRepository;
