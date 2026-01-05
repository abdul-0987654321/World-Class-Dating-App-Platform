import crypto from 'crypto';
import https from 'https';

import logger from '../../utils/logger';

export interface BreachCheckResult {
  isBreached: boolean;
  breachCount: number;
  message: string;
}

class PasswordBreachCheckerService {
  private readonly HIBP_API_URL = 'api.pwnedpasswords.com';
  private readonly CACHE_TTL = 24 * 60 * 60; // 24 hours
  private breachCache: Map<string, { breached: boolean; count: number; timestamp: number }> =
    new Map();

  /**
   * Check if password has been breached using HaveIBeenPwned API
   * Uses k-anonymity model - only sends first 5 chars of hash
   */
  async checkPasswordBreach(password: string): Promise<BreachCheckResult> {
    try {
      // Generate SHA-1 hash of password
      const hash = crypto.createHash('sha1').update(password).digest('hex').toUpperCase();
      const hashPrefix = hash.substring(0, 5);
      const hashSuffix = hash.substring(5);

      // Check cache first
      const cached = this.getCachedResult(hash);
      if (cached) {
        return {
          isBreached: cached.breached,
          breachCount: cached.count,
          message: cached.breached
            ? `This password has been found in ${cached.count} data breaches. Please choose a different password.`
            : 'Password has not been found in known data breaches.',
        };
      }

      // Query HIBP API with hash prefix
      const breachCount = await this.queryHIBPApi(hashPrefix, hashSuffix);

      // Cache result
      this.cacheResult(hash, breachCount > 0, breachCount);

      const result: BreachCheckResult = {
        isBreached: breachCount > 0,
        breachCount,
        message:
          breachCount > 0
            ? `This password has been found in ${breachCount} data breaches. Please choose a different password.`
            : 'Password has not been found in known data breaches.',
      };

      if (breachCount > 0) {
        logger.warn('Password found in breach database', {
          breachCount,
          hashPrefix,
        });
      }

      return result;
    } catch (error) {
      logger.error('Password breach check failed', error);

      // On error, allow password (fail open for availability)
      // But log the error for investigation
      return {
        isBreached: false,
        breachCount: 0,
        message: 'Unable to verify password breach status. Password accepted.',
      };
    }
  }

  /**
   * Check if password is commonly breached (high threshold)
   */
  async isCommonlyBreached(password: string, threshold: number = 100): Promise<boolean> {
    const result = await this.checkPasswordBreach(password);
    return result.isBreached && result.breachCount >= threshold;
  }

  /**
   * Query HaveIBeenPwned API
   */
  private queryHIBPApi(hashPrefix: string, hashSuffix: string): Promise<number> {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: this.HIBP_API_URL,
        port: 443,
        path: `/range/${hashPrefix}`,
        method: 'GET',
        headers: {
          'User-Agent': 'Flamoral-Dating-Platform',
          'Add-Padding': 'true', // Request padded responses for additional privacy
        },
        timeout: 5000, // 5 second timeout
      };

      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          if (res.statusCode === 200) {
            // Parse response to find matching hash suffix
            const breachCount = this.parseHIBPResponse(data, hashSuffix);
            resolve(breachCount);
          } else if (res.statusCode === 404) {
            // No breaches found for this hash prefix
            resolve(0);
          } else {
            reject(new Error(`HIBP API returned status code: ${res.statusCode}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('HIBP API request timed out'));
      });

      req.end();
    });
  }

  /**
   * Parse HIBP API response to find breach count
   */
  private parseHIBPResponse(response: string, hashSuffix: string): number {
    const lines = response.split('\n');

    for (const line of lines) {
      const [suffix, countStr] = line.split(':');

      if (suffix && suffix.trim() === hashSuffix) {
        return parseInt(countStr.trim(), 10) || 0;
      }
    }

    return 0; // Hash suffix not found in breaches
  }

  /**
   * Get cached breach check result
   */
  private getCachedResult(hash: string): { breached: boolean; count: number } | null {
    const cached = this.breachCache.get(hash);

    if (!cached) {
      return null;
    }

    // Check if cache entry is expired
    const now = Date.now();
    if (now - cached.timestamp > this.CACHE_TTL * 1000) {
      this.breachCache.delete(hash);
      return null;
    }

    return {
      breached: cached.breached,
      count: cached.count,
    };
  }

  /**
   * Cache breach check result
   */
  private cacheResult(hash: string, breached: boolean, count: number): void {
    this.breachCache.set(hash, {
      breached,
      count,
      timestamp: Date.now(),
    });

    // Limit cache size to prevent memory issues
    if (this.breachCache.size > 10000) {
      // Remove oldest entries
      const entries = Array.from(this.breachCache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      const toRemove = entries.slice(0, 1000);
      toRemove.forEach(([key]) => this.breachCache.delete(key));
    }
  }

  /**
   * Clear cache (for testing or manual reset)
   */
  clearCache(): void {
    this.breachCache.clear();
    logger.info('Password breach check cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; breachedCount: number; cleanCount: number } {
    let breachedCount = 0;
    let cleanCount = 0;

    this.breachCache.forEach((value) => {
      if (value.breached) {
        breachedCount++;
      } else {
        cleanCount++;
      }
    });

    return {
      size: this.breachCache.size,
      breachedCount,
      cleanCount,
    };
  }
}

export const passwordBreachCheckerService = new PasswordBreachCheckerService();
export default passwordBreachCheckerService;
