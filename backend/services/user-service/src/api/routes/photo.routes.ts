import { Router } from 'express';
import { PhotoController } from '../controllers/photo.controller';
import { authenticate } from '../middleware/auth.middleware';
import { uploadSingle, validateUploadedFile } from '../middleware/upload.middleware';

const router = Router();
const photoController = new PhotoController();

/**
 * @swagger
 * /api/photos:
 *   get:
 *     summary: Get all photos for current user
 *     tags: [Photos]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Photos retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/', authenticate, photoController.getUserPhotos.bind(photoController));

/**
 * @swagger
 * /api/photos/upload:
 *   post:
 *     summary: Upload a new photo
 *     tags: [Photos]
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
 *                 description: Photo file (JPEG, PNG, WebP, GIF)
 *     responses:
 *       201:
 *         description: Photo uploaded successfully
 *       400:
 *         description: Bad request (invalid file or limit exceeded)
 *       401:
 *         description: Unauthorized
 */
router.post('/upload', authenticate, uploadSingle, validateUploadedFile('image'), photoController.uploadPhoto.bind(photoController));

/**
 * @swagger
 * /api/photos:
 *   post:
 *     summary: Add a new photo
 *     tags: [Photos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - url
 *             properties:
 *               url:
 *                 type: string
 *                 description: Photo URL
 *               thumbnail_url:
 *                 type: string
 *                 description: Thumbnail URL (optional)
 *     responses:
 *       201:
 *         description: Photo added successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.post('/', authenticate, photoController.addPhoto.bind(photoController));

/**
 * @swagger
 * /api/photos/{photoId}:
 *   delete:
 *     summary: Delete a photo
 *     tags: [Photos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: photoId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Photo deleted successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.delete('/:photoId', authenticate, photoController.deletePhoto.bind(photoController));

/**
 * @swagger
 * /api/photos/{photoId}/primary:
 *   put:
 *     summary: Set photo as primary
 *     tags: [Photos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: photoId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Primary photo updated
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.put('/:photoId/primary', authenticate, photoController.setPrimaryPhoto.bind(photoController));

/**
 * @swagger
 * /api/photos/reorder:
 *   put:
 *     summary: Reorder photos
 *     tags: [Photos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - photoOrders
 *             properties:
 *               photoOrders:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     position:
 *                       type: integer
 *     responses:
 *       200:
 *         description: Photos reordered successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.put('/reorder', authenticate, photoController.reorderPhotos.bind(photoController));

export default router;
