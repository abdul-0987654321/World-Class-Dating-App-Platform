import redisCache from '../../infrastructure/cache/redis';
import emailService from '../../infrastructure/email/email.service';
import logger from '../../utils/logger';

export interface LoginAttempt {
  userId: string;
  ip: string;
  userAgent: string;
  timestamp: Date;
  success: boolean;
  location?: string;
  deviceFingerprint?: string;
}

export interface SuspicionIndicators {
  newDevice: boolean;
  newLocation: boolean;
  impossibleTravel: boolean;
  unusualTime: boolean;
  rapidAttempts: boolean;
  multipleFailures: boolean;
  score: number;
}

class SuspiciousLoginDetectorService {
  private readonly ATTEMPT_WINDOW = 15 * 60; // 15 minutes
  private readonly MAX_ATTEMPTS_PER_WINDOW = 5;
  private readonly TRAVEL_SPEED_THRESHOLD = 800; // km/h

  /**
   * Analyze login attempt for suspicious activity
   */
  async analyzeLoginAttempt(attempt: LoginAttempt): Promise<SuspicionIndicators> {
    const indicators: SuspicionIndicators = {
      newDevice: false,
      newLocation: false,
      impossibleTravel: false,
      unusualTime: false,
      rapidAttempts: false,
      multipleFailures: false,
      score: 0,
    };

    // Get recent login history
    const recentAttempts = await this.getRecentAttempts(attempt.userId);

    // Check for new device
    indicators.newDevice = await this.isNewDevice(attempt.userId, attempt.deviceFingerprint);
    if (indicators.newDevice) indicators.score += 20;

    // Check for new location
    indicators.newLocation = await this.isNewLocation(attempt.userId, attempt.ip);
    if (indicators.newLocation) indicators.score += 15;

    // Check for impossible travel
    if (recentAttempts.length > 0) {
      const lastAttempt = recentAttempts[0];
      indicators.impossibleTravel = await this.detectImpossibleTravel(lastAttempt, attempt);
      if (indicators.impossibleTravel) indicators.score += 40;
    }

    // Check for unusual time
    indicators.unusualTime = this.isUnusualTime(attempt.timestamp);
    if (indicators.unusualTime) indicators.score += 10;

    // Check for rapid attempts
    indicators.rapidAttempts = recentAttempts.length >= this.MAX_ATTEMPTS_PER_WINDOW;
    if (indicators.rapidAttempts) indicators.score += 25;

    // Check for multiple failures
    const recentFailures = recentAttempts.filter((a) => !a.success).length;
    indicators.multipleFailures = recentFailures >= 3;
    if (indicators.multipleFailures) indicators.score += 30;

    // Record this attempt
    await this.recordAttempt(attempt);

    // Log if suspicious
    if (indicators.score >= 50) {
      logger.warn('Suspicious login detected', {
        userId: attempt.userId,
        indicators,
        score: indicators.score,
      });

      // Send security alert email
      await this.sendSecurityAlert(attempt, indicators);
    }

    return indicators;
  }

  /**
   * Check if device is new
   */
  private async isNewDevice(userId: string, deviceFingerprint?: string): Promise<boolean> {
    if (!deviceFingerprint) {
      return false;
    }

    const key = `device:${userId}:${deviceFingerprint}`;
    const exists = await redisCache.get(key);

    return !exists;
  }

  /**
   * Check if location is new
   */
  private async isNewLocation(userId: string, ip: string): Promise<boolean> {
    const key = `locations:${userId}`;
    const knownIps = await redisCache.getList(key);

    return !knownIps.includes(ip);
  }

  /**
   * Detect impossible travel
   */
  private async detectImpossibleTravel(
    lastAttempt: LoginAttempt,
    currentAttempt: LoginAttempt
  ): Promise<boolean> {
    // If same IP, not impossible travel
    if (lastAttempt.ip === currentAttempt.ip) {
      return false;
    }

    // Calculate time difference in hours
    const timeDiff =
      (currentAttempt.timestamp.getTime() - lastAttempt.timestamp.getTime()) / (1000 * 60 * 60);

    // If more than 12 hours, not impossible
    if (timeDiff > 12) {
      return false;
    }

    // Estimate distance (simplified - in production, use geolocation API)
    const distance = await this.estimateDistance(lastAttempt.ip, currentAttempt.ip);

    // Calculate required speed
    const speed = distance / timeDiff;

    // Check if speed exceeds threshold
    return speed > this.TRAVEL_SPEED_THRESHOLD;
  }

  /**
   * Check if login time is unusual
   */
  private isUnusualTime(timestamp: Date): boolean {
    const hour = timestamp.getHours();

    // Consider 2 AM - 6 AM as unusual
    return hour >= 2 && hour < 6;
  }

  /**
   * Record login attempt
   */
  private async recordAttempt(attempt: LoginAttempt): Promise<void> {
    const key = `attempts:${attempt.userId}`;
    const attempts = await redisCache.getList(key);

    attempts.unshift(JSON.stringify(attempt));

    // Keep only last 20 attempts
    const trimmed = attempts.slice(0, 20);

    await redisCache.setList(key, trimmed);
    await redisCache.expire(key, 24 * 60 * 60); // 24 hours

    // Record location if new
    if (attempt.success) {
      await this.recordLocation(attempt.userId, attempt.ip);
    }
  }

  /**
   * Get recent login attempts
   */
  private async getRecentAttempts(userId: string): Promise<LoginAttempt[]> {
    const key = `attempts:${userId}`;
    const data = await redisCache.getList(key);

    if (!data || data.length === 0) {
      return [];
    }

    return data
      .map((item) => {
        try {
          const parsed = JSON.parse(item);
          return {
            ...parsed,
            timestamp: new Date(parsed.timestamp),
          };
        } catch {
          return null;
        }
      })
      .filter((item) => item !== null) as LoginAttempt[];
  }

  /**
   * Record known location
   */
  private async recordLocation(userId: string, ip: string): Promise<void> {
    const key = `locations:${userId}`;
    await redisCache.addToList(key, ip);
    await redisCache.expire(key, 90 * 24 * 60 * 60); // 90 days
  }

  /**
   * Estimate distance between IPs (simplified)
   */
  private async estimateDistance(ip1: string, ip2: string): Promise<number> {
    // In production, use a geolocation service like MaxMind
    // For now, return a random distance for demonstration

    // If IPs are in same subnet, assume close distance
    const subnet1 = ip1.split('.').slice(0, 2).join('.');
    const subnet2 = ip2.split('.').slice(0, 2).join('.');

    if (subnet1 === subnet2) {
      return 50; // 50 km
    }

    // Otherwise assume significant distance
    return 5000; // 5000 km
  }

  /**
   * Send security alert email
   */
  private async sendSecurityAlert(
    attempt: LoginAttempt,
    indicators: SuspicionIndicators
  ): Promise<void> {
    try {
      // In production, get user email and send alert
      logger.info('Security alert would be sent', {
        userId: attempt.userId,
        indicators,
      });

      // Placeholder for actual email sending
      // await emailService.sendSecurityAlert(userEmail, attempt, indicators);
    } catch (error) {
      logger.error('Failed to send security alert', error);
    }
  }

  /**
   * Check if account should be temporarily locked
   */
  async shouldLockAccount(userId: string): Promise<boolean> {
    const recentAttempts = await this.getRecentAttempts(userId);

    // Count failed attempts in last 15 minutes
    const cutoff = new Date(Date.now() - this.ATTEMPT_WINDOW * 1000);
    const recentFailures = recentAttempts.filter((a) => !a.success && a.timestamp >= cutoff).length;

    return recentFailures >= 5;
  }

  /**
   * Get suspicion score for user
   */
  async getSuspicionScore(userId: string): Promise<number> {
    const recentAttempts = await this.getRecentAttempts(userId);

    if (recentAttempts.length === 0) {
      return 0;
    }

    let score = 0;

    // Recent failures
    const recentFailures = recentAttempts.filter((a) => !a.success).length;
    score += recentFailures * 10;

    // Multiple different IPs
    const uniqueIps = new Set(recentAttempts.map((a) => a.ip)).size;
    if (uniqueIps > 3) {
      score += 20;
    }

    // Rapid attempts
    if (recentAttempts.length > 10) {
      score += 30;
    }

    return Math.min(score, 100);
  }
}

export const suspiciousLoginDetectorService = new SuspiciousLoginDetectorService();
export default suspiciousLoginDetectorService;
