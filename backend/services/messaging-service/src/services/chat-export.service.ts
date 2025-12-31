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
   * Uses simple PDF generation without external dependencies
   */
  private async exportAsPdf(messages: Message[], conversation: any): Promise<Buffer> {
    // PDF generation using raw PDF format
    // This creates a simple but valid PDF without external dependencies
    const textContent = await this.exportAsText(messages, conversation);
    return this.generateSimplePdf(textContent, conversation.id);
  }

  /**
   * Generate a simple PDF document
   * Creates a valid PDF 1.4 document without external libraries
   */
  private generateSimplePdf(content: string, title: string): Buffer {
    const lines = content.split('\n');
    const pageWidth = 612; // Letter width in points
    const pageHeight = 792; // Letter height in points
    const margin = 50;
    const lineHeight = 14;
    const fontSize = 10;
    const maxCharsPerLine = 85;
    const maxLinesPerPage = Math.floor((pageHeight - 2 * margin) / lineHeight);

    // Word wrap and prepare lines
    const wrappedLines: string[] = [];
    for (const line of lines) {
      if (line.length <= maxCharsPerLine) {
        wrappedLines.push(line);
      } else {
        // Word wrap long lines
        let remaining = line;
        while (remaining.length > 0) {
          if (remaining.length <= maxCharsPerLine) {
            wrappedLines.push(remaining);
            break;
          }
          let breakPoint = remaining.lastIndexOf(' ', maxCharsPerLine);
          if (breakPoint === -1 || breakPoint < maxCharsPerLine / 2) {
            breakPoint = maxCharsPerLine;
          }
          wrappedLines.push(remaining.substring(0, breakPoint));
          remaining = remaining.substring(breakPoint).trimStart();
        }
      }
    }

    // Calculate number of pages
    const numPages = Math.ceil(wrappedLines.length / maxLinesPerPage);

    // Build PDF structure
    const objects: string[] = [];
    let objectCount = 0;

    // Helper to escape PDF string
    const escapeString = (str: string): string => {
      return str
        .replace(/\\/g, '\\\\')
        .replace(/\(/g, '\\(')
        .replace(/\)/g, '\\)')
        .replace(/[\x00-\x1f]/g, '');
    };

    // Object 1: Catalog
    objectCount++;
    objects.push(`${objectCount} 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`);

    // Object 2: Pages
    objectCount++;
    const pageRefs = Array.from({ length: numPages }, (_, i) => `${i + 4} 0 R`).join(' ');
    objects.push(`${objectCount} 0 obj\n<< /Type /Pages /Kids [${pageRefs}] /Count ${numPages} >>\nendobj\n`);

    // Object 3: Font
    objectCount++;
    objects.push(`${objectCount} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>\nendobj\n`);

    // Create page objects and content streams
    let contentObjStart = 4 + numPages;
    for (let pageNum = 0; pageNum < numPages; pageNum++) {
      const startLine = pageNum * maxLinesPerPage;
      const endLine = Math.min(startLine + maxLinesPerPage, wrappedLines.length);
      const pageLines = wrappedLines.slice(startLine, endLine);

      // Build page content
      let streamContent = 'BT\n';
      streamContent += `/F1 ${fontSize} Tf\n`;
      streamContent += `${margin} ${pageHeight - margin} Td\n`;
      streamContent += `0 -${lineHeight} Td\n`;

      for (const line of pageLines) {
        const escapedLine = escapeString(line);
        streamContent += `(${escapedLine}) Tj\n`;
        streamContent += `0 -${lineHeight} Td\n`;
      }
      streamContent += 'ET\n';

      // Page object
      objectCount++;
      const contentRef = contentObjStart + pageNum;
      objects.push(
        `${objectCount} 0 obj\n` +
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] ` +
        `/Contents ${contentRef} 0 R /Resources << /Font << /F1 3 0 R >> >> >>\n` +
        `endobj\n`
      );
    }

    // Content stream objects
    for (let pageNum = 0; pageNum < numPages; pageNum++) {
      const startLine = pageNum * maxLinesPerPage;
      const endLine = Math.min(startLine + maxLinesPerPage, wrappedLines.length);
      const pageLines = wrappedLines.slice(startLine, endLine);

      let streamContent = 'BT\n';
      streamContent += `/F1 ${fontSize} Tf\n`;
      streamContent += `${margin} ${pageHeight - margin} Td\n`;

      for (const line of pageLines) {
        const escapedLine = escapeString(line);
        streamContent += `(${escapedLine}) Tj\n`;
        streamContent += `0 -${lineHeight} Td\n`;
      }
      streamContent += 'ET\n';

      objectCount++;
      objects.push(
        `${objectCount} 0 obj\n` +
        `<< /Length ${streamContent.length} >>\n` +
        `stream\n${streamContent}endstream\n` +
        `endobj\n`
      );
    }

    // Build PDF file
    let pdf = '%PDF-1.4\n%\xFF\xFF\xFF\xFF\n';
    const xref: number[] = [];

    for (const obj of objects) {
      xref.push(pdf.length);
      pdf += obj;
    }

    // Cross-reference table
    const xrefStart = pdf.length;
    pdf += 'xref\n';
    pdf += `0 ${objectCount + 1}\n`;
    pdf += '0000000000 65535 f \n';
    for (const offset of xref) {
      pdf += `${offset.toString().padStart(10, '0')} 00000 n \n`;
    }

    // Trailer
    pdf += 'trailer\n';
    pdf += `<< /Size ${objectCount + 1} /Root 1 0 R >>\n`;
    pdf += 'startxref\n';
    pdf += `${xrefStart}\n`;
    pdf += '%%EOF\n';

    return Buffer.from(pdf, 'binary');
  }

  /**
   * Upload export file to storage
   * Supports Azure Blob Storage, S3, or local file storage
   */
  private async uploadExport(
    data: string | Buffer,
    exportId: string,
    format: string
  ): Promise<string> {
    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf-8');
    const filename = `exports/${exportId}.${format}`;

    // Try Azure Blob Storage first
    const azureConnectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    const azureContainerName = process.env.AZURE_STORAGE_CONTAINER || 'chat-exports';

    if (azureConnectionString) {
      try {
        return await this.uploadToAzureBlob(buffer, filename, azureContainerName, azureConnectionString);
      } catch (error: any) {
        logger.warn('Azure Blob Storage upload failed, falling back to local storage:', error.message);
      }
    }

    // Try S3 if configured
    const s3Bucket = process.env.AWS_S3_BUCKET;
    const s3Region = process.env.AWS_REGION;

    if (s3Bucket && s3Region) {
      try {
        return await this.uploadToS3(buffer, filename, s3Bucket, s3Region);
      } catch (error: any) {
        logger.warn('S3 upload failed, falling back to local storage:', error.message);
      }
    }

    // Fall back to local storage (for development)
    return await this.uploadToLocalStorage(buffer, filename);
  }

  /**
   * Upload to Azure Blob Storage
   */
  private async uploadToAzureBlob(
    buffer: Buffer,
    filename: string,
    containerName: string,
    connectionString: string
  ): Promise<string> {
    // Dynamic import to avoid requiring the package if not used
    try {
      const { BlobServiceClient } = await import('@azure/storage-blob');
      const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
      const containerClient = blobServiceClient.getContainerClient(containerName);

      // Ensure container exists
      await containerClient.createIfNotExists({ access: 'blob' });

      const blockBlobClient = containerClient.getBlockBlobClient(filename);
      await blockBlobClient.uploadData(buffer, {
        blobHTTPHeaders: {
          blobContentType: this.getMimeType(filename),
        },
      });

      logger.info('Uploaded to Azure Blob Storage', { filename });
      return blockBlobClient.url;
    } catch (error: any) {
      if (error.code === 'MODULE_NOT_FOUND') {
        throw new Error('Azure Storage SDK not installed');
      }
      throw error;
    }
  }

  /**
   * Upload to S3
   */
  private async uploadToS3(
    buffer: Buffer,
    filename: string,
    bucket: string,
    region: string
  ): Promise<string> {
    try {
      const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
      const client = new S3Client({ region });

      await client.send(new PutObjectCommand({
        Bucket: bucket,
        Key: filename,
        Body: buffer,
        ContentType: this.getMimeType(filename),
      }));

      logger.info('Uploaded to S3', { filename, bucket });
      return `https://${bucket}.s3.${region}.amazonaws.com/${filename}`;
    } catch (error: any) {
      if (error.code === 'MODULE_NOT_FOUND') {
        throw new Error('AWS SDK not installed');
      }
      throw error;
    }
  }

  /**
   * Upload to local storage (development fallback)
   */
  private async uploadToLocalStorage(buffer: Buffer, filename: string): Promise<string> {
    const fs = await import('fs').then(m => m.promises);
    const path = await import('path');

    const exportDir = process.env.LOCAL_EXPORT_DIR || '/tmp/chat-exports';
    const fullPath = path.join(exportDir, filename);
    const dir = path.dirname(fullPath);

    // Ensure directory exists
    await fs.mkdir(dir, { recursive: true });

    // Write file
    await fs.writeFile(fullPath, buffer);

    logger.info('Saved to local storage', { path: fullPath });

    // Return a local URL or file path
    const baseUrl = process.env.LOCAL_EXPORT_URL || `file://${exportDir}`;
    return `${baseUrl}/${filename}`;
  }

  /**
   * Get MIME type from filename
   */
  private getMimeType(filename: string): string {
    if (filename.endsWith('.json')) return 'application/json';
    if (filename.endsWith('.txt')) return 'text/plain';
    if (filename.endsWith('.pdf')) return 'application/pdf';
    return 'application/octet-stream';
  }

  /**
   * Delete export file from storage
   */
  private async deleteExportFile(url: string): Promise<void> {
    if (!url) return;

    try {
      if (url.includes('blob.core.windows.net')) {
        await this.deleteFromAzureBlob(url);
      } else if (url.includes('s3.')) {
        await this.deleteFromS3(url);
      } else if (url.startsWith('file://') || url.includes('/tmp/')) {
        await this.deleteFromLocalStorage(url);
      }
    } catch (error: any) {
      logger.warn('Failed to delete export file:', error.message);
    }
  }

  private async deleteFromAzureBlob(url: string): Promise<void> {
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (!connectionString) return;

    try {
      const { BlobServiceClient } = await import('@azure/storage-blob');
      const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);

      // Parse URL to get container and blob name
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      if (pathParts.length < 2) return;

      const containerName = pathParts[0];
      const blobName = pathParts.slice(1).join('/');

      const containerClient = blobServiceClient.getContainerClient(containerName);
      const blobClient = containerClient.getBlobClient(blobName);
      await blobClient.deleteIfExists();

      logger.info('Deleted from Azure Blob Storage', { url });
    } catch (error: any) {
      logger.warn('Failed to delete from Azure:', error.message);
    }
  }

  private async deleteFromS3(url: string): Promise<void> {
    const bucket = process.env.AWS_S3_BUCKET;
    const region = process.env.AWS_REGION;
    if (!bucket || !region) return;

    try {
      const { S3Client, DeleteObjectCommand } = await import('@aws-sdk/client-s3');
      const client = new S3Client({ region });

      const urlObj = new URL(url);
      const key = urlObj.pathname.substring(1); // Remove leading /

      await client.send(new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      }));

      logger.info('Deleted from S3', { url });
    } catch (error: any) {
      logger.warn('Failed to delete from S3:', error.message);
    }
  }

  private async deleteFromLocalStorage(url: string): Promise<void> {
    try {
      const fs = await import('fs').then(m => m.promises);
      const filePath = url.replace('file://', '');
      await fs.unlink(filePath);
      logger.info('Deleted from local storage', { path: filePath });
    } catch (error: any) {
      logger.warn('Failed to delete local file:', error.message);
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
          // Delete file from storage
          if (exportDoc.url) {
            await this.deleteExportFile(exportDoc.url);
          }

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

      // Delete file from storage
      if (exportDoc.url) {
        await this.deleteExportFile(exportDoc.url);
      }

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
