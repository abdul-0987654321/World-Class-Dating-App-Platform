import { Knex } from 'knex';
import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

// Extend Express Request type to include session
declare module 'express-serve-static-core' {
  interface Request {
    session?: any;
  }
}

interface SecuritySession {
  id: string;
  user_id: string;
  session_token: string;
  device_id: string;
  device_name?: string;
  device_type?: 'mobile' | 'tablet' | 'desktop' | 'web';
  ip_address: string;
  user_agent?: string;
  created_at: Date;
  last_activity_at: Date;
  expires_at: Date;
  is_active: boolean;
  revoked_at?: Date;
  revoke_reason?: string;
}

interface SessionFingerprint {
  userAgent: string;
  ipAddress: string;
  deviceId: string;
}

/**
 * Session Management Service
 * Handles secure session creation, validation, and lifecycle
 */
export class SessionManagementService {
  private db: Knex;
  private readonly SESSION_DURATION_HOURS = 24;
  private readonly MAX_SESSIONS_PER_USER = 5;
  private readonly SESSION_REFRESH_THRESHOLD_MINUTES = 60;
  private readonly INACTIVITY_TIMEOUT_MINUTES = 30;

  constructor(database: Knex) {
    this.db = database;
  }

  /**
   * Create new security session
   */
  async createSession(
    userId: string,
    ipAddress: string,
    userAgent?: string,
    deviceId?: string,
    deviceName?: string,
    deviceType?: 'mobile' | 'tablet' | 'desktop' | 'web'
  ): Promise<SecuritySession> {
    try {
      // Generate session token
      const sessionToken = this.generateSessionToken();

      // Generate device ID if not provided
      const finalDeviceId = deviceId || this.generateDeviceId(userAgent, ipAddress);

      // Calculate expiry
      const expiresAt = new Date(Date.now() + this.SESSION_DURATION_HOURS * 60 * 60 * 1000);

      // Check max sessions and remove oldest if needed
      await this.enforceMaxSessions(userId);

      // Create session
      const [session] = await this.db('security_sessions')
        .insert({
          user_id: userId,
          session_token: sessionToken,
          device_id: finalDeviceId,
          device_name: deviceName,
          device_type: deviceType || this.detectDeviceType(userAgent),
          ip_address: ipAddress,
          user_agent: userAgent,
          created_at: new Date(),
          last_activity_at: new Date(),
          expires_at: expiresAt,
          is_active: true,
        })
        .returning('*');

      logger.info(`Session created for user ${userId} from ${ipAddress}`);

      return session;
    } catch (error) {
      logger.error(`Failed to create session: ${error}`);
      throw error;
    }
  }

  /**
   * Validate session token
   */
  async validateSession(sessionToken: string): Promise<{
    isValid: boolean;
    session?: SecuritySession;
    reason?: string;
  }> {
    try {
      const session = await this.db('security_sessions')
        .where({ session_token: sessionToken, is_active: true })
        .first();

      if (!session) {
        return { isValid: false, reason: 'Session not found' };
      }

      // Check if expired
      if (new Date() > new Date(session.expires_at)) {
        await this.revokeSession(session.id, 'expired');
        return { isValid: false, reason: 'Session expired' };
      }

      // Check inactivity timeout
      const inactiveMinutes = (Date.now() - new Date(session.last_activity_at).getTime()) / (60 * 1000);
      if (inactiveMinutes > this.INACTIVITY_TIMEOUT_MINUTES) {
        await this.revokeSession(session.id, 'inactivity_timeout');
        return { isValid: false, reason: 'Session timed out due to inactivity' };
      }

      // Update last activity
      await this.updateSessionActivity(session.id);

      return { isValid: true, session };
    } catch (error) {
      logger.error(`Failed to validate session: ${error}`);
      return { isValid: false, reason: 'Validation error' };
    }
  }

  /**
   * Update session activity timestamp
   */
  async updateSessionActivity(sessionId: string): Promise<void> {
    try {
      await this.db('security_sessions')
        .where({ id: sessionId })
        .update({ last_activity_at: new Date() });
    } catch (error) {
      logger.error(`Failed to update session activity: ${error}`);
    }
  }

  /**
   * Refresh session (extend expiry)
   */
  async refreshSession(sessionToken: string): Promise<SecuritySession | null> {
    try {
      const validation = await this.validateSession(sessionToken);

      if (!validation.isValid || !validation.session) {
        return null;
      }

      const session = validation.session;

      // Check if session is close to expiry
      const minutesUntilExpiry = (new Date(session.expires_at).getTime() - Date.now()) / (60 * 1000);

      if (minutesUntilExpiry < this.SESSION_REFRESH_THRESHOLD_MINUTES) {
        const newExpiresAt = new Date(Date.now() + this.SESSION_DURATION_HOURS * 60 * 60 * 1000);

        const [refreshedSession] = await this.db('security_sessions')
          .where({ id: session.id })
          .update({
            expires_at: newExpiresAt,
            last_activity_at: new Date(),
          })
          .returning('*');

        logger.info(`Session refreshed for user ${session.user_id}`);

        return refreshedSession;
      }

      return session;
    } catch (error) {
      logger.error(`Failed to refresh session: ${error}`);
      return null;
    }
  }

  /**
   * Revoke session
   */
  async revokeSession(
    sessionId: string,
    reason: string = 'manual_revocation'
  ): Promise<void> {
    try {
      await this.db('security_sessions')
        .where({ id: sessionId })
        .update({
          is_active: false,
          revoked_at: new Date(),
          revoke_reason: reason,
        });

      logger.info(`Session ${sessionId} revoked: ${reason}`);
    } catch (error) {
      logger.error(`Failed to revoke session: ${error}`);
      throw error;
    }
  }

  /**
   * Revoke all user sessions
   */
  async revokeAllUserSessions(
    userId: string,
    exceptSessionId?: string,
    reason: string = 'revoke_all'
  ): Promise<number> {
    try {
      let query = this.db('security_sessions')
        .where({ user_id: userId, is_active: true });

      if (exceptSessionId) {
        query = query.whereNot({ id: exceptSessionId });
      }

      const count = await query.update({
        is_active: false,
        revoked_at: new Date(),
        revoke_reason: reason,
      });

      logger.info(`Revoked ${count} sessions for user ${userId}`);

      return count;
    } catch (error) {
      logger.error(`Failed to revoke user sessions: ${error}`);
      throw error;
    }
  }

  /**
   * Get user's active sessions
   */
  async getUserSessions(userId: string): Promise<SecuritySession[]> {
    try {
      return this.db('security_sessions')
        .where({ user_id: userId, is_active: true })
        .orderBy('last_activity_at', 'desc')
        .select('*');
    } catch (error) {
      logger.error(`Failed to get user sessions: ${error}`);
      return [];
    }
  }

  /**
   * Get session by ID
   */
  async getSessionById(sessionId: string): Promise<SecuritySession | null> {
    try {
      return this.db('security_sessions')
        .where({ id: sessionId })
        .first();
    } catch (error) {
      logger.error(`Failed to get session by ID: ${error}`);
      return null;
    }
  }

  /**
   * Enforce max sessions per user
   */
  private async enforceMaxSessions(userId: string): Promise<void> {
    try {
      const activeSessions = await this.db('security_sessions')
        .where({ user_id: userId, is_active: true })
        .orderBy('last_activity_at', 'asc')
        .select('*');

      if (activeSessions.length >= this.MAX_SESSIONS_PER_USER) {
        // Revoke oldest session
        const oldestSession = activeSessions[0];
        await this.revokeSession(oldestSession.id, 'max_sessions_exceeded');
      }
    } catch (error) {
      logger.error(`Failed to enforce max sessions: ${error}`);
    }
  }

  /**
   * Verify session fingerprint (detect session hijacking)
   */
  async verifySessionFingerprint(
    sessionId: string,
    currentFingerprint: SessionFingerprint
  ): Promise<boolean> {
    try {
      const session = await this.getSessionById(sessionId);

      if (!session) {
        return false;
      }

      // Compare fingerprint components
      const fingerprintMatches =
        session.user_agent === currentFingerprint.userAgent &&
        session.device_id === currentFingerprint.deviceId;

      // IP can change (mobile networks), so we log but don't fail
      if (session.ip_address !== currentFingerprint.ipAddress) {
        logger.warn(`IP address changed for session ${sessionId}: ${session.ip_address} -> ${currentFingerprint.ipAddress}`);
      }

      if (!fingerprintMatches) {
        logger.warn(`Session fingerprint mismatch for session ${sessionId}`);
        await this.revokeSession(sessionId, 'fingerprint_mismatch');
        return false;
      }

      return true;
    } catch (error) {
      logger.error(`Failed to verify session fingerprint: ${error}`);
      return false;
    }
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<void> {
    try {
      const count = await this.db('security_sessions')
        .where('expires_at', '<', new Date())
        .orWhere(function() {
          this.where('is_active', true)
            .where('last_activity_at', '<', new Date(Date.now() - this.INACTIVITY_TIMEOUT_MINUTES * 60 * 1000));
        })
        .update({
          is_active: false,
          revoked_at: new Date(),
          revoke_reason: 'expired_or_inactive',
        });

      logger.info(`Cleaned up ${count} expired sessions`);
    } catch (error) {
      logger.error(`Failed to cleanup expired sessions: ${error}`);
    }
  }

  /**
   * Delete old revoked sessions (keep for 90 days)
   */
  async deleteOldSessions(): Promise<void> {
    try {
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

      const count = await this.db('security_sessions')
        .where('is_active', false)
        .where('revoked_at', '<', ninetyDaysAgo)
        .delete();

      logger.info(`Deleted ${count} old sessions`);
    } catch (error) {
      logger.error(`Failed to delete old sessions: ${error}`);
    }
  }

  /**
   * Generate session token
   */
  private generateSessionToken(): string {
    return crypto.randomBytes(48).toString('base64url');
  }

  /**
   * Generate device ID from user agent and IP
   */
  private generateDeviceId(userAgent?: string, ipAddress?: string): string {
    const data = `${userAgent || 'unknown'}_${ipAddress || 'unknown'}`;
    return crypto.createHash('sha256').update(data).digest('hex').substring(0, 32);
  }

  /**
   * Detect device type from user agent
   */
  private detectDeviceType(userAgent?: string): 'mobile' | 'tablet' | 'desktop' | 'web' {
    if (!userAgent) return 'web';

    const ua = userAgent.toLowerCase();

    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      return 'mobile';
    }

    if (ua.includes('tablet') || ua.includes('ipad')) {
      return 'tablet';
    }

    return 'desktop';
  }

  /**
   * Get session statistics
   */
  async getSessionStatistics(userId?: string): Promise<any> {
    try {
      let query = this.db('security_sessions');

      if (userId) {
        query = query.where({ user_id: userId });
      }

      const totalSessions = await query.clone().count('* as count').first();
      const activeSessions = await query.clone().where({ is_active: true }).count('* as count').first();
      const expiredSessions = await query.clone().where('expires_at', '<', new Date()).count('* as count').first();

      const deviceBreakdown = await query.clone()
        .where({ is_active: true })
        .groupBy('device_type')
        .select('device_type')
        .count('* as count');

      return {
        totalSessions: parseInt(totalSessions?.count as string || '0'),
        activeSessions: parseInt(activeSessions?.count as string || '0'),
        expiredSessions: parseInt(expiredSessions?.count as string || '0'),
        deviceBreakdown,
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      logger.error(`Failed to get session statistics: ${error}`);
      throw error;
    }
  }

  /**
   * Session validation middleware
   */
  sessionMiddleware() {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const sessionToken = req.headers['x-session-token'] as string;

      if (!sessionToken) {
        res.status(401).json({
          success: false,
          message: 'Session token required',
        });
        return;
      }

      const validation = await this.validateSession(sessionToken);

      if (!validation.isValid) {
        res.status(401).json({
          success: false,
          message: validation.reason || 'Invalid session',
        });
        return;
      }

      // Add session to request
      req.session = validation.session;

      next();
    };
  }
}
