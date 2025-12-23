import { v4 as uuidv4 } from 'uuid';
import audioProcessingService from './audio-processing.service';
import azureStorageService from '../../infrastructure/storage/azure-storage.service';
import { UploadedFile, ModerationStatus } from '../../types';
import { createLogger } from '@flamoral/backend-shared';
import voiceNoteRepository from '../repositories/voice-note.repository';

const logger = createLogger('voice-note-service');

export interface VoiceNoteMetadata {
  id: string;
  userId: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  duration: number;
  url: string;
  waveformData: {
    samples: number[];
    duration: number;
    sampleRate: number;
    peaks: number[];
  };
  context: 'profile' | 'prompt' | 'message';
  promptId?: string; // For voice prompt responses
  conversationId?: string; // For voice messages
  moderationStatus: ModerationStatus;
  uploadedAt: Date;
  updatedAt: Date;
}

export class VoiceNoteService {
  /**
   * Upload and process a voice note
   */
  async uploadVoiceNote(
    file: UploadedFile,
    userId: string,
    context: 'profile' | 'prompt' | 'message',
    options?: { promptId?: string; conversationId?: string }
  ): Promise<VoiceNoteMetadata> {
    try {
      logger.info(`Uploading voice note for user ${userId}, context: ${context}`);

      // Step 1: Validate audio
      const validation = await audioProcessingService.validateAudio(
        file.buffer,
        file.mimetype,
        file.originalname
      );

      if (!validation.valid) {
        throw new Error(validation.error || 'Audio validation failed');
      }

      // Step 2: Process voice note (compress, normalize, trim, generate waveform)
      const processed = await audioProcessingService.processVoiceNote(file.buffer);

      // Step 3: Upload compressed audio to Azure Storage
      const voiceNoteId = uuidv4();
      const fileName = `${voiceNoteId}-${file.originalname.replace(/\.[^/.]+$/, '')}.mp3`;

      const audioUrl = await azureStorageService.uploadBlob(
        processed.compressed,
        `voice-notes/${userId}/${context}/${fileName}`,
        'audio/mpeg'
      );

      // Step 4: Create voice note metadata
      const voiceNoteMetadata: VoiceNoteMetadata = {
        id: voiceNoteId,
        userId,
        fileName,
        originalName: file.originalname,
        mimeType: 'audio/mpeg',
        size: processed.compressed.length,
        duration: processed.metadata.duration,
        url: audioUrl,
        waveformData: processed.waveform,
        context,
        promptId: options?.promptId,
        conversationId: options?.conversationId,
        moderationStatus: ModerationStatus.PENDING,
        uploadedAt: new Date(),
        updatedAt: new Date(),
      };

      // Step 5: Save to database
      const savedVoiceNote = await voiceNoteRepository.create(voiceNoteMetadata);

      // Step 6: Start content moderation (async - don't wait)
      this.moderateVoiceNoteAsync(savedVoiceNote);

      logger.info(`Voice note uploaded successfully: ${voiceNoteId}`);
      return savedVoiceNote;
    } catch (error) {
      logger.error('Voice note upload failed', error);
      throw error;
    }
  }

  /**
   * Moderate voice note asynchronously
   */
  private async moderateVoiceNoteAsync(voiceNote: VoiceNoteMetadata): Promise<void> {
    try {
      logger.info(`Starting moderation for voice note ${voiceNote.id}`);

      // For now, auto-approve voice notes
      // In production, you could use speech-to-text and text moderation
      await voiceNoteRepository.update(voiceNote.id, {
        moderationStatus: ModerationStatus.APPROVED,
      });

      logger.info(`Voice note moderation complete for ${voiceNote.id}: APPROVED`);
    } catch (error) {
      logger.error('Voice note moderation failed', error);
    }
  }

  /**
   * Delete a voice note
   */
  async deleteVoiceNote(voiceNoteId: string, url: string): Promise<boolean> {
    try {
      logger.info(`Deleting voice note: ${voiceNoteId}`);

      // Delete from Azure Storage
      await azureStorageService.deleteBlob(url);

      // Delete from database
      await voiceNoteRepository.delete(voiceNoteId);

      logger.info(`Voice note deleted successfully: ${voiceNoteId}`);
      return true;
    } catch (error) {
      logger.error('Voice note deletion failed', error);
      throw error;
    }
  }

  /**
   * Get user's voice notes
   */
  async getUserVoiceNotes(
    userId: string,
    context?: 'profile' | 'prompt' | 'message'
  ): Promise<VoiceNoteMetadata[]> {
    try {
      logger.info(`Retrieving voice notes for user: ${userId}, context: ${context}`);

      if (context) {
        return await voiceNoteRepository.findByUserIdAndContext(userId, context);
      }

      return await voiceNoteRepository.findByUserId(userId);
    } catch (error) {
      logger.error('Failed to retrieve user voice notes', error);
      throw error;
    }
  }

  /**
   * Get a specific voice note
   */
  async getVoiceNote(voiceNoteId: string): Promise<VoiceNoteMetadata | null> {
    try {
      logger.info(`Retrieving voice note: ${voiceNoteId}`);
      return await voiceNoteRepository.findById(voiceNoteId);
    } catch (error) {
      logger.error('Failed to retrieve voice note', error);
      throw error;
    }
  }

  /**
   * Get voice notes for a conversation
   */
  async getConversationVoiceNotes(conversationId: string): Promise<VoiceNoteMetadata[]> {
    try {
      logger.info(`Retrieving voice notes for conversation: ${conversationId}`);
      return await voiceNoteRepository.findByConversationId(conversationId);
    } catch (error) {
      logger.error('Failed to retrieve conversation voice notes', error);
      throw error;
    }
  }

  /**
   * Get voice prompt responses
   */
  async getPromptVoiceResponses(promptId: string, userId: string): Promise<VoiceNoteMetadata[]> {
    try {
      logger.info(`Retrieving voice responses for prompt: ${promptId}, user: ${userId}`);
      return await voiceNoteRepository.findByPromptId(promptId, userId);
    } catch (error) {
      logger.error('Failed to retrieve prompt voice responses', error);
      throw error;
    }
  }

  /**
   * Get user's profile voice intro
   */
  async getUserProfileVoice(userId: string): Promise<VoiceNoteMetadata | null> {
    try {
      logger.info(`Retrieving profile voice for user: ${userId}`);
      const voiceNotes = await voiceNoteRepository.findByUserIdAndContext(userId, 'profile');
      return voiceNotes.find(v => v.moderationStatus === ModerationStatus.APPROVED) || null;
    } catch (error) {
      logger.error('Failed to retrieve profile voice', error);
      throw error;
    }
  }

  /**
   * Update voice note metadata
   */
  async updateVoiceNote(
    voiceNoteId: string,
    updates: Partial<VoiceNoteMetadata>
  ): Promise<boolean> {
    try {
      logger.info(`Updating voice note ${voiceNoteId}`);
      await voiceNoteRepository.update(voiceNoteId, updates);
      return true;
    } catch (error) {
      logger.error('Failed to update voice note', error);
      throw error;
    }
  }

  /**
   * Generate waveform for existing audio URL
   */
  async generateWaveformFromUrl(audioUrl: string): Promise<{
    samples: number[];
    duration: number;
    sampleRate: number;
    peaks: number[];
  }> {
    try {
      logger.info(`Generating waveform for audio URL: ${audioUrl}`);

      // Download audio from URL
      const audioBuffer = await azureStorageService.downloadBlob(audioUrl);

      // Generate waveform
      const waveform = await audioProcessingService.generateWaveform(audioBuffer);

      return waveform;
    } catch (error) {
      logger.error('Failed to generate waveform from URL', error);
      throw error;
    }
  }
}

export default new VoiceNoteService();
