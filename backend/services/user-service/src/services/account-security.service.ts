import { Request, Response, NextFunction } from 'express';
import { Knex } from 'knex';

import logger from '../utils/logger';

interface LoginAttempt {
  id: string;
  user_id?: string;
  email: string;
  ip_address: string;
  user_agent?: string;
  success: boolean;
  attempted_at: Date;
  failure_reason?: string;
}

interface AccountLockout {
  id: string;
  user_id: string;
  locked_at: Date;
  locked_until: Date;
  reason: string;
  lock_type: 'temporary' | 'permanent';
  unlock_token?: string;
  unlocked_at?: Date;
  unlocked_by?: string;
}

/**
 * Account Security Service
 * Handles login attempts, account lockouts, and brute force protection
 */
export class AccountSecurityService {
  private db: Knex;
  private readonly MAX_LOGIN_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION_MINUTES = 30;
  private readonly ATTEMPT_WINDOW_MINUTES = 15;
  private readonly IP_RATE_LIMIT = 20; // Max attempts per IP in window
  private rateLimitCache: Map<string, number[]> = new Map();

  constructor(database: Knex) {
    this.db = database;
  }

  /**
   * Record login attempt
   */
  async recordLoginAttempt(
    email: string,
    ipAddress: string,
    success: boolean,
    userId?: string,
    userAgent?: string,
    failureReason?: string
  ): Promise<void> {
    try {
      await this.db('login_attempts').insert({
        user_id: userId,
        email: email.toLowerCase(),
        ip_address: ipAddress,
        user_agent: userAgent,
        success,
        attempted_at: new Date(),
        failure_reason: failureReason,
      });

      logger.info(
        `Login attempt recorded: ${email} from ${ipAddress} - ${success ? 'Success' : 'Failed'}`
      );

      // Check if account should be locked
      if (!success && userId) {
        await this.checkAndLockAccount(userId, email, ipAddress);
      }
    } catch (error) {
      logger.error(`Failed to record login attempt: ${error}`);
      // Don't throw - logging failure shouldn't block login
    }
  }

  /**
   * Check if account should be locked after failed attempts
   */
  private async checkAndLockAccount(
    userId: string,
    email: string,
    ipAddress: string
  ): Promise<void> {
    try {
      const windowStart = new Date(Date.now() - this.ATTEMPT_WINDOW_MINUTES * 60 * 1000);

      // Count failed attempts in window
      const failedAttempts = await this.db('login_attempts')
        .where({ user_id: userId, success: false })
        .where('attempted_at', '>', windowStart)
        .count('* as count')
        .first();

      const count = parseInt((failedAttempts?.count as string) || '0');

      if (count >= this.MAX_LOGIN_ATTEMPTS) {
        await this.lockAccount(
          userId,
          'temporary',
          `Too many failed login attempts (${count})`,
          this.LOCKOUT_DURATION_MINUTES
        );

        logger.warn(`Account locked due to failed login attempts: ${email}`);
      }
    } catch (error) {
      logger.error(`Failed to check account lockout: ${error}`);
    }
  }

  /**
   * Lock user account
   */
  async lockAccount(
    userId: string,
    lockType: 'temporary' | 'permanent',
    reason: string,
    durationMinutes?: number
  ): Promise<AccountLockout> {
    try {
      const lockedUntil =
        lockType === 'temporary' && durationMinutes
          ? new Date(Date.now() + durationMinutes * 60 * 1000)
          : new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000); // 100 years for permanent

      const unlockToken =
        lockType === 'temporary' ? require('crypto').randomBytes(32).toString('hex') : undefined;

      const [lockout] = await this.db('account_lockouts')
        .insert({
          user_id: userId,
          locked_at: new Date(),
          locked_until: lockedUntil,
          reason,
          lock_type: lockType,
          unlock_token: unlockToken,
        })
        .returning('*');

      // Update user status
      await this.db('users').where({ id: userId }).update({ is_locked: true });

      logger.info(`Account locked: ${userId} - ${lockType} - ${reason}`);

      return lockout;
    } catch (error) {
      logger.error(`Failed to lock account: ${error}`);
      throw error;
    }
  }

  /**
   * Unlock user account
   */
  async unlockAccount(userId: string, unlockToken?: string, unlockedBy?: string): Promise<boolean> {
    try {
      // Get active lockout
      const lockout = await this.db('account_lockouts')
        .where({ user_id: userId })
        .whereNull('unlocked_at')
        .orderBy('locked_at', 'desc')
        .first();

      if (!lockout) {
        throw new Error('No active lockout found');
      }

      // Verify unlock token for temporary locks
      if (lockout.lock_type === 'temporary' && unlockToken) {
        if (lockout.unlock_token !== unlockToken) {
          throw new Error('Invalid unlock token');
        }
      }

      // Check if lock has expired
      const now = new Date();
      if (lockout.lock_type === 'temporary' && now < new Date(lockout.locked_until)) {
        throw new Error('Lock has not expired yet');
      }

      // Unlock account
      await this.db('account_lockouts').where({ id: lockout.id }).update({
        unlocked_at: new Date(),
        unlocked_by: unlockedBy,
      });

      // Update user status
      await this.db('users').where({ id: userId }).update({ is_locked: false });

      // Clear failed login attempts
      await this.db('login_attempts').where({ user_id: userId, success: false }).delete();

      logger.info(`Account unlocked: ${userId}`);

      return true;
    } catch (error) {
      logger.error(`Failed to unlock account: ${error}`);
      throw error;
    }
  }

  /**
   * Check if account is locked
   */
  async isAccountLocked(userId: string): Promise<{
    isLocked: boolean;
    lockout?: AccountLockout;
  }> {
    try {
      const lockout = await this.db('account_lockouts')
        .where({ user_id: userId })
        .whereNull('unlocked_at')
        .where('locked_until', '>', new Date())
        .orderBy('locked_at', 'desc')
        .first();

      return {
        isLocked: !!lockout,
        lockout: lockout || undefined,
      };
    } catch (error) {
      logger.error(`Failed to check account lock status: ${error}`);
      return { isLocked: false };
    }
  }

  /**
   * Check IP-based rate limiting
   */
  async checkIPRateLimit(ipAddress: string): Promise<boolean> {
    try {
      const now = Date.now();
      const windowStart = now - this.ATTEMPT_WINDOW_MINUTES * 60 * 1000;

      // Get or initialize IP attempts
      let attempts = this.rateLimitCache.get(ipAddress) || [];

      // Filter attempts within window
      attempts = attempts.filter((timestamp) => timestamp > windowStart);

      // Check if limit exceeded
      if (attempts.length >= this.IP_RATE_LIMIT) {
        logger.warn(`IP rate limit exceeded: ${ipAddress}`);
        return false;
      }

      // Add current attempt
      attempts.push(now);
      this.rateLimitCache.set(ipAddress, attempts);

      // Clean up old entries
      this.cleanupRateLimitCache();

      return true;
    } catch (error) {
      logger.error(`Failed to check IP rate limit: ${error}`);
      return true; // Allow on error to prevent blocking legitimate users
    }
  }

  /**
   * Clean up old rate limit cache entries
   */
  private cleanupRateLimitCache(): void {
    const now = Date.now();
    const windowStart = now - this.ATTEMPT_WINDOW_MINUTES * 60 * 1000;

    for (const [ip, attempts] of this.rateLimitCache.entries()) {
      const validAttempts = attempts.filter((timestamp) => timestamp > windowStart);

      if (validAttempts.length === 0) {
        this.rateLimitCache.delete(ip);
      } else {
        this.rateLimitCache.set(ip, validAttempts);
      }
    }
  }

  /**
   * Get login attempt history
   */
  async getLoginAttempts(userId: string, limit: number = 50): Promise<LoginAttempt[]> {
    try {
      return this.db('login_attempts')
        .where({ user_id: userId })
        .orderBy('attempted_at', 'desc')
        .limit(limit)
        .select('*');
    } catch (error) {
      logger.error(`Failed to get login attempts: ${error}`);
      return [];
    }
  }

  /**
   * Get account lockout history
   */
  async getLockoutHistory(userId: string): Promise<AccountLockout[]> {
    try {
      return this.db('account_lockouts')
        .where({ user_id: userId })
        .orderBy('locked_at', 'desc')
        .select('*');
    } catch (error) {
      logger.error(`Failed to get lockout history: ${error}`);
      return [];
    }
  }

  /**
   * Clean up old login attempts (keep for 90 days)
   */
  async cleanupOldLoginAttempts(): Promise<void> {
    try {
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

      const deleted = await this.db('login_attempts')
        .where('attempted_at', '<', ninetyDaysAgo)
        .delete();

      logger.info(`Cleaned up ${deleted} old login attempts`);
    } catch (error) {
      logger.error(`Failed to cleanup old login attempts: ${error}`);
    }
  }

  /**
   * Automatically unlock expired temporary locks
   */
  async unlockExpiredAccounts(): Promise<void> {
    try {
      const expiredLocks = await this.db('account_lockouts')
        .where('lock_type', 'temporary')
        .whereNull('unlocked_at')
        .where('locked_until', '<', new Date())
        .select('*');

      for (const lock of expiredLocks) {
        await this.unlockAccount(lock.user_id, undefined, 'system');
      }

      logger.info(`Auto-unlocked ${expiredLocks.length} expired accounts`);
    } catch (error) {
      logger.error(`Failed to unlock expired accounts: ${error}`);
    }
  }

  /**
   * Get security metrics
   */
  async getSecurityMetrics(timeWindow: number = 24): Promise<any> {
    try {
      const windowStart = new Date(Date.now() - timeWindow * 60 * 60 * 1000);

      // Failed login attempts
      const failedLogins = await this.db('login_attempts')
        .where({ success: false })
        .where('attempted_at', '>', windowStart)
        .count('* as count')
        .first();

      // Successful logins
      const successfulLogins = await this.db('login_attempts')
        .where({ success: true })
        .where('attempted_at', '>', windowStart)
        .count('* as count')
        .first();

      // Active lockouts
      const activeLockouts = await this.db('account_lockouts')
        .whereNull('unlocked_at')
        .where('locked_until', '>', new Date())
        .count('* as count')
        .first();

      // Top IPs with failed attempts
      const topFailedIPs = await this.db('login_attempts')
        .where({ success: false })
        .where('attempted_at', '>', windowStart)
        .groupBy('ip_address')
        .select('ip_address')
        .count('* as count')
        .orderBy('count', 'desc')
        .limit(10);

      return {
        timeWindow: `${timeWindow} hours`,
        failedLogins: parseInt((failedLogins?.count as string) || '0'),
        successfulLogins: parseInt((successfulLogins?.count as string) || '0'),
        activeLockouts: parseInt((activeLockouts?.count as string) || '0'),
        topFailedIPs,
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      logger.error(`Failed to get security metrics: ${error}`);
      throw error;
    }
  }

  /**
   * Rate limiting middleware
   */
  rateLimitMiddleware() {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';

      const allowed = await this.checkIPRateLimit(ipAddress);

      if (!allowed) {
        res.status(429).json({
          success: false,
          message: 'Too many requests. Please try again later.',
        });
        return;
      }

      next();
    };
  }

  /**
   * Account lockout check middleware
   */
  lockoutCheckMiddleware() {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const userId = req.user?.id;

      if (!userId) {
        return next();
      }

      const { isLocked, lockout } = await this.isAccountLocked(userId);

      if (isLocked && lockout) {
        res.status(403).json({
          success: false,
          message: 'Account is locked',
          data: {
            reason: lockout.reason,
            lockedUntil: lockout.locked_until,
            lockType: lockout.lock_type,
          },
        });
        return;
      }

      next();
    };
  }
}
