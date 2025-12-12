import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '../utils/logger';
import { messageRepository } from '../domain/repositories/message.repository';
import { conversationRepository } from '../domain/repositories/conversation.repository';
import { ChatExportRequest, ChatExportResult } from '../types/enhanced-types';
import { Message } from '../types';

const logger = createLogger('chat-export-service');

export class ChatExportService {
  private readonly EXPORT_EXPIRY_HOURS = 24;
  private readonly MAX_MESSAGES = 10000;

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
      const exportId = uuidv4();
      const url = await this.uploadExport(exportData, exportId, format);

      // Calculate expiry time
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + this.EXPORT_EXPIRY_HOURS);

      const result: ChatExportResult = {
        exportId,
        url,
        expiresAt,
        format,
        fileSize: Buffer.byteLength(exportData),
      };

      logger.info('Chat export completed', {
        exportId,
        format,
        fileSize: result.fileSize,
      });

      return result;
    } catch (error: any) {
      logger.error('Failed to export chat:', error);
      throw error;
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
    // In production, use a library like 'pdfkit' or 'puppeteer' to generate PDF
    // For now, return text as buffer
    const textExport = await this.exportAsText(messages, conversation);
    return Buffer.from(textExport);
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
      // In production, upload to Azure Blob Storage or S3
      // For now, return a mock URL
      const mockUrl = `https://storage.flamoral.com/exports/${exportId}.${format}`;

      logger.info('Export uploaded', { exportId, format });

      return mockUrl;
    } catch (error: any) {
      logger.error('Failed to upload export:', error);
      throw new Error('Failed to upload export file');
    }
  }

  /**
   * Get export by ID
   */
  async getExport(exportId: string, userId: string): Promise<ChatExportResult | null> {
    // In production, retrieve from database/cache
    // For now, return null
    return null;
  }

  /**
   * Delete expired exports
   */
  async cleanupExpiredExports(): Promise<number> {
    try {
      // In production, delete expired exports from storage
      // This would be run as a scheduled job
      logger.info('Cleaning up expired exports');
      return 0;
    } catch (error: any) {
      logger.error('Failed to cleanup exports:', error);
      return 0;
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
    // In production, get actual stats from database
    return {
      totalExports: 0,
      exportsThisMonth: 0,
      storageUsed: 0,
    };
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
