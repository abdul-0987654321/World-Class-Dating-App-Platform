import redisCache from '../../infrastructure/cache/redis';
import emailService from '../../infrastructure/email/email.service';
import logger from '../../utils/logger';

export interface LockoutInfo {
  userId: string;
  isLocked: boolean;
  failedAttempts: number;
  lockoutUntil?: Date;
  lockoutReason?: string;
  canUnlockAt?: Date;
}

export interface LockoutConfig {
  maxAttempts: number;
  lockoutDuration: number; // seconds
  attemptWindow: number; // seconds
}

class AccountLockoutService {
  private readonly defaultConfig: LockoutConfig = {
    maxAttempts: 5,
    lockoutDuration: 30 * 60, // 30 minutes
    attemptWindow: 15 * 60, // 15 minutes
  };

  /**
   * Record failed login attempt
   */
  async recordFailedAttempt(userId: string, ip: string): Promise<LockoutInfo> {
    const key = `lockout:${userId}`;
    const data = await redisCache.get(key);

    let lockoutInfo: LockoutInfo;

    if (data) {
      lockoutInfo = JSON.parse(data);

      // If account is already locked, check if lockout has expired
      if (lockoutInfo.isLocked && lockoutInfo.lockoutUntil) {
        const now = new Date();
        const lockoutUntil = new Date(lockoutInfo.lockoutUntil);

        if (now >= lockoutUntil) {
          // Lockout expired, reset
          lockoutInfo = this.createNewLockoutInfo(userId);
        } else {
          // Still locked
          return lockoutInfo;
        }
      }

      lockoutInfo.failedAttempts += 1;
    } else {
      lockoutInfo = this.createNewLockoutInfo(userId);
      lockoutInfo.failedAttempts = 1;
    }

    // Check if should lock account
    if (lockoutInfo.failedAttempts >= this.defaultConfig.maxAttempts) {
      await this.lockAccount(userId, 'Too many failed login attempts', ip);
      lockoutInfo = await this.getLockoutInfo(userId);
    } else {
      // Save updated info
      await redisCache.set(key, JSON.stringify(lockoutInfo), this.defaultConfig.attemptWindow);
    }

    logger.info(
      `Failed login attempt recorded for user ${userId}. Attempts: ${lockoutInfo.failedAttempts}`
    );

    return lockoutInfo;
  }

  /**
   * Record successful login (reset failed attempts)
   */
  async recordSuccessfulLogin(userId: string): Promise<void> {
    const key = `lockout:${userId}`;
    await redisCache.del(key);

    logger.info(`Successful login for user ${userId}. Failed attempts reset.`);
  }

  /**
   * Lock account
   */
  async lockAccount(userId: string, reason: string, triggeredByIp?: string): Promise<void> {
    const key = `lockout:${userId}`;
    const now = new Date();
    const lockoutUntil = new Date(now.getTime() + this.defaultConfig.lockoutDuration * 1000);

    const lockoutInfo: LockoutInfo = {
      userId,
      isLocked: true,
      failedAttempts: 0,
      lockoutUntil,
      lockoutReason: reason,
      canUnlockAt: lockoutUntil,
    };

    await redisCache.set(key, JSON.stringify(lockoutInfo), this.defaultConfig.lockoutDuration);

    logger.warn(`Account locked for user ${userId}. Reason: ${reason}`);

    // Send notification email
    await this.sendLockoutNotification(userId, lockoutInfo, triggeredByIp);
  }

  /**
   * Unlock account (admin action)
   */
  async unlockAccount(userId: string, unlockedBy: string): Promise<void> {
    const key = `lockout:${userId}`;
    await redisCache.del(key);

    logger.info(`Account unlocked for user ${userId} by ${unlockedBy}`);
  }

  /**
   * Check if account is locked
   */
  async isAccountLocked(userId: string): Promise<boolean> {
    const lockoutInfo = await this.getLockoutInfo(userId);

    if (!lockoutInfo.isLocked) {
      return false;
    }

    // Check if lockout has expired
    if (lockoutInfo.lockoutUntil) {
      const now = new Date();
      const lockoutUntil = new Date(lockoutInfo.lockoutUntil);

      if (now >= lockoutUntil) {
        // Lockout expired, unlock account
        await this.unlockAccount(userId, 'system-auto');
        return false;
      }
    }

    return true;
  }

  /**
   * Get lockout information
   */
  async getLockoutInfo(userId: string): Promise<LockoutInfo> {
    const key = `lockout:${userId}`;
    const data = await redisCache.get(key);

    if (!data) {
      return this.createNewLockoutInfo(userId);
    }

    const lockoutInfo = JSON.parse(data);

    // Convert date strings back to Date objects
    if (lockoutInfo.lockoutUntil) {
      lockoutInfo.lockoutUntil = new Date(lockoutInfo.lockoutUntil);
    }
    if (lockoutInfo.canUnlockAt) {
      lockoutInfo.canUnlockAt = new Date(lockoutInfo.canUnlockAt);
    }

    return lockoutInfo;
  }

  /**
   * Get remaining lockout time in seconds
   */
  async getRemainingLockoutTime(userId: string): Promise<number> {
    const lockoutInfo = await this.getLockoutInfo(userId);

    if (!lockoutInfo.isLocked || !lockoutInfo.lockoutUntil) {
      return 0;
    }

    const now = new Date();
    const lockoutUntil = new Date(lockoutInfo.lockoutUntil);
    const remaining = Math.max(0, lockoutUntil.getTime() - now.getTime());

    return Math.ceil(remaining / 1000);
  }

  /**
   * Permanently lock account (security action)
   */
  async permanentlyLockAccount(userId: string, reason: string, lockedBy: string): Promise<void> {
    const key = `lockout:permanent:${userId}`;

    const lockoutInfo: LockoutInfo = {
      userId,
      isLocked: true,
      failedAttempts: 0,
      lockoutReason: `Permanently locked: ${reason}`,
    };

    // Store with long expiry (1 year)
    await redisCache.set(key, JSON.stringify(lockoutInfo), 365 * 24 * 60 * 60);

    logger.warn(
      `Account permanently locked for user ${userId}. Reason: ${reason}. By: ${lockedBy}`
    );
  }

  /**
   * Check if account is permanently locked
   */
  async isPermanentlyLocked(userId: string): Promise<boolean> {
    const key = `lockout:permanent:${userId}`;
    const data = await redisCache.get(key);

    return !!data;
  }

  /**
   * Get failed attempt count
   */
  async getFailedAttemptCount(userId: string): Promise<number> {
    const lockoutInfo = await this.getLockoutInfo(userId);
    return lockoutInfo.failedAttempts;
  }

  /**
   * Reset failed attempts (admin action)
   */
  async resetFailedAttempts(userId: string): Promise<void> {
    const key = `lockout:${userId}`;
    const data = await redisCache.get(key);

    if (data) {
      const lockoutInfo = JSON.parse(data);
      lockoutInfo.failedAttempts = 0;
      lockoutInfo.isLocked = false;
      lockoutInfo.lockoutUntil = undefined;

      await redisCache.set(key, JSON.stringify(lockoutInfo), this.defaultConfig.attemptWindow);
    }

    logger.info(`Failed attempts reset for user ${userId}`);
  }

  // Private helper methods

  private createNewLockoutInfo(userId: string): LockoutInfo {
    return {
      userId,
      isLocked: false,
      failedAttempts: 0,
    };
  }

  private async sendLockoutNotification(
    userId: string,
    lockoutInfo: LockoutInfo,
    triggeredByIp?: string
  ): Promise<void> {
    try {
      // In production, get user email and send notification
      logger.info('Lockout notification would be sent', {
        userId,
        lockoutUntil: lockoutInfo.lockoutUntil,
        triggeredByIp,
      });

      // Placeholder for actual email sending
      // await emailService.sendAccountLockedEmail(userEmail, lockoutInfo);
    } catch (error) {
      logger.error('Failed to send lockout notification', error);
    }
  }
}

export const accountLockoutService = new AccountLockoutService();
export default accountLockoutService;
