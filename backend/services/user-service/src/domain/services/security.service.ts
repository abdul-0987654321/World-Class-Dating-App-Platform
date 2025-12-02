import { db } from '../../infrastructure/database/connection';
import logger from '../../utils/logger';
import crypto from 'crypto';

export interface LoginAttempt {
  email: string;
  userId?: string;
  ipAddress: string;
  userAgent?: string;
  successful: boolean;
  failureReason?: string;
  location?: string;
  deviceFingerprint?: string;
}

export interface SecuritySession {
  userId: string;
  sessionToken: string;
  refreshToken: string;
  deviceFingerprint?: string;
  deviceName?: string;
  ipAddress: string;
  userAgent?: string;
  location?: string;
  expiresAt: Date;
  isTrustedDevice?: boolean;
}

/**
 * Security Service
 * Handles security hardening features like rate limiting, account lockouts,
 * session management, and security monitoring
 */
export class SecurityService {
  private readonly MAX_LOGIN_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION_MINUTES = 30;
  private readonly SESSION_DURATION_HOURS = 24;
  private readonly REFRESH_TOKEN_DURATION_DAYS = 30;

  /**
   * Record login attempt
   */
  async recordLoginAttempt(attempt: LoginAttempt): Promise<void> {
    try {
      await db('login_attempts').insert({
        email: attempt.email,
        user_id: attempt.userId,
        ip_address: attempt.ipAddress,
        user_agent: attempt.userAgent,
        successful: attempt.successful,
        failure_reason: attempt.failureReason,
        location: attempt.location,
        device_fingerprint: attempt.deviceFingerprint,
        attempted_at: new Date(),
      });

      // Check if account should be locked
      if (!attempt.successful && attempt.userId) {
        await this.checkAndLockAccount(attempt.userId, attempt.email, attempt.ipAddress);
      }

      logger.info(`Login attempt recorded for ${attempt.email}: ${attempt.successful ? 'success' : 'failed'}`);
    } catch (error) {
      logger.error('Error recording login attempt:', error);
      // Don't throw - logging failures shouldn't break login flow
    }
  }

  /**
   * Check failed login attempts and lock account if threshold exceeded
   */
  private async checkAndLockAccount(userId: string, email: string, ipAddress: string): Promise<void> {
    try {
      // Count recent failed attempts (last 15 minutes)
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

      const failedAttempts = await db('login_attempts')
        .where({
          email,
          successful: false,
        })
        .andWhere('attempted_at', '>', fifteenMinutesAgo)
        .count('* as count')
        .first();

      const failedCount = parseInt(failedAttempts?.count as string || '0');

      if (failedCount >= this.MAX_LOGIN_ATTEMPTS) {
        // Check if already locked
        const existingLockout = await db('account_lockouts')
          .where({ user_id: userId })
          .andWhere('unlock_at', '>', new Date())
          .whereNull('unlocked_at')
          .first();

        if (!existingLockout) {
          const unlockAt = new Date(Date.now() + this.LOCKOUT_DURATION_MINUTES * 60 * 1000);
          const unlockToken = crypto.randomBytes(32).toString('hex');

          await db('account_lockouts').insert({
            user_id: userId,
            email,
            lockout_reason: 'failed_login_attempts',
            locked_at: new Date(),
            unlock_at: unlockAt,
            is_permanent: false,
            failed_attempts_count: failedCount,
            unlock_token: unlockToken,
            ip_address: ipAddress,
          });

          // TODO: Send email with unlock link

          logger.warn(`Account locked for user ${userId} due to ${failedCount} failed login attempts`);
        }
      }
    } catch (error) {
      logger.error('Error checking account lockout:', error);
    }
  }

  /**
   * Check if account is locked
   */
  async isAccountLocked(userId: string): Promise<{ locked: boolean; reason?: string; unlockAt?: Date }> {
    try {
      const lockout = await db('account_lockouts')
        .where({ user_id: userId })
        .andWhere(function() {
          this.where('is_permanent', true)
            .orWhere('unlock_at', '>', new Date());
        })
        .whereNull('unlocked_at')
        .orderBy('locked_at', 'desc')
        .first();

      if (lockout) {
        return {
          locked: true,
          reason: lockout.lockout_reason,
          unlockAt: lockout.is_permanent ? undefined : lockout.unlock_at,
        };
      }

      return { locked: false };
    } catch (error) {
      logger.error('Error checking account lock status:', error);
      return { locked: false }; // Fail open to prevent false lockouts
    }
  }

  /**
   * Unlock account
   */
  async unlockAccount(unlockToken: string): Promise<void> {
    try {
      const lockout = await db('account_lockouts')
        .where({ unlock_token: unlockToken })
        .whereNull('unlocked_at')
        .first();

      if (!lockout) {
        throw new Error('Invalid unlock token');
      }

      await db('account_lockouts')
        .where({ id: lockout.id })
        .update({
          unlocked_at: new Date(),
        });

      logger.info(`Account unlocked for user ${lockout.user_id}`);
    } catch (error) {
      logger.error('Error unlocking account:', error);
      throw new Error('Failed to unlock account');
    }
  }

  /**
   * Create security session
   */
  async createSession(session: SecuritySession): Promise<void> {
    try {
      await db('security_sessions').insert({
        user_id: session.userId,
        session_token: session.sessionToken,
        refresh_token: session.refreshToken,
        device_fingerprint: session.deviceFingerprint,
        device_name: session.deviceName,
        ip_address: session.ipAddress,
        user_agent: session.userAgent,
        location: session.location,
        created_at: new Date(),
        last_activity_at: new Date(),
        expires_at: session.expiresAt,
        is_active: true,
        is_trusted_device: session.isTrustedDevice || false,
      });

      logger.info(`Security session created for user ${session.userId}`);
    } catch (error) {
      logger.error('Error creating security session:', error);
      throw new Error('Failed to create security session');
    }
  }

  /**
   * Validate session token
   */
  async validateSession(sessionToken: string): Promise<any> {
    try {
      const session = await db('security_sessions')
        .where({
          session_token: sessionToken,
          is_active: true,
        })
        .andWhere('expires_at', '>', new Date())
        .whereNull('revoked_at')
        .first();

      if (!session) {
        return null;
      }

      // Update last activity
      await db('security_sessions')
        .where({ id: session.id })
        .update({ last_activity_at: new Date() });

      return session;
    } catch (error) {
      logger.error('Error validating session:', error);
      return null;
    }
  }

  /**
   * Revoke session
   */
  async revokeSession(sessionToken: string, reason: string): Promise<void> {
    try {
      await db('security_sessions')
        .where({ session_token: sessionToken })
        .update({
          is_active: false,
          revoked_at: new Date(),
          revoked_reason: reason,
        });

      logger.info(`Session revoked: ${reason}`);
    } catch (error) {
      logger.error('Error revoking session:', error);
      throw new Error('Failed to revoke session');
    }
  }

  /**
   * Revoke all sessions for a user
   */
  async revokeAllUserSessions(userId: string, exceptToken?: string): Promise<void> {
    try {
      const query = db('security_sessions')
        .where({ user_id: userId, is_active: true });

      if (exceptToken) {
        query.andWhere('session_token', '!=', exceptToken);
      }

      await query.update({
        is_active: false,
        revoked_at: new Date(),
        revoked_reason: 'logout_all_devices',
      });

      logger.info(`All sessions revoked for user ${userId}`);
    } catch (error) {
      logger.error('Error revoking all sessions:', error);
      throw new Error('Failed to revoke all sessions');
    }
  }

  /**
   * Get active sessions for a user
   */
  async getUserSessions(userId: string): Promise<any[]> {
    try {
      const sessions = await db('security_sessions')
        .where({
          user_id: userId,
          is_active: true,
        })
        .andWhere('expires_at', '>', new Date())
        .orderBy('last_activity_at', 'desc')
        .select('*');

      return sessions.map(s => ({
        id: s.id,
        deviceName: s.device_name,
        location: s.location,
        ipAddress: s.ip_address,
        createdAt: s.created_at,
        lastActivityAt: s.last_activity_at,
        isTrustedDevice: s.is_trusted_device,
        isCurrent: false, // Will be set by caller
      }));
    } catch (error) {
      logger.error('Error getting user sessions:', error);
      throw new Error('Failed to get user sessions');
    }
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<void> {
    try {
      const result = await db('security_sessions')
        .where('expires_at', '<', new Date())
        .andWhere({ is_active: true })
        .update({
          is_active: false,
          revoked_at: new Date(),
          revoked_reason: 'expired',
        });

      logger.info(`Cleaned up ${result} expired sessions`);
    } catch (error) {
      logger.error('Error cleaning up expired sessions:', error);
    }
  }

  /**
   * Detect suspicious activity
   */
  async detectSuspiciousActivity(userId: string): Promise<any[]> {
    try {
      const suspiciousActivities = [];
      const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // Check for multiple failed login attempts
      const failedLogins = await db('login_attempts')
        .where({
          user_id: userId,
          successful: false,
        })
        .andWhere('attempted_at', '>', last24Hours)
        .count('* as count')
        .first();

      if (parseInt(failedLogins?.count as string || '0') > 3) {
        suspiciousActivities.push({
          type: 'multiple_failed_logins',
          severity: 'medium',
          description: 'Multiple failed login attempts detected',
          count: failedLogins?.count,
        });
      }

      // Check for logins from multiple locations
      const locations = await db('login_attempts')
        .where({
          user_id: userId,
          successful: true,
        })
        .andWhere('attempted_at', '>', last24Hours)
        .distinct('location')
        .select('location');

      if (locations.length > 3) {
        suspiciousActivities.push({
          type: 'multiple_locations',
          severity: 'high',
          description: 'Logins from multiple geographic locations',
          locations: locations.map(l => l.location),
        });
      }

      // Check for unusual login times
      const nightLogins = await db('login_attempts')
        .where({ user_id: userId, successful: true })
        .andWhere('attempted_at', '>', last24Hours)
        .whereRaw("EXTRACT(HOUR FROM attempted_at) BETWEEN 2 AND 5")
        .count('* as count')
        .first();

      if (parseInt(nightLogins?.count as string || '0') > 2) {
        suspiciousActivities.push({
          type: 'unusual_login_times',
          severity: 'low',
          description: 'Logins during unusual hours (2-5 AM)',
          count: nightLogins?.count,
        });
      }

      return suspiciousActivities;
    } catch (error) {
      logger.error('Error detecting suspicious activity:', error);
      return [];
    }
  }

  /**
   * Get login history for a user
   */
  async getLoginHistory(userId: string, limit: number = 50): Promise<any[]> {
    try {
      const history = await db('login_attempts')
        .where({ user_id: userId })
        .orderBy('attempted_at', 'desc')
        .limit(limit)
        .select('*');

      return history.map(h => ({
        attemptedAt: h.attempted_at,
        successful: h.successful,
        ipAddress: h.ip_address,
        location: h.location,
        deviceFingerprint: h.device_fingerprint,
        failureReason: h.failure_reason,
      }));
    } catch (error) {
      logger.error('Error getting login history:', error);
      throw new Error('Failed to get login history');
    }
  }

  /**
   * Generate device fingerprint
   */
  generateDeviceFingerprint(userAgent: string, ipAddress: string, additionalData?: any): string {
    const data = {
      userAgent,
      ipAddress,
      ...additionalData,
    };

    return crypto
      .createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex');
  }

  /**
   * Check if IP is rate limited
   */
  async isIpRateLimited(ipAddress: string, endpoint: string, maxAttempts: number, windowMinutes: number): Promise<boolean> {
    try {
      const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);

      // Count attempts from this IP for this endpoint
      const attempts = await db('login_attempts')
        .where({ ip_address: ipAddress })
        .andWhere('attempted_at', '>', windowStart)
        .count('* as count')
        .first();

      const attemptCount = parseInt(attempts?.count as string || '0');
      return attemptCount >= maxAttempts;
    } catch (error) {
      logger.error('Error checking IP rate limit:', error);
      return false; // Fail open to prevent false positives
    }
  }

  /**
   * Lock account administratively
   */
  async lockAccountAdmin(userId: string, reason: string, isPermanent: boolean, notes?: string): Promise<void> {
    try {
      const user = await db('users').where({ id: userId }).first();
      if (!user) {
        throw new Error('User not found');
      }

      const unlockAt = isPermanent ? null : new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      await db('account_lockouts').insert({
        user_id: userId,
        email: user.email,
        lockout_reason: 'admin_action',
        locked_at: new Date(),
        unlock_at: unlockAt,
        is_permanent: isPermanent,
        notes: notes || reason,
      });

      // Revoke all active sessions
      await this.revokeAllUserSessions(userId);

      logger.warn(`Account locked by admin for user ${userId}: ${reason}`);
    } catch (error) {
      logger.error('Error locking account:', error);
      throw new Error('Failed to lock account');
    }
  }

  /**
   * Unlock account administratively
   */
  async unlockAccountAdmin(userId: string): Promise<void> {
    try {
      await db('account_lockouts')
        .where({ user_id: userId })
        .whereNull('unlocked_at')
        .update({ unlocked_at: new Date() });

      logger.info(`Account unlocked by admin for user ${userId}`);
    } catch (error) {
      logger.error('Error unlocking account:', error);
      throw new Error('Failed to unlock account');
    }
  }
}
