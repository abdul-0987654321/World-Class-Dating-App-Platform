import { Router } from 'express';
import { ReportController } from '../controllers/report.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import {
  createReportSchema,
  resolveReportSchema,
  reportQuerySchema,
  moderationQueueQuerySchema,
} from '../validators/report.validator';

const router = Router();
const reportController = new ReportController();

/**
 * @swagger
 * /api/reports:
 *   post:
 *     summary: Create a report
 *     description: Report another user for inappropriate behavior or content
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reportedId
 *               - reportType
 *             properties:
 *               reportedId:
 *                 type: string
 *                 format: uuid
 *                 description: ID of the user being reported
 *               reportType:
 *                 type: string
 *                 enum: [inappropriate_photos, inappropriate_messages, fake_profile, spam, harassment, underage, scam, violence, hate_speech, other]
 *                 description: Type of report
 *                 example: inappropriate_messages
 *               severity:
 *                 type: string
 *                 enum: [low, medium, high, critical]
 *                 description: Severity level (defaults to category default)
 *                 example: medium
 *               description:
 *                 type: string
 *                 maxLength: 1000
 *                 description: Additional details about the report
 *                 example: User sent threatening messages
 *     responses:
 *       200:
 *         description: Report created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Report'
 *       400:
 *         description: Invalid report data or cannot report yourself
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/', authenticate, validate(createReportSchema), reportController.createReport.bind(reportController));

/**
 * @swagger
 * /api/reports/categories:
 *   get:
 *     summary: Get report categories
 *     description: Returns all active report categories with descriptions
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Report categories retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ReportCategory'
 */
router.get('/categories', authenticate, reportController.getReportCategories.bind(reportController));

/**
 * @swagger
 * /api/reports/my-reports:
 *   get:
 *     summary: Get user's reports
 *     description: Returns all reports submitted by the current user
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, under_review, resolved, dismissed]
 *         description: Filter by report status
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of records to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Number of records to skip
 *     responses:
 *       200:
 *         description: Reports retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Report'
 */
router.get('/my-reports', authenticate, validate(reportQuerySchema, 'query'), reportController.getMyReports.bind(reportController));

/**
 * @swagger
 * /api/reports/{reportId}/resolve:
 *   put:
 *     summary: Resolve a report (Admin only)
 *     description: Mark a report as resolved and specify the action taken
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reportId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID of the report to resolve
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [resolved, dismissed]
 *                 description: Resolution status
 *                 example: resolved
 *               actionTaken:
 *                 type: string
 *                 maxLength: 500
 *                 description: Description of action taken
 *                 example: User warned and content removed
 *     responses:
 *       200:
 *         description: Report resolved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Report'
 *       403:
 *         description: Unauthorized - Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Report not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put('/:reportId/resolve', authenticate, validate(resolveReportSchema), reportController.resolveReport.bind(reportController));

/**
 * @swagger
 * /api/reports/moderation-queue:
 *   get:
 *     summary: Get moderation queue (Admin only)
 *     description: Returns reports pending moderation, ordered by severity and creation date
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: severity
 *         schema:
 *           type: string
 *           enum: [low, medium, high, critical]
 *         description: Filter by severity level
 *       - in: query
 *         name: reportType
 *         schema:
 *           type: string
 *         description: Filter by report type
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of records to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Number of records to skip
 *     responses:
 *       200:
 *         description: Moderation queue retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Report'
 *       403:
 *         description: Unauthorized - Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/moderation-queue', authenticate, validate(moderationQueueQuerySchema, 'query'), reportController.getModerationQueue.bind(reportController));

/**
 * @swagger
 * /api/reports/stats:
 *   get:
 *     summary: Get report statistics (Admin only)
 *     description: Returns aggregate statistics for all reports
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Report statistics retrieved successfully
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
 *                     totalReports:
 *                       type: integer
 *                       description: Total number of reports
 *                     pendingReports:
 *                       type: integer
 *                       description: Reports awaiting review
 *                     resolvedReports:
 *                       type: integer
 *                       description: Reports that have been resolved
 *                     dismissedReports:
 *                       type: integer
 *                       description: Reports that were dismissed
 *                     reportsBySeverity:
 *                       type: object
 *                       properties:
 *                         low:
 *                           type: integer
 *                         medium:
 *                           type: integer
 *                         high:
 *                           type: integer
 *                         critical:
 *                           type: integer
 *                     reportsByType:
 *                       type: object
 *                       description: Counts by report type
 *       403:
 *         description: Unauthorized - Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/stats', authenticate, reportController.getReportStats.bind(reportController));

export default router;
