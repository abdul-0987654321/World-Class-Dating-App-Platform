import { Router } from 'express';
import uploadController from '../controllers/upload.controller';
import { authenticate } from '../middleware/auth.middleware';
import { upload } from '../middleware/upload.middleware';

const router = Router();

/**
 * @swagger
 * /api/media/upload:
 *   post:
 *     summary: Upload a photo
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - photo
 *             properties:
 *               photo:
 *                 type: string
 *                 format: binary
 *                 description: Photo file (JPEG, PNG, or WebP, max 10MB)
 *               isProfilePhoto:
 *                 type: boolean
 *                 default: false
 *                 description: Set as profile photo
 *     responses:
 *       201:
 *         description: Photo uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Photo uploaded successfully
 *                 data:
 *                   $ref: '#/components/schemas/MediaMetadata'
 *       400:
 *         description: Bad request - Invalid file or validation error
 *       401:
 *         description: Unauthorized - Invalid or missing token
 */
router.post(
  '/upload',
  authenticate,
  upload.single('photo'),
  uploadController.uploadPhoto.bind(uploadController)
);

/**
 * @swagger
 * /api/media/photos:
 *   get:
 *     summary: Get current user's photos
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Photos retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/MediaMetadata'
 *       401:
 *         description: Unauthorized
 */
router.get('/photos', authenticate, uploadController.getUserPhotos.bind(uploadController));

/**
 * @swagger
 * /api/media/photos/{id}:
 *   get:
 *     summary: Get a specific photo
 *     tags: [Media]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Photo ID
 *     responses:
 *       200:
 *         description: Photo retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/MediaMetadata'
 *       404:
 *         description: Photo not found
 */
router.get('/photos/:id', uploadController.getPhoto.bind(uploadController));

/**
 * @swagger
 * /api/media/photos/{id}:
 *   delete:
 *     summary: Delete a photo
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Photo ID
 *     responses:
 *       200:
 *         description: Photo deleted successfully
 *       403:
 *         description: Forbidden - Not photo owner
 *       404:
 *         description: Photo not found
 */
router.delete('/photos/:id', authenticate, uploadController.deletePhoto.bind(uploadController));

/**
 * @swagger
 * /api/media/photos/{id}/profile:
 *   put:
 *     summary: Set photo as profile photo
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Photo ID
 *     responses:
 *       200:
 *         description: Profile photo updated successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Photo not found
 */
router.put('/photos/:id/profile', authenticate, uploadController.setAsProfilePhoto.bind(uploadController));

export default router;
