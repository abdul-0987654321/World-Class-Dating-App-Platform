import { Router } from 'express';
import voiceNoteController from '../controllers/voice-note.controller';
import { authenticate } from '../middleware/auth.middleware';
import { upload } from '../middleware/upload.middleware';

const router = Router();

/**
 * @swagger
 * /api/media/voice-notes/upload:
 *   post:
 *     summary: Upload a voice note
 *     tags: [VoiceNote]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - audio
 *             properties:
 *               audio:
 *                 type: string
 *                 format: binary
 *                 description: Audio file (MP3, WAV, M4A, max 10MB, up to 60 seconds)
 *               context:
 *                 type: string
 *                 enum: [profile, prompt, message]
 *                 default: message
 *                 description: Context of the voice note
 *               promptId:
 *                 type: string
 *                 description: Prompt ID (required if context is 'prompt')
 *               conversationId:
 *                 type: string
 *                 description: Conversation ID (required if context is 'message')
 *     responses:
 *       201:
 *         description: Voice note uploaded successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/upload',
  authenticate,
  upload.single('audio'),
  voiceNoteController.uploadVoiceNote.bind(voiceNoteController)
);

/**
 * @swagger
 * /api/media/voice-notes:
 *   get:
 *     summary: Get current user's voice notes
 *     tags: [VoiceNote]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: context
 *         schema:
 *           type: string
 *           enum: [profile, prompt, message]
 *         description: Filter by context
 *     responses:
 *       200:
 *         description: Voice notes retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/', authenticate, voiceNoteController.getUserVoiceNotes.bind(voiceNoteController));

/**
 * @swagger
 * /api/media/voice-notes/{id}:
 *   get:
 *     summary: Get a specific voice note
 *     tags: [VoiceNote]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Voice note ID
 *     responses:
 *       200:
 *         description: Voice note retrieved successfully
 *       404:
 *         description: Voice note not found
 */
router.get('/:id', voiceNoteController.getVoiceNote.bind(voiceNoteController));

/**
 * @swagger
 * /api/media/voice-notes/conversation/{conversationId}:
 *   get:
 *     summary: Get voice notes for a conversation
 *     tags: [VoiceNote]
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Conversation ID
 *     responses:
 *       200:
 *         description: Conversation voice notes retrieved successfully
 */
router.get('/conversation/:conversationId', voiceNoteController.getConversationVoiceNotes.bind(voiceNoteController));

/**
 * @swagger
 * /api/media/voice-notes/profile/{userId}:
 *   get:
 *     summary: Get user's profile voice intro
 *     tags: [VoiceNote]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: Profile voice intro retrieved successfully
 *       404:
 *         description: Profile voice intro not found
 */
router.get('/profile/:userId', voiceNoteController.getUserProfileVoice.bind(voiceNoteController));

/**
 * @swagger
 * /api/media/voice-notes/{id}:
 *   delete:
 *     summary: Delete a voice note
 *     tags: [VoiceNote]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Voice note ID
 *     responses:
 *       200:
 *         description: Voice note deleted successfully
 *       403:
 *         description: Forbidden - Not voice note owner
 *       404:
 *         description: Voice note not found
 */
router.delete('/:id', authenticate, voiceNoteController.deleteVoiceNote.bind(voiceNoteController));

export default router;
