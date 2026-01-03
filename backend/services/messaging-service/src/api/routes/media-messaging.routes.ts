/**
 * Media Messaging Routes
 * Routes for photo sharing, voice messages, and media uploads
 */

import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth.middleware';
import { mediaMessagingController } from '../controllers/media-messaging.controller';
import config from '../../config';

const router = Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: Math.max(
      config.mediaProcessing.image.maxFileSize,
      config.mediaProcessing.voice.maxFileSize
    ),
  },
  fileFilter: (req, file, cb) => {
    // Accept images and audio
    const imageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const audioTypes = ['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/webm', 'audio/ogg'];
    const allowedTypes = [...imageTypes, ...audioTypes];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
  },
});

/**
 * @swagger
 * tags:
 *   name: Media Messaging
 *   description: Photo sharing, voice messages, and media uploads
 */

/**
 * @swagger
 * /api/v1/conversations/{conversationId}/messages/photo:
 *   post:
 *     summary: Send a photo message
 *     tags: [Media Messaging]
 *     security:
 *       - bearerAuth: []
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *       - in: formData
 *         name: photo
 *         type: file
 *         required: true
 *         description: Photo file to upload (JPEG, PNG, GIF, WebP)
 *     responses:
 *       201:
 *         description: Photo sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     type:
 *                       type: string
 *                       enum: [image]
 *                     metadata:
 *                       type: object
 *                       properties:
 *                         mediaUrl:
 *                           type: string
 *                         thumbnailUrl:
 *                           type: string
 *                         fileSize:
 *                           type: number
 *                         mimeType:
 *                           type: string
 *       400:
 *         description: Invalid file or file too large
 *       403:
 *         description: Not authorized to send in this conversation
 *       404:
 *         description: Conversation not found
 */
router.post(
  '/conversations/:conversationId/messages/photo',
  authenticate,
  upload.single('photo'),
  mediaMessagingController.sendPhotoMessage.bind(mediaMessagingController)
);

/**
 * @swagger
 * /api/v1/conversations/{conversationId}/messages/voice:
 *   post:
 *     summary: Send a voice message
 *     tags: [Media Messaging]
 *     security:
 *       - bearerAuth: []
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *       - in: formData
 *         name: voice
 *         type: file
 *         required: true
 *         description: Voice message file (MP3, M4A, WAV, WebM, OGG)
 *     responses:
 *       201:
 *         description: Voice message sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     type:
 *                       type: string
 *                       enum: [voice]
 *                     content:
 *                       type: string
 *                       description: Transcription if available
 *                     metadata:
 *                       type: object
 *                       properties:
 *                         mediaUrl:
 *                           type: string
 *                         duration:
 *                           type: number
 *                           description: Duration in seconds
 *                         waveform:
 *                           type: array
 *                           items:
 *                             type: number
 *                           description: Waveform data for visualization
 *       400:
 *         description: Invalid file, file too large, or duration exceeds limit
 *       403:
 *         description: Not authorized to send in this conversation
 *       404:
 *         description: Conversation not found
 */
router.post(
  '/conversations/:conversationId/messages/voice',
  authenticate,
  upload.single('voice'),
  mediaMessagingController.sendVoiceMessage.bind(mediaMessagingController)
);

/**
 * @swagger
 * /api/v1/media/upload-url:
 *   get:
 *     summary: Get a pre-signed URL for direct file upload
 *     tags: [Media Messaging]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [photo, voice, video]
 *       - in: query
 *         name: mimeType
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: fileName
 *         schema:
 *           type: string
 *           description: Original file name (optional)
 *     responses:
 *       200:
 *         description: Pre-signed URL generated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     uploadUrl:
 *                       type: string
 *                       description: Pre-signed URL for uploading
 *                     mediaUrl:
 *                       type: string
 *                       description: Final URL of the uploaded file
 *                     filePath:
 *                       type: string
 *                     expiresIn:
 *                       type: number
 *                       description: URL expiration in seconds
 *       400:
 *         description: Missing required parameters
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Conversation not found
 */
router.get(
  '/media/upload-url',
  authenticate,
  mediaMessagingController.getUploadUrl.bind(mediaMessagingController)
);

/**
 * @swagger
 * /api/v1/media/supported-formats:
 *   get:
 *     summary: Get supported media formats and limits
 *     tags: [Media Messaging]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Supported formats and limits
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     photo:
 *                       type: object
 *                       properties:
 *                         formats:
 *                           type: array
 *                           items:
 *                             type: string
 *                         maxFileSize:
 *                           type: number
 *                         maxFileSizeMB:
 *                           type: number
 *                     voice:
 *                       type: object
 *                       properties:
 *                         formats:
 *                           type: array
 *                           items:
 *                             type: string
 *                         maxFileSize:
 *                           type: number
 *                         maxDuration:
 *                           type: number
 *                         maxDurationFormatted:
 *                           type: string
 */
router.get(
  '/media/supported-formats',
  authenticate,
  mediaMessagingController.getSupportedFormats.bind(mediaMessagingController)
);

export default router;
