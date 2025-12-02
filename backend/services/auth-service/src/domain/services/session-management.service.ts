import redisCache from '../../infrastructure/cache/redis';
import logger from '../../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export interface Session {
  id: string;
  userId: string;
  deviceFingerprint?: string;
  ip: string;
  userAgent: string;
  createdAt: Date;
  lastActivity: Date;
  expiresAt: Date;
  isActive: boolean;
}

export interface CreateSessionDto {
  userId: string;
  deviceFingerprint?: string;
  ip: string;
  userAgent: string;
  expiresIn?: number; // seconds
}

class SessionManagementService {
  private readonly DEFAULT_SESSION_EXPIRY = 30 * 24 * 60 * 60; // 30 days
  private readonly SESSION_ACTIVITY_UPDATE_INTERVAL = 5 * 60; // 5 minutes

  /**
   * Create a new session
   */
  async createSession(data: CreateSessionDto): Promise<Session> {
    const sessionId = uuidv4();
    const now = new Date();
    const expiresIn = data.expiresIn || this.DEFAULT_SESSION_EXPIRY;
    const expiresAt = new Date(now.getTime() + expiresIn * 1000);

    const session: Session = {
      id: sessionId,
      userId: data.userId,
      deviceFingerprint: data.deviceFingerprint,
      ip: data.ip,
      userAgent: data.userAgent,
      createdAt: now,
      lastActivity: now,
      expiresAt,
      isActive: true,
    };

    // Store session
    await this.storeSession(session, expiresIn);

    // Add to user's session list
    await this.addToUserSessions(data.userId, sessionId);

    logger.info(`Session created for user ${data.userId}: ${sessionId}`);

    return session;
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: string): Promise<Session | null> {
    const key = `session:${sessionId}`;
    const data = await redisCache.get(key);

    if (!data) {
      return null;
    }

    const session = JSON.parse(data);

    // Convert date strings back to Date objects
    session.createdAt = new Date(session.createdAt);
    session.lastActivity = new Date(session.lastActivity);
    session.expiresAt = new Date(session.expiresAt);

    // Check if expired
    if (new Date() >= session.expiresAt) {
      await this.revokeSession(sessionId);
      return null;
    }

    return session;
  }

  /**
   * Get all sessions for a user
   */
  async getUserSessions(userId: string): Promise<Session[]> {
    const listKey = `sessions:${userId}`;
    const sessionIds = await redisCache.getList(listKey);

    if (!sessionIds || sessionIds.length === 0) {
      return [];
    }

    const sessions = await Promise.all(
      sessionIds.map(id => this.getSession(id))
    );

    return sessions.filter(s => s !== null) as Session[];
  }

  /**
   * Get active sessions for a user
   */
  async getActiveSessions(userId: string): Promise<Session[]> {
    const sessions = await this.getUserSessions(userId);
    return sessions.filter(s => s.isActive);
  }

  /**
   * Update session activity
   */
  async updateActivity(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);

    if (!session) {
      return;
    }

    const now = new Date();
    const timeSinceLastUpdate = now.getTime() - session.lastActivity.getTime();

    // Only update if enough time has passed (avoid too frequent updates)
    if (timeSinceLastUpdate < this.SESSION_ACTIVITY_UPDATE_INTERVAL * 1000) {
      return;
    }

    session.lastActivity = now;

    const remainingTTL = Math.floor((session.expiresAt.getTime() - now.getTime()) / 1000);

    if (remainingTTL > 0) {
      await this.storeSession(session, remainingTTL);
    }
  }

  /**
   * Revoke a specific session
   */
  async revokeSession(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);

    if (!session) {
      return;
    }

    // Delete session
    const key = `session:${sessionId}`;
    await redisCache.del(key);

    // Remove from user's session list
    await this.removeFromUserSessions(session.userId, sessionId);

    logger.info(`Session revoked: ${sessionId}`);
  }

  /**
   * Revoke all sessions for a user
   */
  async revokeAllUserSessions(userId: string): Promise<void> {
    const sessions = await this.getUserSessions(userId);

    await Promise.all(
      sessions.map(session => this.revokeSession(session.id))
    );

    logger.info(`All sessions revoked for user: ${userId}`);
  }

  /**
   * Revoke all sessions except current
   */
  async revokeOtherSessions(userId: string, currentSessionId: string): Promise<void> {
    const sessions = await this.getUserSessions(userId);

    const otherSessions = sessions.filter(s => s.id !== currentSessionId);

    await Promise.all(
      otherSessions.map(session => this.revokeSession(session.id))
    );

    logger.info(`Other sessions revoked for user: ${userId}`);
  }

  /**
   * Refresh session expiry
   */
  async refreshSession(sessionId: string, expiresIn?: number): Promise<Session | null> {
    const session = await this.getSession(sessionId);

    if (!session) {
      return null;
    }

    const now = new Date();
    const newExpiresIn = expiresIn || this.DEFAULT_SESSION_EXPIRY;
    session.expiresAt = new Date(now.getTime() + newExpiresIn * 1000);
    session.lastActivity = now;

    await this.storeSession(session, newExpiresIn);

    logger.info(`Session refreshed: ${sessionId}`);

    return session;
  }

  /**
   * Check if session is valid
   */
  async isSessionValid(sessionId: string): Promise<boolean> {
    const session = await this.getSession(sessionId);

    if (!session) {
      return false;
    }

    return session.isActive && new Date() < session.expiresAt;
  }

  /**
   * Get session count for user
   */
  async getSessionCount(userId: string): Promise<number> {
    const sessions = await this.getActiveSessions(userId);
    return sessions.length;
  }

  /**
   * Deactivate session (soft delete)
   */
  async deactivateSession(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);

    if (!session) {
      return;
    }

    session.isActive = false;

    const remainingTTL = Math.floor((session.expiresAt.getTime() - Date.now()) / 1000);

    if (remainingTTL > 0) {
      await this.storeSession(session, remainingTTL);
    }

    logger.info(`Session deactivated: ${sessionId}`);
  }

  /**
   * Get session details with enriched information
   */
  async getSessionDetails(sessionId: string): Promise<Session & { location?: string; device?: string } | null> {
    const session = await this.getSession(sessionId);

    if (!session) {
      return null;
    }

    // Parse user agent for device info
    const device = this.parseUserAgent(session.userAgent);

    return {
      ...session,
      device,
      // In production, use geolocation API to get location from IP
      location: 'Unknown', // Placeholder
    };
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(userId: string): Promise<number> {
    const sessions = await this.getUserSessions(userId);
    const now = new Date();

    let cleanedCount = 0;

    for (const session of sessions) {
      if (now >= session.expiresAt) {
        await this.revokeSession(session.id);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.info(`Cleaned up ${cleanedCount} expired sessions for user ${userId}`);
    }

    return cleanedCount;
  }

  // Private helper methods

  private async storeSession(session: Session, ttl: number): Promise<void> {
    const key = `session:${session.id}`;
    await redisCache.set(key, JSON.stringify(session), ttl);
  }

  private async addToUserSessions(userId: string, sessionId: string): Promise<void> {
    const listKey = `sessions:${userId}`;
    await redisCache.addToList(listKey, sessionId);
  }

  private async removeFromUserSessions(userId: string, sessionId: string): Promise<void> {
    const listKey = `sessions:${userId}`;
    await redisCache.removeFromList(listKey, sessionId);
  }

  private parseUserAgent(userAgent: string): string {
    // Simple parsing - in production, use a library like ua-parser-js
    if (userAgent.includes('iPhone')) {
      return 'iPhone';
    } else if (userAgent.includes('iPad')) {
      return 'iPad';
    } else if (userAgent.includes('Android')) {
      return 'Android';
    } else if (userAgent.includes('Windows')) {
      return 'Windows';
    } else if (userAgent.includes('Mac')) {
      return 'Mac';
    } else if (userAgent.includes('Linux')) {
      return 'Linux';
    }

    return 'Unknown Device';
  }
}

export const sessionManagementService = new SessionManagementService();
export default sessionManagementService;
