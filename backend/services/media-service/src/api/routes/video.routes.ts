import { Router } from 'express';
import videoController from '../controllers/video.controller';
import { authenticate } from '../middleware/auth.middleware';
import { upload } from '../middleware/upload.middleware';

const router = Router();

/**
 * @swagger
 * /api/media/videos/upload:
 *   post:
 *     summary: Upload a video
 *     tags: [Video]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - video
 *             properties:
 *               video:
 *                 type: string
 *                 format: binary
 *                 description: Video file (MP4, MOV, max 100MB, 15-30 seconds)
 *               videoType:
 *                 type: string
 *                 enum: [profile, prompt]
 *                 default: profile
 *                 description: Type of video (profile intro or prompt response)
 *     responses:
 *       201:
 *         description: Video uploaded successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/upload',
  authenticate,
  upload.single('video'),
  videoController.uploadVideo.bind(videoController)
);

/**
 * @swagger
 * /api/media/videos:
 *   get:
 *     summary: Get current user's videos
 *     tags: [Video]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Videos retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/', authenticate, videoController.getUserVideos.bind(videoController));

/**
 * @swagger
 * /api/media/videos/{id}:
 *   get:
 *     summary: Get a specific video
 *     tags: [Video]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Video ID
 *     responses:
 *       200:
 *         description: Video retrieved successfully
 *       404:
 *         description: Video not found
 */
router.get('/:id', videoController.getVideo.bind(videoController));

/**
 * @swagger
 * /api/media/videos/profile/{userId}:
 *   get:
 *     summary: Get user's profile video
 *     tags: [Video]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: Profile video retrieved successfully
 *       404:
 *         description: Profile video not found
 */
router.get('/profile/:userId', videoController.getUserProfileVideo.bind(videoController));

/**
 * @swagger
 * /api/media/videos/{id}:
 *   delete:
 *     summary: Delete a video
 *     tags: [Video]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Video ID
 *     responses:
 *       200:
 *         description: Video deleted successfully
 *       403:
 *         description: Forbidden - Not video owner
 *       404:
 *         description: Video not found
 */
router.delete('/:id', authenticate, videoController.deleteVideo.bind(videoController));

export default router;
