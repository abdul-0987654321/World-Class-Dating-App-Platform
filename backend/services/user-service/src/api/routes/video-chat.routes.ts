import express, { Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { videoChatService } from '../../services/video-chat.service';
import { logger } from '../../utils/logger';

const router = express.Router();

/**
 * @swagger
 * /api/video-chat/initiate:
 *   post:
 *     summary: Initiate video or voice call
 *     tags: [VideoChat]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Start a video or audio call with a matched user.
 *
 *       **Requirements:**
 *       - Both users must be matched
 *       - Caller must have sufficient coins (unless Mid/Ultra subscriber)
 *       - Receiver must not have blocked caller
 *
 *       **Costs:**
 *       - Video calls: 10 coins/minute
 *       - Audio calls: 5 coins/minute
 *       - Mid/Ultra subscribers: Unlimited free calls
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - receiverId
 *               - callType
 *             properties:
 *               receiverId:
 *                 type: string
 *                 format: uuid
 *                 example: 550e8400-e29b-41d4-a716-446655440000
 *                 description: User ID to call
 *               callType:
 *                 type: string
 *                 enum: [video, audio]
 *                 example: video
 *                 description: Type of call
 *     responses:
 *       200:
 *         description: Call initiated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 callId:
 *                   type: string
 *                   example: 550e8400-e29b-41d4-a716-446655440000
 *                 channelName:
 *                   type: string
 *                   example: call_550e8400-e29b-41d4-a716-446655440000
 *                 token:
 *                   type: string
 *                   description: Agora RTC token
 *       400:
 *         description: Invalid request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *             examples:
 *               notMatched:
 *                 value:
 *                   success: false
 *                   error: You can only call users you have matched with
 *               insufficientCoins:
 *                 value:
 *                   success: false
 *                   error: Insufficient coins. Video calls cost 10 coins per minute.
 *       401:
 *         description: Not authenticated
 */
router.post('/initiate', requireAuth, async (req: Request, res: Response) => {
  try {
    const callerId = req.user!.id;
    const { receiverId, callType } = req.body;

    if (!receiverId || !callType) {
      return res.status(400).json({
        success: false,
        error: 'receiverId and callType are required',
      });
    }

    if (!['video', 'audio'].includes(callType)) {
      return res.status(400).json({
        success: false,
        error: 'callType must be either "video" or "audio"',
      });
    }

    const result = await videoChatService.initiateCall(
      callerId,
      receiverId,
      callType
    );

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(200).json(result);
  } catch (error: any) {
    logger.error('Call initiation failed', {
      userId: req.user?.id,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      error: 'Failed to initiate call',
    });
  }
});

/**
 * @swagger
 * /api/video-chat/accept/{callId}:
 *   post:
 *     summary: Accept incoming call
 *     tags: [VideoChat]
 *     security:
 *       - bearerAuth: []
 *     description: Accept an incoming video or voice call
 *     parameters:
 *       - in: path
 *         name: callId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Call ID
 *     responses:
 *       200:
 *         description: Call accepted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 channelName:
 *                   type: string
 *                   example: call_550e8400-e29b-41d4-a716-446655440000
 *                 token:
 *                   type: string
 *                   description: Agora RTC token
 *                 callType:
 *                   type: string
 *                   enum: [video, audio]
 *                   example: video
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Not authenticated
 */
router.post('/accept/:callId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { callId } = req.params;
    const userId = req.user!.id;

    const result = await videoChatService.acceptCall(callId, userId);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(200).json(result);
  } catch (error: any) {
    logger.error('Call accept failed', {
      userId: req.user?.id,
      callId: req.params.callId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      error: 'Failed to accept call',
    });
  }
});

/**
 * @swagger
 * /api/video-chat/end/{callId}:
 *   post:
 *     summary: End active call
 *     tags: [VideoChat]
 *     security:
 *       - bearerAuth: []
 *     description: End an active video or voice call
 *     parameters:
 *       - in: path
 *         name: callId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Call ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 enum: [completed, declined, cancelled, missed]
 *                 default: completed
 *                 example: completed
 *     responses:
 *       200:
 *         description: Call ended successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 duration:
 *                   type: integer
 *                   example: 5
 *                   description: Call duration in minutes
 *                 coinsCharged:
 *                   type: integer
 *                   example: 50
 *                   description: Total coins charged for the call
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Not authenticated
 */
router.post('/end/:callId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { callId } = req.params;
    const userId = req.user!.id;
    const { reason = 'completed' } = req.body;

    const result = await videoChatService.endCall(callId, userId, reason);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(200).json(result);
  } catch (error: any) {
    logger.error('Call end failed', {
      userId: req.user?.id,
      callId: req.params.callId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      error: 'Failed to end call',
    });
  }
});

/**
 * @swagger
 * /api/video-chat/history:
 *   get:
 *     summary: Get call history
 *     tags: [VideoChat]
 *     security:
 *       - bearerAuth: []
 *     description: Get user's video/audio call history
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           minimum: 1
 *           maximum: 100
 *         description: Number of results per page
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *           minimum: 0
 *         description: Pagination offset
 *     responses:
 *       200:
 *         description: Call history retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 calls:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       callType:
 *                         type: string
 *                         enum: [video, audio]
 *                       status:
 *                         type: string
 *                       duration:
 *                         type: integer
 *                       isCaller:
 *                         type: boolean
 *                       otherUser:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           firstName:
 *                             type: string
 *                           lastName:
 *                             type: string
 *                       initiatedAt:
 *                         type: string
 *                         format: date-time
 *                 pagination:
 *                   type: object
 *       401:
 *         description: Not authenticated
 */
router.get('/history', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);

    const result = await videoChatService.getCallHistory(userId, limit, offset);

    res.status(200).json(result);
  } catch (error: any) {
    logger.error('Failed to get call history', {
      userId: req.user?.id,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve call history',
    });
  }
});

/**
 * @swagger
 * /api/video-chat/active:
 *   get:
 *     summary: Get active call
 *     tags: [VideoChat]
 *     security:
 *       - bearerAuth: []
 *     description: Check if user has an active call and get call details
 *     responses:
 *       200:
 *         description: Active call status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 hasActiveCall:
 *                   type: boolean
 *                 call:
 *                   type: object
 *                   description: Call details if active call exists
 *       401:
 *         description: Not authenticated
 */
router.get('/active', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const result = await videoChatService.getActiveCall(userId);

    res.status(200).json(result);
  } catch (error: any) {
    logger.error('Failed to get active call', {
      userId: req.user?.id,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve active call',
    });
  }
});

/**
 * @swagger
 * /api/video-chat/status/{callId}:
 *   patch:
 *     summary: Update call status
 *     tags: [VideoChat]
 *     security:
 *       - bearerAuth: []
 *     description: Update call status (e.g., ringing, missed)
 *     parameters:
 *       - in: path
 *         name: callId
 *         required: true
 *         schema:
 *           type: string
 *         description: Call ID
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
 *                 enum: [ringing, missed]
 *                 example: ringing
 *     responses:
 *       200:
 *         description: Status updated
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Not authenticated
 */
router.patch('/status/:callId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { callId } = req.params;
    const { status } = req.body;

    if (!['ringing', 'missed'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status',
      });
    }

    const result = await videoChatService.updateCallStatus(callId, status);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(200).json(result);
  } catch (error: any) {
    logger.error('Failed to update call status', {
      callId: req.params.callId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      error: 'Failed to update call status',
    });
  }
});

export default router;
