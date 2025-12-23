import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import voiceNoteService from '../../domain/services/voice-note.service';
import { UploadedFile } from '../../types';
import { createLogger } from '@flamoral/backend-shared';

const logger = createLogger('voice-note-controller');

export class VoiceNoteController {
  /**
   * Upload a voice note
   * POST /api/media/voice-notes/upload
   */
  async uploadVoiceNote(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No audio file uploaded',
        });
      }

      const userId = req.user.userId;
      const context = (req.body.context || 'message') as 'profile' | 'prompt' | 'message';
      const promptId = req.body.promptId;
      const conversationId = req.body.conversationId;

      const file: UploadedFile = {
        fieldname: req.file.fieldname,
        originalname: req.file.originalname,
        encoding: req.file.encoding,
        mimetype: req.file.mimetype,
        buffer: req.file.buffer,
        size: req.file.size,
      };

      const voiceNote = await voiceNoteService.uploadVoiceNote(file, userId, context, {
        promptId,
        conversationId,
      });

      logger.info(`Voice note uploaded successfully by user ${userId}`);

      return res.status(201).json({
        success: true,
        message: 'Voice note uploaded successfully',
        data: voiceNote,
      });
    } catch (error: any) {
      logger.error('Voice note upload failed', error);
      return res.status(400).json({
        success: false,
        error: error.message || 'Voice note upload failed',
      });
    }
  }

  /**
   * Get user's voice notes
   * GET /api/media/voice-notes
   */
  async getUserVoiceNotes(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
      }

      const userId = req.user.userId;
      const context = req.query.context as 'profile' | 'prompt' | 'message' | undefined;

      const voiceNotes = await voiceNoteService.getUserVoiceNotes(userId, context);

      return res.status(200).json({
        success: true,
        data: voiceNotes,
      });
    } catch (error: any) {
      logger.error('Failed to retrieve voice notes', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to retrieve voice notes',
      });
    }
  }

  /**
   * Get a specific voice note
   * GET /api/media/voice-notes/:id
   */
  async getVoiceNote(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const voiceNote = await voiceNoteService.getVoiceNote(id);

      if (!voiceNote) {
        return res.status(404).json({
          success: false,
          error: 'Voice note not found',
        });
      }

      return res.status(200).json({
        success: true,
        data: voiceNote,
      });
    } catch (error: any) {
      logger.error('Failed to retrieve voice note', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to retrieve voice note',
      });
    }
  }

  /**
   * Get voice notes for a conversation
   * GET /api/media/voice-notes/conversation/:conversationId
   */
  async getConversationVoiceNotes(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { conversationId } = req.params;
      const voiceNotes = await voiceNoteService.getConversationVoiceNotes(conversationId);

      return res.status(200).json({
        success: true,
        data: voiceNotes,
      });
    } catch (error: any) {
      logger.error('Failed to retrieve conversation voice notes', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to retrieve conversation voice notes',
      });
    }
  }

  /**
   * Get user's profile voice intro
   * GET /api/media/voice-notes/profile/:userId
   */
  async getUserProfileVoice(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { userId } = req.params;
      const voiceNote = await voiceNoteService.getUserProfileVoice(userId);

      if (!voiceNote) {
        return res.status(404).json({
          success: false,
          error: 'Profile voice intro not found',
        });
      }

      return res.status(200).json({
        success: true,
        data: voiceNote,
      });
    } catch (error: any) {
      logger.error('Failed to retrieve profile voice intro', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to retrieve profile voice intro',
      });
    }
  }

  /**
   * Delete a voice note
   * DELETE /api/media/voice-notes/:id
   */
  async deleteVoiceNote(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
      }

      const { id } = req.params;
      const voiceNote = await voiceNoteService.getVoiceNote(id);

      if (!voiceNote) {
        return res.status(404).json({
          success: false,
          error: 'Voice note not found',
        });
      }

      // Verify user owns the voice note
      if (voiceNote.userId !== req.user.userId) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden',
        });
      }

      const deleted = await voiceNoteService.deleteVoiceNote(id, voiceNote.url);

      if (deleted) {
        return res.status(200).json({
          success: true,
          message: 'Voice note deleted successfully',
        });
      }

      return res.status(500).json({
        success: false,
        error: 'Failed to delete voice note',
      });
    } catch (error: any) {
      logger.error('Failed to delete voice note', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to delete voice note',
      });
    }
  }
}

export default new VoiceNoteController();
