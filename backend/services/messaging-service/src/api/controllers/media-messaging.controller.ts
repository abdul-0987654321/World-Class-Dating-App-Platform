/**
 * Media Messaging Controller
 * Handles photo sharing, voice messages, and media uploads for chat
 */

import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

import config from '../../config';
import { conversationRepository } from '../../domain/repositories/conversation.repository';
import { messageRepository } from '../../domain/repositories/message.repository';
import { messageEventsService } from '../../domain/services/message-events.service';
import { realtimeHttpClient } from '../../infrastructure/clients/realtime-http.client';
import { photoSharingService } from '../../services/photo-sharing.service';
import { voiceMessageService } from '../../services/voice-message.service';
import { Message, MessageType, MessageStatus } from '../../types';
import { createLogger } from '../../utils/logger';
import { AuthRequest } from '../middleware/auth.middleware';

const logger = createLogger('media-messaging-controller');

// Media service URL for S3 uploads
const MEDIA_SERVICE_URL = process.env.MEDIA_SERVICE_URL || 'http://media-service:3005';

export class MediaMessagingController {
  /**
   * POST /api/v1/conversations/:conversationId/messages/photo
   * Upload and send a photo message
   */
  async sendPhotoMessage(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user.userId;
      const { conversationId } = req.params;
      const file = req.file;

      if (!file) {
        return res.status(400).json({
          success: false,
          error: 'No photo file uploaded',
        });
      }

      // Validate conversation access
      const conversation = await conversationRepository.findById(conversationId);
      if (!conversation) {
        return res.status(404).json({
          success: false,
          error: 'Conversation not found',
        });
      }

      if (conversation.participant1Id !== userId && conversation.participant2Id !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to send messages in this conversation',
        });
      }

      // Validate photo
      const validation = photoSharingService.validatePhoto({
        size: file.size,
        mimeType: file.mimetype,
      });

      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          error: validation.error,
        });
      }

      // Sanitize EXIF data for privacy
      const sanitizedBuffer = await photoSharingService.sanitizeExifData(file.buffer);

      // Optimize for web delivery
      const { buffer: optimizedBuffer, mimeType: optimizedMimeType } =
        await photoSharingService.optimizeForWeb(sanitizedBuffer, file.mimetype);

      // Generate thumbnail
      const thumbnail = await photoSharingService.generateThumbnail(
        optimizedBuffer,
        optimizedMimeType
      );

      // Get image dimensions
      const dimensions = await photoSharingService.getImageDimensions(optimizedBuffer);

      // Generate unique file names
      const fileId = uuidv4();
      const extension = optimizedMimeType === 'image/webp' ? 'webp' : file.mimetype.split('/')[1];
      const fileName = `photos/${conversationId}/${fileId}.${extension}`;
      const thumbnailName = `photos/${conversationId}/${fileId}_thumb.webp`;

      // Upload to storage (integrate with media-service)
      const uploadResult = await this.uploadToStorage(optimizedBuffer, fileName, optimizedMimeType);

      const thumbnailResult = await this.uploadToStorage(
        thumbnail.buffer,
        thumbnailName,
        'image/webp'
      );

      // Get the other participant
      const receiverId = conversationRepository.getOtherParticipant(conversation, userId);

      // Create message
      const message: Message = {
        id: uuidv4(),
        conversationId,
        senderId: userId,
        receiverId,
        content: '[Photo]',
        type: MessageType.IMAGE,
        status: MessageStatus.SENT,
        sentAt: new Date(),
        metadata: {
          mediaUrl: uploadResult.url,
          thumbnailUrl: thumbnailResult.url,
          fileSize: optimizedBuffer.length,
          mimeType: optimizedMimeType,
        },
      };

      const createdMessage = await messageRepository.create(message);

      // Update conversation
      await conversationRepository.updateLastMessage(conversationId, new Date(), '[Photo]');

      // Increment unread count for receiver
      await conversationRepository.incrementUnreadCount(conversationId, receiverId);

      // Publish to realtime service
      await Promise.all([
        realtimeHttpClient.publishMessage({
          conversationId,
          messageId: createdMessage.id,
          senderId: userId,
          receiverId,
          content: '[Photo]',
          type: MessageType.IMAGE,
          metadata: createdMessage.metadata,
        }),
        messageEventsService.publishNewMessage(createdMessage),
      ]);

      logger.info(`Photo message sent: ${createdMessage.id} in conversation ${conversationId}`);

      return res.status(201).json({
        success: true,
        data: createdMessage,
        message: 'Photo sent successfully',
      });
    } catch (error: any) {
      logger.error('Failed to send photo message:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to send photo',
      });
    }
  }

  /**
   * POST /api/v1/conversations/:conversationId/messages/voice
   * Upload and send a voice message
   */
  async sendVoiceMessage(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user.userId;
      const { conversationId } = req.params;
      const file = req.file;

      if (!file) {
        return res.status(400).json({
          success: false,
          error: 'No audio file uploaded',
        });
      }

      // Validate conversation access
      const conversation = await conversationRepository.findById(conversationId);
      if (!conversation) {
        return res.status(404).json({
          success: false,
          error: 'Conversation not found',
        });
      }

      if (conversation.participant1Id !== userId && conversation.participant2Id !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to send messages in this conversation',
        });
      }

      // Validate voice message
      const validation = voiceMessageService.validateVoiceMessage({
        size: file.size,
        mimeType: file.mimetype,
      });

      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          error: validation.error,
        });
      }

      // Get audio duration
      const duration = await voiceMessageService.getAudioDuration(file.buffer, file.mimetype);

      // Validate duration
      const durationValidation = voiceMessageService.validateVoiceMessage({
        size: file.size,
        mimeType: file.mimetype,
        duration,
      });

      if (!durationValidation.valid) {
        return res.status(400).json({
          success: false,
          error: durationValidation.error,
        });
      }

      // Compress voice message
      const { buffer: compressedBuffer, mimeType: compressedMimeType } =
        await voiceMessageService.compressVoiceMessage(file.buffer, file.mimetype);

      // Generate waveform data for visualization
      const waveform = await voiceMessageService.generateWaveform(compressedBuffer);

      // Generate unique file name
      const fileId = uuidv4();
      const fileName = `voice/${conversationId}/${fileId}.mp3`;

      // Upload to storage
      const uploadResult = await this.uploadToStorage(
        compressedBuffer,
        fileName,
        compressedMimeType
      );

      // Optionally transcribe voice message
      let transcription: string | null = null;
      if (config.mediaProcessing.voice.enableTranscription) {
        transcription = await voiceMessageService.transcribeVoiceMessage(
          compressedBuffer,
          compressedMimeType
        );
      }

      // Get the other participant
      const receiverId = conversationRepository.getOtherParticipant(conversation, userId);

      // Create message
      const message: Message = {
        id: uuidv4(),
        conversationId,
        senderId: userId,
        receiverId,
        content: transcription || '[Voice Message]',
        type: MessageType.VOICE,
        status: MessageStatus.SENT,
        sentAt: new Date(),
        metadata: {
          mediaUrl: uploadResult.url,
          duration,
          fileSize: compressedBuffer.length,
          mimeType: compressedMimeType,
        },
      };

      // Add waveform to metadata (stored separately for size)
      (message.metadata as any).waveform = waveform;

      const createdMessage = await messageRepository.create(message);

      // Update conversation
      const preview = transcription
        ? transcription.substring(0, 50) + (transcription.length > 50 ? '...' : '')
        : `[Voice Message ${voiceMessageService.formatDuration(duration)}]`;
      await conversationRepository.updateLastMessage(conversationId, new Date(), preview);

      // Increment unread count for receiver
      await conversationRepository.incrementUnreadCount(conversationId, receiverId);

      // Publish to realtime service
      await Promise.all([
        realtimeHttpClient.publishMessage({
          conversationId,
          messageId: createdMessage.id,
          senderId: userId,
          receiverId,
          content: message.content,
          type: MessageType.VOICE,
          metadata: createdMessage.metadata,
        }),
        messageEventsService.publishNewMessage(createdMessage),
      ]);

      logger.info(`Voice message sent: ${createdMessage.id} in conversation ${conversationId}`);

      return res.status(201).json({
        success: true,
        data: createdMessage,
        message: 'Voice message sent successfully',
      });
    } catch (error: any) {
      logger.error('Failed to send voice message:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to send voice message',
      });
    }
  }

  /**
   * GET /api/v1/media/upload-url
   * Get a pre-signed URL for direct upload
   */
  async getUploadUrl(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user.userId;
      const { conversationId, type, mimeType, fileName } = req.query;

      if (!conversationId || !type || !mimeType) {
        return res.status(400).json({
          success: false,
          error: 'conversationId, type, and mimeType are required',
        });
      }

      // Validate conversation access
      const conversation = await conversationRepository.findById(conversationId as string);
      if (!conversation) {
        return res.status(404).json({
          success: false,
          error: 'Conversation not found',
        });
      }

      if (conversation.participant1Id !== userId && conversation.participant2Id !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized',
        });
      }

      // Validate media type
      const validTypes = ['photo', 'voice', 'video'];
      if (!validTypes.includes(type as string)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid media type. Must be photo, voice, or video',
        });
      }

      // Generate unique file path
      const fileId = uuidv4();
      const extension = (mimeType as string).split('/')[1] || 'bin';
      const filePath = `${type}/${conversationId}/${fileId}.${extension}`;

      // Generate pre-signed upload URL (integrate with media service)
      const presignedUrl = await this.generatePresignedUploadUrl(filePath, mimeType as string);

      // Generate the final URL for the uploaded file
      const mediaUrl = await this.getMediaUrl(filePath);

      return res.status(200).json({
        success: true,
        data: {
          uploadUrl: presignedUrl,
          mediaUrl,
          filePath,
          expiresIn: 3600, // 1 hour
        },
      });
    } catch (error: any) {
      logger.error('Failed to get upload URL:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to get upload URL',
      });
    }
  }

  /**
   * GET /api/v1/media/supported-formats
   * Get supported media formats and limits
   */
  async getSupportedFormats(req: AuthRequest, res: Response): Promise<Response> {
    try {
      return res.status(200).json({
        success: true,
        data: {
          photo: {
            formats: photoSharingService.getSupportedFormats(),
            maxFileSize: photoSharingService.getMaxFileSize(),
            maxFileSizeMB: photoSharingService.getMaxFileSize() / (1024 * 1024),
            thumbnailDimensions: photoSharingService.getThumbnailDimensions(),
          },
          voice: {
            formats: voiceMessageService.getSupportedFormats(),
            maxFileSize: voiceMessageService.getMaxFileSize(),
            maxFileSizeMB: voiceMessageService.getMaxFileSize() / (1024 * 1024),
            maxDuration: voiceMessageService.getMaxDuration(),
            maxDurationFormatted: `${Math.floor(voiceMessageService.getMaxDuration() / 60)}:${(voiceMessageService.getMaxDuration() % 60).toString().padStart(2, '0')}`,
          },
        },
      });
    } catch (error: any) {
      logger.error('Failed to get supported formats:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get supported formats',
      });
    }
  }

  /**
   * Upload file to storage via media service
   */
  private async uploadToStorage(
    buffer: Buffer,
    filePath: string,
    mimeType: string
  ): Promise<{ url: string; key: string }> {
    // In production, this would call the media service API
    // For now, we'll generate a mock URL
    const baseUrl = process.env.CDN_URL || 'https://cdn.flamoral.com';
    const url = `${baseUrl}/${filePath}`;

    logger.info(`Uploaded file to: ${url}`);

    return {
      url,
      key: filePath,
    };
  }

  /**
   * Generate presigned upload URL
   */
  private async generatePresignedUploadUrl(filePath: string, mimeType: string): Promise<string> {
    // In production, this would call the media service API to get a presigned S3 URL
    const baseUrl = process.env.UPLOAD_URL || 'https://upload.flamoral.com';
    return `${baseUrl}/${filePath}?mimeType=${encodeURIComponent(mimeType)}`;
  }

  /**
   * Get public URL for media file
   */
  private async getMediaUrl(filePath: string): Promise<string> {
    const baseUrl = process.env.CDN_URL || 'https://cdn.flamoral.com';
    return `${baseUrl}/${filePath}`;
  }
}

export const mediaMessagingController = new MediaMessagingController();
export default mediaMessagingController;
