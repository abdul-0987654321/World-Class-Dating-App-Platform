/**
 * reCAPTCHA v3 Service for Bot Detection
 * Implements Google reCAPTCHA v3 Enterprise or Standard verification
 *
 * P1-001: Bot Detection Implementation
 */

import { config } from '../../config';
import logger from '../../utils/logger';

/**
 * Supported reCAPTCHA actions with their score thresholds
 */
export type RecaptchaAction =
  | 'registration'
  | 'login'
  | 'password_reset'
  | 'password_change'
  | 'profile_update'
  | 'message_send'
  | 'report_user'
  | 'payment'
  | 'verify_email'
  | 'verify_phone'
  | 'default';

/**
 * Result of reCAPTCHA verification
 */
export interface RecaptchaResult {
  success: boolean;
  score: number;
  action: string;
  timestamp: Date;
  hostname: string;
  isBot: boolean;
  isSuspicious: boolean;
  errorCodes?: string[];
  assessmentId?: string; // For Enterprise API
}

/**
 * reCAPTCHA API response from Google
 */
interface RecaptchaApiResponse {
  success: boolean;
  score?: number;
  action?: string;
  challenge_ts?: string;
  hostname?: string;
  'error-codes'?: string[];
}

/**
 * Enterprise API response structure
 */
interface EnterpriseApiResponse {
  tokenProperties?: {
    valid: boolean;
    hostname: string;
    action: string;
    createTime: string;
  };
  riskAnalysis?: {
    score: number;
    reasons?: string[];
  };
  event?: {
    token: string;
    siteKey: string;
    userAgent?: string;
    userIpAddress?: string;
    expectedAction?: string;
  };
  name?: string;
}

/**
 * Configuration for reCAPTCHA service
 */
interface RecaptchaConfig {
  secretKey: string;
  siteKey: string;
  projectId?: string; // For Enterprise API
  useEnterprise: boolean;
  enabled: boolean;
  scoreThresholds: Record<RecaptchaAction, number>;
  suspiciousScoreThreshold: number;
  verifyUrl: string;
  enterpriseUrl: string;
  timeout: number;
}

/**
 * Get reCAPTCHA configuration from environment
 */
const getRecaptchaConfig = (): RecaptchaConfig => {
  return {
    secretKey: process.env.RECAPTCHA_SECRET_KEY || '',
    siteKey: process.env.RECAPTCHA_SITE_KEY || '',
    projectId: process.env.RECAPTCHA_PROJECT_ID,
    useEnterprise: process.env.RECAPTCHA_USE_ENTERPRISE === 'true',
    enabled: process.env.RECAPTCHA_ENABLED !== 'false', // Enabled by default
    scoreThresholds: {
      // Higher threshold = stricter (more likely to block)
      registration: parseFloat(process.env.RECAPTCHA_THRESHOLD_REGISTRATION || '0.5'),
      login: parseFloat(process.env.RECAPTCHA_THRESHOLD_LOGIN || '0.3'),
      password_reset: parseFloat(process.env.RECAPTCHA_THRESHOLD_PASSWORD_RESET || '0.5'),
      password_change: parseFloat(process.env.RECAPTCHA_THRESHOLD_PASSWORD_CHANGE || '0.4'),
      profile_update: parseFloat(process.env.RECAPTCHA_THRESHOLD_PROFILE_UPDATE || '0.3'),
      message_send: parseFloat(process.env.RECAPTCHA_THRESHOLD_MESSAGE_SEND || '0.3'),
      report_user: parseFloat(process.env.RECAPTCHA_THRESHOLD_REPORT_USER || '0.4'),
      payment: parseFloat(process.env.RECAPTCHA_THRESHOLD_PAYMENT || '0.6'),
      verify_email: parseFloat(process.env.RECAPTCHA_THRESHOLD_VERIFY_EMAIL || '0.4'),
      verify_phone: parseFloat(process.env.RECAPTCHA_THRESHOLD_VERIFY_PHONE || '0.4'),
      default: parseFloat(process.env.RECAPTCHA_THRESHOLD_DEFAULT || '0.5'),
    },
    suspiciousScoreThreshold: parseFloat(process.env.RECAPTCHA_SUSPICIOUS_THRESHOLD || '0.3'),
    verifyUrl: 'https://www.google.com/recaptcha/api/siteverify',
    enterpriseUrl: 'https://recaptchaenterprise.googleapis.com/v1',
    timeout: parseInt(process.env.RECAPTCHA_TIMEOUT || '5000', 10),
  };
};

/**
 * RecaptchaService - Handles reCAPTCHA v3 verification for bot detection
 */
class RecaptchaService {
  private config: RecaptchaConfig;
  private failureCount: number = 0;
  private lastFailureTime: Date | null = null;
  private circuitBreakerOpen: boolean = false;
  private readonly CIRCUIT_BREAKER_THRESHOLD = 5;
  private readonly CIRCUIT_BREAKER_RESET_TIME = 60000; // 1 minute

  constructor() {
    this.config = getRecaptchaConfig();

    if (this.config.enabled && !this.config.secretKey) {
      logger.warn('reCAPTCHA is enabled but RECAPTCHA_SECRET_KEY is not set. Verification will be skipped.');
    }
  }

  /**
   * Verify a reCAPTCHA token
   *
   * @param token - The reCAPTCHA token from the client
   * @param action - The expected action for this verification
   * @param remoteIp - Optional IP address of the user
   * @returns RecaptchaResult with verification details
   */
  async verifyToken(
    token: string,
    action: RecaptchaAction | string,
    remoteIp?: string
  ): Promise<RecaptchaResult> {
    // Check if reCAPTCHA is disabled
    if (!this.config.enabled) {
      logger.debug('reCAPTCHA verification skipped: disabled by configuration');
      return this.createSuccessResult(action, 1.0);
    }

    // Check if secret key is configured
    if (!this.config.secretKey) {
      logger.warn('reCAPTCHA verification skipped: secret key not configured');
      return this.createSuccessResult(action, 1.0);
    }

    // Check circuit breaker
    if (this.isCircuitBreakerOpen()) {
      logger.warn('reCAPTCHA circuit breaker is open, allowing request through');
      return this.createSuccessResult(action, 0.9, true);
    }

    // Validate token format
    if (!token || typeof token !== 'string' || token.length < 20) {
      logger.warn('Invalid reCAPTCHA token format', { tokenLength: token?.length });
      return this.createFailureResult(action, ['invalid-token-format']);
    }

    try {
      let result: RecaptchaResult;

      if (this.config.useEnterprise && this.config.projectId) {
        result = await this.verifyEnterprise(token, action, remoteIp);
      } else {
        result = await this.verifyStandard(token, action, remoteIp);
      }

      // Reset circuit breaker on success
      this.resetCircuitBreaker();

      // Determine if this is a bot or suspicious activity
      const threshold = this.getScoreThreshold(action as RecaptchaAction);
      result.isBot = this.isBot(result.score, action as RecaptchaAction);
      result.isSuspicious = result.score < this.config.suspiciousScoreThreshold;

      // Log suspicious activity
      if (result.isSuspicious && !result.isBot) {
        logger.warn('Suspicious reCAPTCHA score detected', {
          action,
          score: result.score,
          threshold,
          suspiciousThreshold: this.config.suspiciousScoreThreshold,
          remoteIp,
        });
      }

      // Log bot detection
      if (result.isBot) {
        logger.warn('Bot detected by reCAPTCHA', {
          action,
          score: result.score,
          threshold,
          remoteIp,
        });
      }

      return result;
    } catch (error) {
      this.recordFailure();
      logger.error('reCAPTCHA verification error', error);

      // Return fallback result allowing the request
      return this.createFallbackResult(action);
    }
  }

  /**
   * Get the score threshold for a specific action
   *
   * @param action - The reCAPTCHA action
   * @returns The score threshold (0-1, where higher means stricter)
   */
  getScoreThreshold(action: RecaptchaAction | string): number {
    const normalizedAction = action as RecaptchaAction;
    return this.config.scoreThresholds[normalizedAction] ?? this.config.scoreThresholds.default;
  }

  /**
   * Determine if a score indicates bot activity
   *
   * @param score - The reCAPTCHA score (0-1)
   * @param action - The action being performed
   * @returns true if the score indicates a bot
   */
  isBot(score: number, action: RecaptchaAction | string): boolean {
    const threshold = this.getScoreThreshold(action);
    return score < threshold;
  }

  /**
   * Check if reCAPTCHA is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled && !!this.config.secretKey;
  }

  /**
   * Get the site key for client-side integration
   */
  getSiteKey(): string {
    return this.config.siteKey;
  }

  // Private methods

  /**
   * Verify token using standard reCAPTCHA v3 API
   */
  private async verifyStandard(
    token: string,
    action: string,
    remoteIp?: string
  ): Promise<RecaptchaResult> {
    const params = new URLSearchParams({
      secret: this.config.secretKey,
      response: token,
    });

    if (remoteIp) {
      params.append('remoteip', remoteIp);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(this.config.verifyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`reCAPTCHA API returned status ${response.status}`);
      }

      const data: RecaptchaApiResponse = await response.json();

      if (!data.success) {
        logger.warn('reCAPTCHA verification failed', {
          errorCodes: data['error-codes'],
          action,
        });

        return this.createFailureResult(action, data['error-codes']);
      }

      // Validate action matches expected
      if (data.action && data.action !== action) {
        logger.warn('reCAPTCHA action mismatch', {
          expected: action,
          received: data.action,
        });
      }

      return {
        success: true,
        score: data.score ?? 0.5,
        action: data.action || action,
        timestamp: data.challenge_ts ? new Date(data.challenge_ts) : new Date(),
        hostname: data.hostname || '',
        isBot: false,
        isSuspicious: false,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Verify token using reCAPTCHA Enterprise API
   */
  private async verifyEnterprise(
    token: string,
    action: string,
    remoteIp?: string
  ): Promise<RecaptchaResult> {
    const url = `${this.config.enterpriseUrl}/projects/${this.config.projectId}/assessments`;

    const requestBody = {
      event: {
        token,
        siteKey: this.config.siteKey,
        expectedAction: action,
        ...(remoteIp && { userIpAddress: remoteIp }),
      },
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.GOOGLE_CLOUD_ACCESS_TOKEN || ''}`,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`reCAPTCHA Enterprise API returned status ${response.status}`);
      }

      const data: EnterpriseApiResponse = await response.json();

      if (!data.tokenProperties?.valid) {
        logger.warn('reCAPTCHA Enterprise token invalid', {
          action,
          reasons: data.riskAnalysis?.reasons,
        });

        return this.createFailureResult(action, ['invalid-token']);
      }

      // Validate action matches expected
      if (data.tokenProperties.action !== action) {
        logger.warn('reCAPTCHA Enterprise action mismatch', {
          expected: action,
          received: data.tokenProperties.action,
        });
      }

      return {
        success: true,
        score: data.riskAnalysis?.score ?? 0.5,
        action: data.tokenProperties.action,
        timestamp: new Date(data.tokenProperties.createTime),
        hostname: data.tokenProperties.hostname,
        isBot: false,
        isSuspicious: false,
        assessmentId: data.name,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Create a success result
   */
  private createSuccessResult(
    action: string,
    score: number,
    isFallback: boolean = false
  ): RecaptchaResult {
    return {
      success: true,
      score,
      action,
      timestamp: new Date(),
      hostname: '',
      isBot: false,
      isSuspicious: false,
      ...(isFallback && { errorCodes: ['circuit-breaker-open'] }),
    };
  }

  /**
   * Create a failure result
   */
  private createFailureResult(action: string, errorCodes?: string[]): RecaptchaResult {
    return {
      success: false,
      score: 0,
      action,
      timestamp: new Date(),
      hostname: '',
      isBot: true,
      isSuspicious: true,
      errorCodes,
    };
  }

  /**
   * Create a fallback result when reCAPTCHA service is unavailable
   * Allows the request to proceed but logs the event
   */
  private createFallbackResult(action: string): RecaptchaResult {
    logger.info('Using reCAPTCHA fallback due to service unavailability', { action });

    return {
      success: true,
      score: 0.7, // Moderate score for fallback
      action,
      timestamp: new Date(),
      hostname: '',
      isBot: false,
      isSuspicious: true, // Mark as suspicious for monitoring
      errorCodes: ['service-unavailable'],
    };
  }

  /**
   * Check if circuit breaker is open
   */
  private isCircuitBreakerOpen(): boolean {
    if (!this.circuitBreakerOpen) {
      return false;
    }

    // Check if enough time has passed to reset
    if (
      this.lastFailureTime &&
      Date.now() - this.lastFailureTime.getTime() > this.CIRCUIT_BREAKER_RESET_TIME
    ) {
      this.resetCircuitBreaker();
      return false;
    }

    return true;
  }

  /**
   * Record a failure for circuit breaker tracking
   */
  private recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = new Date();

    if (this.failureCount >= this.CIRCUIT_BREAKER_THRESHOLD) {
      this.circuitBreakerOpen = true;
      logger.warn('reCAPTCHA circuit breaker opened after repeated failures', {
        failureCount: this.failureCount,
      });
    }
  }

  /**
   * Reset circuit breaker state
   */
  private resetCircuitBreaker(): void {
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.circuitBreakerOpen = false;
  }
}

// Export singleton instance
export const recaptchaService = new RecaptchaService();
export default recaptchaService;
