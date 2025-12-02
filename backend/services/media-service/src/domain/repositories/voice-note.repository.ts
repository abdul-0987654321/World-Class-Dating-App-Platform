import { Knex } from 'knex';
import db from '../../infrastructure/database/connection';
import { ModerationStatus } from '../../types';
import { VoiceNoteMetadata } from '../services/voice-note.service';
import { createLogger } from '@flamoral/shared';

const logger = createLogger('voice-note-repository');

export class VoiceNoteRepository {
  private db: Knex;

  constructor(database: Knex = db) {
    this.db = database;
  }

  async create(voiceNote: VoiceNoteMetadata): Promise<VoiceNoteMetadata> {
    try {
      const [created] = await this.db('voice_notes')
        .insert({
          id: voiceNote.id,
          user_id: voiceNote.userId,
          file_name: voiceNote.fileName,
          original_name: voiceNote.originalName,
          mime_type: voiceNote.mimeType,
          size: voiceNote.size,
          duration: voiceNote.duration,
          url: voiceNote.url,
          waveform_data: JSON.stringify(voiceNote.waveformData),
          context: voiceNote.context,
          prompt_id: voiceNote.promptId,
          conversation_id: voiceNote.conversationId,
          moderation_status: voiceNote.moderationStatus,
          uploaded_at: voiceNote.uploadedAt,
          updated_at: voiceNote.updatedAt,
        })
        .returning('*');

      return this.mapToVoiceNoteMetadata(created);
    } catch (error) {
      logger.error('Failed to create voice note record', error);
      throw error;
    }
  }

  async findById(id: string): Promise<VoiceNoteMetadata | null> {
    try {
      const voiceNote = await this.db('voice_notes').where({ id }).first();
      return voiceNote ? this.mapToVoiceNoteMetadata(voiceNote) : null;
    } catch (error) {
      logger.error('Failed to find voice note by ID', error);
      throw error;
    }
  }

  async findByUserId(userId: string): Promise<VoiceNoteMetadata[]> {
    try {
      const voiceNotes = await this.db('voice_notes')
        .where({ user_id: userId })
        .orderBy('uploaded_at', 'desc');

      return voiceNotes.map(this.mapToVoiceNoteMetadata);
    } catch (error) {
      logger.error('Failed to find voice notes by user ID', error);
      throw error;
    }
  }

  async findByUserIdAndContext(userId: string, context: string): Promise<VoiceNoteMetadata[]> {
    try {
      const voiceNotes = await this.db('voice_notes')
        .where({ user_id: userId, context })
        .orderBy('uploaded_at', 'desc');

      return voiceNotes.map(this.mapToVoiceNoteMetadata);
    } catch (error) {
      logger.error('Failed to find voice notes by user ID and context', error);
      throw error;
    }
  }

  async findByConversationId(conversationId: string): Promise<VoiceNoteMetadata[]> {
    try {
      const voiceNotes = await this.db('voice_notes')
        .where({ conversation_id: conversationId })
        .orderBy('uploaded_at', 'asc');

      return voiceNotes.map(this.mapToVoiceNoteMetadata);
    } catch (error) {
      logger.error('Failed to find voice notes by conversation ID', error);
      throw error;
    }
  }

  async findByPromptId(promptId: string, userId: string): Promise<VoiceNoteMetadata[]> {
    try {
      const voiceNotes = await this.db('voice_notes')
        .where({ prompt_id: promptId, user_id: userId })
        .orderBy('uploaded_at', 'desc');

      return voiceNotes.map(this.mapToVoiceNoteMetadata);
    } catch (error) {
      logger.error('Failed to find voice notes by prompt ID', error);
      throw error;
    }
  }

  async update(id: string, updates: Partial<VoiceNoteMetadata>): Promise<VoiceNoteMetadata | null> {
    try {
      const updateData: any = { updated_at: new Date() };

      if (updates.moderationStatus !== undefined) {
        updateData.moderation_status = updates.moderationStatus;
      }

      const [updated] = await this.db('voice_notes')
        .where({ id })
        .update(updateData)
        .returning('*');

      return updated ? this.mapToVoiceNoteMetadata(updated) : null;
    } catch (error) {
      logger.error('Failed to update voice note record', error);
      throw error;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const deleted = await this.db('voice_notes').where({ id }).del();
      return deleted > 0;
    } catch (error) {
      logger.error('Failed to delete voice note record', error);
      throw error;
    }
  }

  private mapToVoiceNoteMetadata(record: any): VoiceNoteMetadata {
    return {
      id: record.id,
      userId: record.user_id,
      fileName: record.file_name,
      originalName: record.original_name,
      mimeType: record.mime_type,
      size: record.size,
      duration: record.duration,
      url: record.url,
      waveformData: typeof record.waveform_data === 'string'
        ? JSON.parse(record.waveform_data)
        : record.waveform_data,
      context: record.context,
      promptId: record.prompt_id,
      conversationId: record.conversation_id,
      moderationStatus: record.moderation_status,
      uploadedAt: new Date(record.uploaded_at),
      updatedAt: new Date(record.updated_at),
    };
  }
}

export default new VoiceNoteRepository();
