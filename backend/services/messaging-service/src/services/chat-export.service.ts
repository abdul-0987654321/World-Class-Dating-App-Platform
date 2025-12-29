import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '../utils/logger';
import { messageRepository } from '../domain/repositories/message.repository';
import { conversationRepository } from '../domain/repositories/conversation.repository';
import {
  chatExportRepository,
  ChatExportDocument,
  ExportStatistics,
  ExportFormat,
} from '../domain/repositories/chat-export.repository';
import { ChatExportRequest, ChatExportResult } from '../types/enhanced-types';
import { Message } from '../types';
import { redisClient } from '../infrastructure/cache/redis';

const logger = createLogger('chat-export-service');

// Cache TTL for export data (1 hour)
const EXPORT_CACHE_TTL = 3600;

export class ChatExportService {
  private readonly EXPORT_EXPIRY_HOURS = 24;
  private readonly MAX_MESSAGES = 10000;
  private readonly MAX_CONCURRENT_EXPORTS = 3; // Max concurrent exports per user

  /**
   * Export chat conversation
   */
  async exportChat(request: ChatExportRequest): Promise<ChatExportResult> {
    try {
      const {
        conversationId,
        userId,
        format,
        startDate,
        endDate,
        includeMedia = false,
      } = request;

      // Check rate limit - max concurrent exports per user
      const activeExports = await chatExportRepository.countActiveExports(userId);
      if (activeExports >= this.MAX_CONCURRENT_EXPORTS) {
        throw new Error(`Maximum concurrent exports (${this.MAX_CONCURRENT_EXPORTS}) reached. Please wait for existing exports to complete.`);
      }

      // Verify user is participant in conversation
      const conversation = await conversationRepository.findById(conversationId);
      if (!conversation) {
        throw new Error('Conversation not found');
      }

      if (
        conversation.participant1Id !== userId &&
        conversation.participant2Id !== userId
      ) {
        throw new Error('Not authorized to export this conversation');
      }

      // Create export record in pending state
      const exportId = uuidv4();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + this.EXPORT_EXPIRY_HOURS);

      const exportDoc: ChatExportDocument = {
        id: exportId,
        userId,
        conversationId,
        format: format as ExportFormat,
        status: 'pending',
        includeMedia,
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString(),
        createdAt: new Date().toISOString(),
        expiresAt: expiresAt.toISOString(),
      };

      await chatExportRepository.create(exportDoc);

      try {
        // Update status to processing
        await chatExportRepository.updateStatus(exportId, userId, 'processing');

        // Get messages
        const messages = await this.getMessagesForExport(
          conversationId,
          userId,
          startDate,
          endDate
        );

        logger.info('Exporting chat', {
          conversationId,
          userId,
          format,
          messageCount: messages.length,
        });

        // Generate export based on format
        let exportData: string | Buffer;
        let mimeType: string;

        switch (format) {
          case 'json':
            exportData = await this.exportAsJson(messages, conversation, includeMedia);
            mimeType = 'application/json';
            break;
          case 'txt':
            exportData = await this.exportAsText(messages, conversation);
            mimeType = 'text/plain';
            break;
          case 'pdf':
            exportData = await this.exportAsPdf(messages, conversation);
            mimeType = 'application/pdf';
            break;
          default:
            throw new Error('Invalid export format');
        }

        // Upload to storage and get URL
        const url = await this.uploadExport(exportData, exportId, format);
        const fileSize = Buffer.byteLength(exportData);

        // Update export record with completion details
        await chatExportRepository.updateStatus(exportId, userId, 'completed', {
          url,
          fileSize,
          messageCount: messages.length,
        });

        const result: ChatExportResult = {
          exportId,
          url,
          expiresAt,
          format,
          fileSize,
        };

        // Cache the result for quick retrieval
        await this.cacheExportResult(exportId, userId, result);

        logger.info('Chat export completed', {
          exportId,
          format,
          fileSize: result.fileSize,
        });

        return result;
      } catch (error: any) {
        // Mark export as failed
        await chatExportRepository.updateStatus(exportId, userId, 'failed', {
          errorMessage: error.message,
        });
        throw error;
      }
    } catch (error: any) {
      logger.error('Failed to export chat:', error);
      throw error;
    }
  }

  /**
   * Cache export result in Redis
   */
  private async cacheExportResult(
    exportId: string,
    userId: string,
    result: ChatExportResult
  ): Promise<void> {
    try {
      const cacheKey = `export:${userId}:${exportId}`;
      await redisClient.set(cacheKey, JSON.stringify(result), EXPORT_CACHE_TTL);
    } catch (error: any) {
      logger.warn('Failed to cache export result:', error);
      // Non-critical error, don't throw
    }
  }

  /**
   * Get cached export result from Redis
   */
  private async getCachedExportResult(
    exportId: string,
    userId: string
  ): Promise<ChatExportResult | null> {
    try {
      const cacheKey = `export:${userId}:${exportId}`;
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached) as ChatExportResult;
      }
      return null;
    } catch (error: any) {
      logger.warn('Failed to get cached export result:', error);
      return null;
    }
  }

  /**
   * Get messages for export
   */
  private async getMessagesForExport(
    conversationId: string,
    userId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<Message[]> {
    try {
      // Get all messages (with pagination if needed)
      let allMessages: Message[] = [];
      let offset = 0;
      const limit = 500;

      while (true) {
        const messages = await messageRepository.getMessagesByConversation(
          conversationId,
          limit,
          offset
        );

        if (messages.length === 0) break;

        // Filter by date range if provided
        const filteredMessages = messages.filter(msg => {
          if (msg.deletedFor?.includes(userId)) return false;

          const sentAt = new Date(msg.sentAt);
          if (startDate && sentAt < startDate) return false;
          if (endDate && sentAt > endDate) return false;

          return true;
        });

        allMessages.push(...filteredMessages);

        if (messages.length < limit) break;
        if (allMessages.length >= this.MAX_MESSAGES) break;

        offset += limit;
      }

      // Sort by date (oldest first for export)
      allMessages.sort((a, b) =>
        new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime()
      );

      return allMessages;
    } catch (error: any) {
      logger.error('Failed to get messages for export:', error);
      throw error;
    }
  }

  /**
   * Export as JSON
   */
  private async exportAsJson(
    messages: Message[],
    conversation: any,
    includeMedia: boolean
  ): Promise<string> {
    const exportData = {
      conversation: {
        id: conversation.id,
        participants: conversation.participantIds,
        createdAt: conversation.createdAt,
        exportedAt: new Date(),
      },
      messages: messages.map(msg => ({
        id: msg.id,
        senderId: msg.senderId,
        receiverId: msg.receiverId,
        content: msg.content,
        type: msg.type,
        sentAt: msg.sentAt,
        status: msg.status,
        replyTo: msg.replyTo,
        metadata: includeMedia ? msg.metadata : undefined,
      })),
      totalMessages: messages.length,
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Export as plain text
   */
  private async exportAsText(messages: Message[], conversation: any): Promise<string> {
    let text = `Chat Conversation Export\n`;
    text += `Conversation ID: ${conversation.id}\n`;
    text += `Exported: ${new Date().toLocaleString()}\n`;
    text += `Total Messages: ${messages.length}\n`;
    text += `${'='.repeat(80)}\n\n`;

    for (const msg of messages) {
      const date = new Date(msg.sentAt).toLocaleString();
      const sender = msg.senderId === conversation.participant1Id ? 'User 1' : 'User 2';

      text += `[${date}] ${sender}: `;

      if (msg.type === 'text') {
        text += msg.content;
      } else {
        text += `[${msg.type.toUpperCase()} MESSAGE]`;
        if (msg.metadata?.mediaUrl) {
          text += ` - ${msg.metadata.mediaUrl}`;
        }
      }

      text += '\n';
    }

    return text;
  }

  /**
   * Export as PDF
   */
  private async exportAsPdf(messages: Message[], conversation: any): Promise<Buffer> {
    // TODO: Implement PDF generation using pdfkit or puppeteer
    throw new Error('PDF export not implemented - requires pdfkit or puppeteer integration');
  }

  /**
   * Upload export file to storage
   */
  private async uploadExport(
    data: string | Buffer,
    exportId: string,
    format: string
  ): Promise<string> {
    try {
      // TODO: Implement Azure Blob Storage or S3 upload
      throw new Error('Export storage not configured - Azure Blob Storage or S3 integration required');
    } catch (error: any) {
      logger.error('Failed to upload export:', error);
      throw new Error('Failed to upload export file');
    }
  }

  /**
   * Get export by ID
   */
  async getExport(exportId: string, userId: string): Promise<ChatExportResult | null> {
    try {
      // Try cache first
      const cached = await this.getCachedExportResult(exportId, userId);
      if (cached) {
        logger.debug('Export found in cache', { exportId });
        return cached;
      }

      // Fetch from database
      const exportDoc = await chatExportRepository.findById(exportId, userId);
      if (!exportDoc) {
        logger.debug('Export not found', { exportId, userId });
        return null;
      }

      // Check if export is expired
      if (exportDoc.expiresAt && new Date(exportDoc.expiresAt) < new Date()) {
        logger.debug('Export has expired', { exportId });
        // Mark as expired if not already
        if (exportDoc.status !== 'expired') {
          await chatExportRepository.updateStatus(exportId, userId, 'expired');
        }
        return null;
      }

      // Only return completed exports
      if (exportDoc.status !== 'completed') {
        logger.debug('Export not yet completed', { exportId, status: exportDoc.status });
        // Return partial info for pending/processing exports
        return {
          exportId: exportDoc.id,
          url: '',
          expiresAt: exportDoc.expiresAt ? new Date(exportDoc.expiresAt) : new Date(),
          format: exportDoc.format,
          fileSize: 0,
        };
      }

      const result: ChatExportResult = {
        exportId: exportDoc.id,
        url: exportDoc.url || '',
        expiresAt: new Date(exportDoc.expiresAt!),
        format: exportDoc.format,
        fileSize: exportDoc.fileSize || 0,
      };

      // Cache for future requests
      await this.cacheExportResult(exportId, userId, result);

      return result;
    } catch (error: any) {
      logger.error('Failed to get export:', error);
      throw error;
    }
  }

  /**
   * Get export status
   */
  async getExportStatus(exportId: string, userId: string): Promise<{
    status: string;
    errorMessage?: string;
    progress?: number;
  } | null> {
    try {
      const exportDoc = await chatExportRepository.findById(exportId, userId);
      if (!exportDoc) {
        return null;
      }

      return {
        status: exportDoc.status,
        errorMessage: exportDoc.errorMessage,
        progress: exportDoc.status === 'completed' ? 100 :
                  exportDoc.status === 'processing' ? 50 :
                  exportDoc.status === 'pending' ? 0 : undefined,
      };
    } catch (error: any) {
      logger.error('Failed to get export status:', error);
      throw error;
    }
  }

  /**
   * Get user's export history
   */
  async getExportHistory(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<ChatExportDocument[]> {
    try {
      return await chatExportRepository.getExportsByUser(userId, limit, offset);
    } catch (error: any) {
      logger.error('Failed to get export history:', error);
      throw error;
    }
  }

  /**
   * Get exports for a specific conversation
   */
  async getConversationExports(
    userId: string,
    conversationId: string,
    limit: number = 20
  ): Promise<ChatExportDocument[]> {
    try {
      return await chatExportRepository.getExportsByConversation(userId, conversationId, limit);
    } catch (error: any) {
      logger.error('Failed to get conversation exports:', error);
      throw error;
    }
  }

  /**
   * Delete expired exports
   */
  async cleanupExpiredExports(): Promise<number> {
    try {
      logger.info('Starting expired export cleanup');

      // Get expired exports
      const expiredExports = await chatExportRepository.getExpiredExports(100);

      if (expiredExports.length === 0) {
        logger.info('No expired exports to clean up');
        return 0;
      }

      logger.info(`Found ${expiredExports.length} expired exports to clean up`);

      let cleanedCount = 0;

      for (const exportDoc of expiredExports) {
        try {
          // TODO: Delete file from storage (Azure Blob/S3) when implemented
          // await this.deleteExportFile(exportDoc.url);

          // Mark as expired in database
          await chatExportRepository.updateStatus(exportDoc.id, exportDoc.userId, 'expired');

          // Clear from cache
          const cacheKey = `export:${exportDoc.userId}:${exportDoc.id}`;
          await redisClient.del(cacheKey);

          cleanedCount++;
        } catch (error: any) {
          logger.error(`Failed to cleanup export ${exportDoc.id}:`, error);
        }
      }

      logger.info(`Cleaned up ${cleanedCount} expired exports`);
      return cleanedCount;
    } catch (error: any) {
      logger.error('Failed to cleanup exports:', error);
      return 0;
    }
  }

  /**
   * Delete a specific export
   */
  async deleteExport(exportId: string, userId: string): Promise<boolean> {
    try {
      const exportDoc = await chatExportRepository.findById(exportId, userId);
      if (!exportDoc) {
        return false;
      }

      // TODO: Delete file from storage (Azure Blob/S3) when implemented
      // if (exportDoc.url) {
      //   await this.deleteExportFile(exportDoc.url);
      // }

      // Delete from database
      await chatExportRepository.delete(exportId, userId);

      // Clear from cache
      const cacheKey = `export:${userId}:${exportId}`;
      await redisClient.del(cacheKey);

      logger.info('Export deleted', { exportId, userId });
      return true;
    } catch (error: any) {
      logger.error('Failed to delete export:', error);
      throw error;
    }
  }

  /**
   * Get export statistics
   */
  async getExportStats(userId: string): Promise<{
    totalExports: number;
    exportsThisMonth: number;
    storageUsed: number;
  }> {
    try {
      const stats = await chatExportRepository.getExportStatistics(userId);
      return {
        totalExports: stats.totalExports,
        exportsThisMonth: stats.exportsThisMonth,
        storageUsed: stats.storageUsed,
      };
    } catch (error: any) {
      logger.error('Failed to get export statistics:', error);
      throw error;
    }
  }

  /**
   * Get detailed export statistics for a user
   */
  async getDetailedExportStats(userId: string): Promise<ExportStatistics> {
    try {
      return await chatExportRepository.getExportStatistics(userId);
    } catch (error: any) {
      logger.error('Failed to get detailed export statistics:', error);
      throw error;
    }
  }

  /**
   * Get global export statistics (admin use)
   */
  async getGlobalExportStats(): Promise<{
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
  }> {
    try {
      return await chatExportRepository.getGlobalExportStatistics();
    } catch (error: any) {
      logger.error('Failed to get global export statistics:', error);
      throw error;
    }
  }

  /**
   * Get recent exports (admin monitoring)
   */
  async getRecentExports(limit: number = 50): Promise<ChatExportDocument[]> {
    try {
      return await chatExportRepository.getRecentExports(limit);
    } catch (error: any) {
      logger.error('Failed to get recent exports:', error);
      throw error;
    }
  }

  /**
   * Get max messages limit
   */
  getMaxMessagesLimit(): number {
    return this.MAX_MESSAGES;
  }

  /**
   * Get export expiry time
   */
  getExportExpiryHours(): number {
    return this.EXPORT_EXPIRY_HOURS;
  }
}

export const chatExportService = new ChatExportService();
export default chatExportService;
