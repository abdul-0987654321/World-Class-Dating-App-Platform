import { Router } from 'express';
import { Request, Response } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import db from '../../infrastructure/database/connection';
import { AccountSecurityService } from '../../services/account-security.service';
import { SessionManagementService } from '../../services/session-management.service';
import logger from '../../utils/logger';

const router = Router();

// Initialize services
const securityService = new AccountSecurityService(db);
const sessionService = new SessionManagementService(db);

/**
 * @swagger
 * /api/security/sessions:
 *   get:
 *     summary: Get active sessions
 *     tags: [Security]
 *     security:
 *       - bearerAuth: []
 */
router.get('/sessions', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const sessions = await sessionService.getUserSessions(userId);

    res.json({
      success: true,
      data: sessions,
    });
  } catch (error) {
    logger.error(`Failed to get sessions: ${error}`);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve sessions',
    });
  }
});

/**
 * @swagger
 * /api/security/sessions/revoke/{sessionId}:
 *   post:
 *     summary: Revoke a specific session
 *     tags: [Security]
 *     security:
 *       - bearerAuth: []
 */
router.post('/sessions/revoke/:sessionId', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { sessionId } = req.params;

    // Verify session belongs to user
    const session = await sessionService.getSessionById(sessionId);
    if (!session || session.user_id !== userId) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
      });
    }

    await sessionService.revokeSession(sessionId, 'user_revocation');

    res.json({
      success: true,
      message: 'Session revoked successfully',
    });
  } catch (error) {
    logger.error(`Failed to revoke session: ${error}`);
    res.status(500).json({
      success: false,
      message: 'Failed to revoke session',
    });
  }
});

/**
 * @swagger
 * /api/security/sessions/revoke-all:
 *   post:
 *     summary: Revoke all sessions except current
 *     tags: [Security]
 *     security:
 *       - bearerAuth: []
 */
router.post('/sessions/revoke-all', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const currentSessionId = req.session?.id;

    const count = await sessionService.revokeAllUserSessions(
      userId,
      currentSessionId,
      'user_revoke_all'
    );

    res.json({
      success: true,
      message: `${count} sessions revoked successfully`,
    });
  } catch (error) {
    logger.error(`Failed to revoke all sessions: ${error}`);
    res.status(500).json({
      success: false,
      message: 'Failed to revoke sessions',
    });
  }
});

/**
 * @swagger
 * /api/security/login-attempts:
 *   get:
 *     summary: Get login attempt history
 *     tags: [Security]
 *     security:
 *       - bearerAuth: []
 */
router.get('/login-attempts', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const limit = parseInt(req.query.limit as string) || 50;

    const attempts = await securityService.getLoginAttempts(userId, limit);

    res.json({
      success: true,
      data: attempts,
    });
  } catch (error) {
    logger.error(`Failed to get login attempts: ${error}`);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve login attempts',
    });
  }
});

/**
 * @swagger
 * /api/security/lockout-history:
 *   get:
 *     summary: Get account lockout history
 *     tags: [Security]
 *     security:
 *       - bearerAuth: []
 */
router.get('/lockout-history', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const history = await securityService.getLockoutHistory(userId);

    res.json({
      success: true,
      data: history,
    });
  } catch (error) {
    logger.error(`Failed to get lockout history: ${error}`);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve lockout history',
    });
  }
});

/**
 * @swagger
 * /api/security/account-status:
 *   get:
 *     summary: Get account security status
 *     tags: [Security]
 *     security:
 *       - bearerAuth: []
 */
router.get('/account-status', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const lockStatus = await securityService.isAccountLocked(userId);
    const sessions = await sessionService.getUserSessions(userId);
    const recentAttempts = await securityService.getLoginAttempts(userId, 10);

    const failedAttempts = recentAttempts.filter(a => !a.success).length;

    res.json({
      success: true,
      data: {
        isLocked: lockStatus.isLocked,
        lockout: lockStatus.lockout,
        activeSessions: sessions.length,
        recentFailedAttempts: failedAttempts,
        lastLoginAttempt: recentAttempts[0],
      },
    });
  } catch (error) {
    logger.error(`Failed to get account status: ${error}`);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve account status',
    });
  }
});

/**
 * @swagger
 * /api/security/unlock-account:
 *   post:
 *     summary: Request account unlock
 *     tags: [Security]
 *     security:
 *       - bearerAuth: []
 */
router.post('/unlock-account', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { unlockToken } = req.body;

    await securityService.unlockAccount(userId, unlockToken);

    res.json({
      success: true,
      message: 'Account unlocked successfully',
    });
  } catch (error) {
    logger.error(`Failed to unlock account: ${error}`);
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to unlock account',
    });
  }
});

/**
 * @swagger
 * /api/security/session-statistics:
 *   get:
 *     summary: Get session statistics
 *     tags: [Security]
 *     security:
 *       - bearerAuth: []
 */
router.get('/session-statistics', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const stats = await sessionService.getSessionStatistics(userId);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error(`Failed to get session statistics: ${error}`);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve session statistics',
    });
  }
});

export default router;
