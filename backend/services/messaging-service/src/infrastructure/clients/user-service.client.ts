/**
 * User Service Client
 * Handles communication with the user service for subscription and user data
 *
 * RESILIENCE FEATURES:
 * - Circuit breaker pattern for fault tolerance
 * - Exponential backoff retry with jitter
 * - Configurable timeouts
 */

import axios, { AxiosInstance, AxiosError } from 'axios';

import config from '../../config';
import { createLogger } from '../../utils/logger';

const logger = createLogger('user-service-client');

// Retry configuration
const MAX_RETRIES = 3;
const BASE_DELAY = 500;
const MAX_DELAY = 5000;
const RETRYABLE_STATUS_CODES = [408, 429, 500, 502, 503, 504];

/**
 * Circuit Breaker State
 */
type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

/**
 * Circuit Breaker for service resilience
 */
class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private lastFailureTime = 0;
  private successCount = 0;
  private readonly threshold = 5;
  private readonly resetTimeout = 30000;
  private readonly successThreshold = 2;

  getState(): CircuitState {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime >= this.resetTimeout) {
        this.state = 'HALF_OPEN';
        this.successCount = 0;
        logger.info('[UserServiceClient] Circuit breaker transitioning to HALF_OPEN');
      }
    }
    return this.state;
  }

  allowRequest(): boolean {
    return this.getState() !== 'OPEN';
  }

  recordSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= this.successThreshold) {
        this.state = 'CLOSED';
        this.failureCount = 0;
        logger.info('[UserServiceClient] Circuit breaker CLOSED');
      }
    } else {
      this.failureCount = 0;
    }
  }

  recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    if (this.state === 'HALF_OPEN' || this.failureCount >= this.threshold) {
      this.state = 'OPEN';
      logger.warn(`[UserServiceClient] Circuit breaker OPEN: ${this.failureCount} failures`);
    }
  }
}

/**
 * Calculate exponential backoff with jitter
 */
function calculateBackoff(attempt: number): number {
  const delay = Math.min(BASE_DELAY * Math.pow(2, attempt - 1), MAX_DELAY);
  return Math.floor(delay * (0.5 + Math.random() * 0.5));
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Subscription tiers that allow "Message Before Match" feature
 * Premium+, Elite tiers can send messages before matching
 */
export const BEFORE_MATCH_ALLOWED_TIERS = ['premium_plus', 'elite'] as const;

/**
 * All subscription tiers
 */
export type SubscriptionTier = 'free' | 'basic' | 'plus' | 'premium' | 'premium_plus' | 'elite';

export interface UserSubscriptionInfo {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  subscriptionTier: SubscriptionTier;
  isActive: boolean;
  isVerified: boolean;
}

export class UserServiceClient {
  private client: AxiosInstance;
  private baseUrl: string;
  private circuitBreaker: CircuitBreaker;

  constructor() {
    this.baseUrl = config.services.userServiceUrl;
    this.circuitBreaker = new CircuitBreaker();

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Name': 'messaging-service',
        'X-Service-Token': config.serviceToken,
      },
    });

    // Response interceptor for circuit breaker
    this.client.interceptors.response.use(
      (response) => {
        this.circuitBreaker.recordSuccess();
        return response;
      },
      (error: AxiosError) => {
        this.circuitBreaker.recordFailure();
        return Promise.reject(error);
      }
    );
  }

  /**
   * Execute request with retry logic and circuit breaker
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    defaultValue?: T
  ): Promise<T> {
    if (!this.circuitBreaker.allowRequest()) {
      logger.warn(`[UserServiceClient] Circuit breaker OPEN - ${operationName} blocked`);
      if (defaultValue !== undefined) {
        return defaultValue;
      }
      throw new Error(`User service circuit breaker is OPEN - ${operationName} blocked`);
    }

    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;
        const status = error.response?.status;

        // 404 is not an error - user just doesn't exist
        if (status === 404 && defaultValue !== undefined) {
          return defaultValue;
        }

        // Don't retry 4xx errors (except 408 and 429)
        if (status && status >= 400 && status < 500 && !RETRYABLE_STATUS_CODES.includes(status)) {
          throw error;
        }

        if (attempt < MAX_RETRIES) {
          const delay = calculateBackoff(attempt);
          logger.warn(`[UserServiceClient] ${operationName} failed (attempt ${attempt}/${MAX_RETRIES}). Retrying in ${delay}ms...`);
          await sleep(delay);
        }
      }
    }

    // If we have a default value, return it instead of throwing
    if (defaultValue !== undefined) {
      logger.error(`[UserServiceClient] ${operationName} failed after ${MAX_RETRIES} retries, using default value`);
      return defaultValue;
    }

    throw lastError || new Error(`${operationName} failed after ${MAX_RETRIES} retries`);
  }

  /**
   * Get user information including subscription tier
   */
  async getUserInfo(userId: string): Promise<UserSubscriptionInfo | null> {
    return this.executeWithRetry(
      async () => {
        const response = await this.client.get(`/api/internal/users/${userId}`);
        return response.data.data || null;
      },
      `getUserInfo(${userId})`,
      null
    );
  }

  /**
   * Get user's subscription tier
   */
  async getUserSubscriptionTier(userId: string): Promise<SubscriptionTier> {
    const userInfo = await this.getUserInfo(userId);
    return userInfo?.subscriptionTier || 'free';
  }

  /**
   * Check if user can send messages before matching
   * Only Premium+ and Elite tiers have this feature
   */
  async canSendBeforeMatch(userId: string): Promise<boolean> {
    const tier = await this.getUserSubscriptionTier(userId);
    const canSend = BEFORE_MATCH_ALLOWED_TIERS.includes(
      tier as (typeof BEFORE_MATCH_ALLOWED_TIERS)[number]
    );
    logger.debug(`User ${userId} with tier ${tier} canSendBeforeMatch: ${canSend}`);
    return canSend;
  }

  /**
   * Check if user has a specific feature based on subscription tier
   * This is a general feature access check
   */
  async hasFeatureAccess(userId: string, featureKey: string): Promise<boolean> {
    return this.executeWithRetry(
      async () => {
        const response = await this.client.get(
          `/api/internal/users/${userId}/features/${featureKey}`
        );
        return response.data.data?.hasAccess || false;
      },
      `hasFeatureAccess(${userId}, ${featureKey})`,
      false
    );
  }

  /**
   * Get circuit breaker state for monitoring
   */
  getCircuitBreakerState(): CircuitState {
    return this.circuitBreaker.getState();
  }
}

export const userServiceClient = new UserServiceClient();
export default userServiceClient;
