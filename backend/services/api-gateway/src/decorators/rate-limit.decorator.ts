import { SetMetadata } from '@nestjs/common';

import { RateLimitRule } from '../config/rate-limit.config';

/**
 * Metadata key for rate limit configuration
 */
export const RATE_LIMIT_KEY = 'rateLimit';

/**
 * Metadata key to skip rate limiting
 */
export const SKIP_RATE_LIMIT_KEY = 'skipRateLimit';

/**
 * Custom rate limit decorator
 * Apply to individual endpoints to override default rate limits
 *
 * @example
 * ```typescript
 * @RateLimit({ window: '1m', max: 10 })
 * @Post('sensitive-endpoint')
 * async sensitiveAction() {
 *   // This endpoint allows max 10 requests per minute
 * }
 * ```
 */
export const RateLimit = (config: RateLimitRule) => SetMetadata(RATE_LIMIT_KEY, config);

/**
 * Skip rate limiting for specific endpoint
 * Useful for health checks, webhooks, or internal endpoints
 *
 * @example
 * ```typescript
 * @SkipRateLimit()
 * @Get('health')
 * async healthCheck() {
 *   // This endpoint is not rate limited
 * }
 * ```
 */
export const SkipRateLimit = () => SetMetadata(SKIP_RATE_LIMIT_KEY, true);

/**
 * Apply strict rate limiting (useful for sensitive operations)
 *
 * @example
 * ```typescript
 * @StrictRateLimit()
 * @Post('password-reset')
 * async resetPassword() {
 *   // This endpoint has very strict rate limits
 * }
 * ```
 */
export const StrictRateLimit = () => RateLimit({ window: '15m', max: 3 });

/**
 * Apply relaxed rate limiting (useful for read-heavy operations)
 *
 * @example
 * ```typescript
 * @RelaxedRateLimit()
 * @Get('public-profiles')
 * async getPublicProfiles() {
 *   // This endpoint has relaxed rate limits
 * }
 * ```
 */
export const RelaxedRateLimit = () => RateLimit({ window: '1m', max: 300 });
