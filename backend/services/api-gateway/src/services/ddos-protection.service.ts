import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import Redis from 'ioredis';

import { DDOS_PROTECTION, parseTimeWindow, isWhitelisted } from '../config/rate-limit.config';

export interface DDoSCheckResult {
  allowed: boolean;
  reason?: string;
  blockDuration?: number;
  violations?: number;
}

export interface IPBanInfo {
  ip: string;
  reason: string;
  bannedAt: number;
  expiresAt: number;
  violations: number;
  fingerprint?: string;
}

/**
 * DDoS Protection Service
 * Provides IP-based rate limiting, request fingerprinting, and automatic banning
 */
@Injectable()
export class DDoSProtectionService {
  private readonly logger = new Logger(DDoSProtectionService.name);
  private readonly redis: Redis;

  constructor(private readonly configService: ConfigService) {
    // Initialize Redis connection
    this.redis = new Redis({
      host: this.configService.get<string>('redis.host'),
      port: this.configService.get<number>('redis.port'),
      password: this.configService.get<string>('redis.password'),
      db: this.configService.get<number>('redis.db') || 0,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    this.redis.on('error', (error) => {
      this.logger.error('Redis connection error:', error);
    });

    this.redis.on('connect', () => {
      this.logger.log('Connected to Redis for DDoS protection');
    });
  }

  /**
   * Check if request should be allowed based on DDoS protection rules
   */
  async checkRequest(req: Request, clientIp: string): Promise<DDoSCheckResult> {
    try {
      // Check if DDoS protection is disabled
      if (!DDOS_PROTECTION.enabled) {
        return { allowed: true };
      }

      // Check if IP is whitelisted (internal/private IPs)
      if (isWhitelisted(clientIp)) {
        return { allowed: true };
      }

      // Check if IP is permanently banned
      const permanentBan = await this.isPermanentlyBanned(clientIp);
      if (permanentBan) {
        this.logger.warn(`Blocked permanently banned IP: ${clientIp}`);
        return {
          allowed: false,
          reason: 'IP permanently banned',
        };
      }

      // Check if IP is temporarily banned
      const tempBan = await this.isTemporarilyBanned(clientIp);
      if (tempBan) {
        this.logger.warn(`Blocked temporarily banned IP: ${clientIp}`);
        return {
          allowed: false,
          reason: 'IP temporarily banned',
          blockDuration: tempBan.remainingTime,
        };
      }

      // Generate request fingerprint
      const fingerprint = this.generateFingerprint(req);

      // Check burst protection (10 seconds window)
      const burstCheck = await this.checkBurstProtection(clientIp);
      if (!burstCheck.allowed) {
        await this.recordViolation(clientIp, 'burst', fingerprint);
        return burstCheck;
      }

      // Check sustained traffic protection (1 minute window)
      const sustainedCheck = await this.checkSustainedProtection(clientIp);
      if (!sustainedCheck.allowed) {
        await this.recordViolation(clientIp, 'sustained', fingerprint);
        return sustainedCheck;
      }

      // Check hourly protection
      const hourlyCheck = await this.checkHourlyProtection(clientIp);
      if (!hourlyCheck.allowed) {
        await this.recordViolation(clientIp, 'hourly', fingerprint);
        return hourlyCheck;
      }

      return { allowed: true };
    } catch (error) {
      this.logger.error('DDoS check error:', error);
      // Fail open - allow request if check fails
      return { allowed: true };
    }
  }

  /**
   * Check burst protection (high frequency in short time)
   */
  private async checkBurstProtection(clientIp: string): Promise<DDoSCheckResult> {
    const config = DDOS_PROTECTION.ip.burst;
    const windowSeconds = parseTimeWindow(config.window);
    const key = `ddos:burst:${clientIp}`;

    const count = await this.incrementCounter(key, windowSeconds);

    if (count > config.max) {
      const blockSeconds = parseTimeWindow(config.blockDuration);
      await this.banIP(clientIp, blockSeconds, 'burst protection violation');

      return {
        allowed: false,
        reason: 'Burst rate limit exceeded',
        blockDuration: blockSeconds,
      };
    }

    return { allowed: true };
  }

  /**
   * Check sustained traffic protection
   */
  private async checkSustainedProtection(clientIp: string): Promise<DDoSCheckResult> {
    const config = DDOS_PROTECTION.ip.sustained;
    const windowSeconds = parseTimeWindow(config.window);
    const key = `ddos:sustained:${clientIp}`;

    const count = await this.incrementCounter(key, windowSeconds);

    if (count > config.max) {
      const blockSeconds = parseTimeWindow(config.blockDuration);
      await this.banIP(clientIp, blockSeconds, 'sustained traffic violation');

      return {
        allowed: false,
        reason: 'Sustained rate limit exceeded',
        blockDuration: blockSeconds,
      };
    }

    return { allowed: true };
  }

  /**
   * Check hourly protection
   */
  private async checkHourlyProtection(clientIp: string): Promise<DDoSCheckResult> {
    const config = DDOS_PROTECTION.ip.hourly;
    const windowSeconds = parseTimeWindow(config.window);
    const key = `ddos:hourly:${clientIp}`;

    const count = await this.incrementCounter(key, windowSeconds);

    if (count > config.max) {
      const blockSeconds = parseTimeWindow(config.blockDuration);
      await this.banIP(clientIp, blockSeconds, 'hourly limit violation');

      return {
        allowed: false,
        reason: 'Hourly rate limit exceeded',
        blockDuration: blockSeconds,
      };
    }

    return { allowed: true };
  }

  /**
   * Increment counter with sliding window
   */
  private async incrementCounter(key: string, windowSeconds: number): Promise<number> {
    const now = Date.now();
    const windowStart = now - windowSeconds * 1000;

    const pipeline = this.redis.pipeline();
    pipeline.zremrangebyscore(key, 0, windowStart);
    pipeline.zadd(key, now, `${now}-${Math.random()}`);
    pipeline.zcard(key);
    pipeline.expire(key, windowSeconds);

    const results = await pipeline.exec();
    if (!results) {
      throw new Error('Redis pipeline execution failed');
    }

    // Redis pipeline returns [err, result] tuples; guard against errors
    const zcardResult = results[2];
    if (!zcardResult || zcardResult[0]) {
      this.logger.warn('Redis ZCARD command failed in DDoS counter', zcardResult?.[0]);
      return 0;
    }
    return (zcardResult[1] as number) || 0;
  }

  /**
   * Ban IP address temporarily
   */
  async banIP(ip: string, durationSeconds: number, reason: string): Promise<void> {
    const key = `ddos:banned:${ip}`;
    const banInfo: IPBanInfo = {
      ip,
      reason,
      bannedAt: Date.now(),
      expiresAt: Date.now() + durationSeconds * 1000,
      violations: await this.getViolationCount(ip),
    };

    await this.redis.setex(key, durationSeconds, JSON.stringify(banInfo));

    this.logger.warn(`Banned IP ${ip} for ${durationSeconds}s - Reason: ${reason}`);
  }

  /**
   * Check if IP is temporarily banned
   */
  private async isTemporarilyBanned(
    ip: string
  ): Promise<{ banned: boolean; remainingTime?: number }> {
    const key = `ddos:banned:${ip}`;
    const banData = await this.redis.get(key);

    if (!banData) {
      return { banned: false };
    }

    const ttl = await this.redis.ttl(key);
    return {
      banned: true,
      remainingTime: ttl > 0 ? ttl : 0,
    };
  }

  /**
   * Permanently ban IP address
   */
  async permanentlyBanIP(ip: string, reason: string): Promise<void> {
    const key = `ddos:permanent:${ip}`;
    const banInfo: IPBanInfo = {
      ip,
      reason,
      bannedAt: Date.now(),
      expiresAt: -1, // Never expires
      violations: await this.getViolationCount(ip),
    };

    await this.redis.set(key, JSON.stringify(banInfo));

    this.logger.warn(`Permanently banned IP ${ip} - Reason: ${reason}`);
  }

  /**
   * Check if IP is permanently banned
   */
  private async isPermanentlyBanned(ip: string): Promise<boolean> {
    const key = `ddos:permanent:${ip}`;
    const exists = await this.redis.exists(key);
    return exists === 1;
  }

  /**
   * Record violation and escalate if necessary
   */
  private async recordViolation(ip: string, type: string, fingerprint: string): Promise<void> {
    const violationKey = `ddos:violations:${ip}`;
    const trackingWindow = parseTimeWindow(DDOS_PROTECTION.violations.trackingWindow);

    // Add violation to sorted set
    const now = Date.now();
    await this.redis.zadd(violationKey, now, `${now}-${type}-${fingerprint}`);

    // Remove old violations
    const windowStart = now - trackingWindow * 1000;
    await this.redis.zremrangebyscore(violationKey, 0, windowStart);

    // Set expiration
    await this.redis.expire(violationKey, trackingWindow);

    // Count violations
    const violationCount = await this.redis.zcard(violationKey);

    this.logger.warn(`Violation recorded for ${ip}: ${type} (Total: ${violationCount})`);

    // Escalate ban if too many violations
    if (violationCount >= DDOS_PROTECTION.violations.maxViolations) {
      await this.permanentlyBanIP(ip, `Exceeded maximum violations (${violationCount})`);
    } else {
      // Apply escalating ban duration
      const banIndex = Math.min(
        violationCount - 1,
        DDOS_PROTECTION.violations.banDurations.length - 1
      );
      const banDuration = DDOS_PROTECTION.violations.banDurations[banIndex];

      if (banDuration !== 'permanent') {
        const banSeconds = parseTimeWindow(banDuration);
        await this.banIP(ip, banSeconds, `Violation escalation (${type})`);
      }
    }
  }

  /**
   * Get violation count for IP
   */
  async getViolationCount(ip: string): Promise<number> {
    const key = `ddos:violations:${ip}`;
    return await this.redis.zcard(key);
  }

  /**
   * Generate request fingerprint for additional tracking
   */
  private generateFingerprint(req: Request): string {
    if (!DDOS_PROTECTION.fingerprint.enabled) {
      return '';
    }

    const factors = DDOS_PROTECTION.fingerprint.factors;
    const parts: string[] = [];

    for (const factor of factors) {
      const value = req.headers[factor];
      if (value) {
        parts.push(`${factor}:${value}`);
      }
    }

    // Simple hash (not cryptographic, just for tracking)
    return Buffer.from(parts.join('|')).toString('base64');
  }

  /**
   * Unban IP address (admin function)
   */
  async unbanIP(ip: string): Promise<void> {
    const tempKey = `ddos:banned:${ip}`;
    const permKey = `ddos:permanent:${ip}`;

    await this.redis.del(tempKey, permKey);

    this.logger.log(`Unbanned IP: ${ip}`);
  }

  /**
   * Get ban info for IP
   */
  async getBanInfo(ip: string): Promise<IPBanInfo | null> {
    // Check temporary ban
    const tempKey = `ddos:banned:${ip}`;
    const tempData = await this.redis.get(tempKey);

    if (tempData) {
      try {
        return JSON.parse(tempData);
      } catch {
        this.logger.warn(`Corrupted ban data for IP ${ip}, removing key`);
        await this.redis.del(tempKey);
      }
    }

    // Check permanent ban
    const permKey = `ddos:permanent:${ip}`;
    const permData = await this.redis.get(permKey);

    if (permData) {
      try {
        return JSON.parse(permData);
      } catch {
        this.logger.warn(`Corrupted permanent ban data for IP ${ip}, removing key`);
        await this.redis.del(permKey);
      }
    }

    return null;
  }

  /**
   * Get all banned IPs
   */
  async getAllBannedIPs(): Promise<IPBanInfo[]> {
    const bannedIPs: IPBanInfo[] = [];

    // Get temporary bans
    const tempKeys = await this.redis.keys('ddos:banned:*');
    for (const key of tempKeys) {
      const data = await this.redis.get(key);
      if (data) {
        try {
          bannedIPs.push(JSON.parse(data));
        } catch {
          this.logger.warn(`Corrupted ban data at key ${key}, skipping`);
        }
      }
    }

    // Get permanent bans
    const permKeys = await this.redis.keys('ddos:permanent:*');
    for (const key of permKeys) {
      const data = await this.redis.get(key);
      if (data) {
        try {
          bannedIPs.push(JSON.parse(data));
        } catch {
          this.logger.warn(`Corrupted permanent ban data at key ${key}, skipping`);
        }
      }
    }

    return bannedIPs;
  }

  /**
   * Clear violation history for IP (admin function)
   */
  async clearViolations(ip: string): Promise<void> {
    const key = `ddos:violations:${ip}`;
    await this.redis.del(key);

    this.logger.log(`Cleared violation history for IP: ${ip}`);
  }

  /**
   * Get DDoS protection statistics
   */
  async getStats(): Promise<{
    totalBanned: number;
    temporaryBans: number;
    permanentBans: number;
    activeViolations: number;
  }> {
    const tempKeys = await this.redis.keys('ddos:banned:*');
    const permKeys = await this.redis.keys('ddos:permanent:*');
    const violationKeys = await this.redis.keys('ddos:violations:*');

    return {
      totalBanned: tempKeys.length + permKeys.length,
      temporaryBans: tempKeys.length,
      permanentBans: permKeys.length,
      activeViolations: violationKeys.length,
    };
  }

  /**
   * Cleanup on module destroy
   */
  async onModuleDestroy(): Promise<void> {
    await this.redis.quit();
    this.logger.log('DDoS protection service stopped');
  }
}
