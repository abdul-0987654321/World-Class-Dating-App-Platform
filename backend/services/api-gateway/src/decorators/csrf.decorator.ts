import { SetMetadata } from '@nestjs/common';

/**
 * CSRF Protection Decorator
 *
 * Use to mark endpoints that should skip CSRF validation
 * (e.g., webhook endpoints, third-party integrations)
 *
 * @example
 * ```typescript
 * @SkipCsrf()
 * @Post('webhook')
 * async handleWebhook() {
 *   // This endpoint will skip CSRF validation
 * }
 * ```
 */
export const SKIP_CSRF_KEY = 'skipCsrf';
export const SkipCsrf = () => SetMetadata(SKIP_CSRF_KEY, true);

/**
 * Require CSRF Protection Decorator
 *
 * Use to explicitly require CSRF validation even for GET requests
 * (useful for sensitive read operations)
 *
 * @example
 * ```typescript
 * @RequireCsrf()
 * @Get('sensitive-data')
 * async getSensitiveData() {
 *   // This endpoint will require CSRF validation even for GET
 * }
 * ```
 */
export const REQUIRE_CSRF_KEY = 'requireCsrf';
export const RequireCsrf = () => SetMetadata(REQUIRE_CSRF_KEY, true);

/**
 * CSRF Token Endpoint Decorator
 *
 * Use to mark an endpoint that provides CSRF tokens to clients
 * This endpoint will generate and return a new token
 *
 * @example
 * ```typescript
 * @CsrfToken()
 * @Get('csrf-token')
 * async getCsrfToken(@Req() req: Request) {
 *   return { csrfToken: req.csrfToken() };
 * }
 * ```
 */
export const CSRF_TOKEN_ENDPOINT_KEY = 'csrfTokenEndpoint';
export const CsrfToken = () => SetMetadata(CSRF_TOKEN_ENDPOINT_KEY, true);
