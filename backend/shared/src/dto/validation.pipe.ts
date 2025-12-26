import { ValidationPipe } from '@nestjs/common';

/**
 * Global validation pipe configuration for NestJS applications.
 * This pipe should be applied globally in the main application bootstrap.
 *
 * Security features:
 * - whitelist: Strips properties not decorated with validators
 * - forbidNonWhitelisted: Throws error when non-whitelisted properties are present
 * - forbidUnknownValues: Rejects unknown object types
 *
 * Usage in main.ts:
 * ```typescript
 * import { globalValidationPipe } from '@flamoral/backend-shared';
 * app.useGlobalPipes(globalValidationPipe);
 * ```
 */
export const globalValidationPipe = new ValidationPipe({
  whitelist: true, // Strip non-whitelisted properties
  forbidNonWhitelisted: true, // Throw error on non-whitelisted properties
  transform: true, // Transform payloads to DTO instances
  transformOptions: {
    enableImplicitConversion: true,
  },
  forbidUnknownValues: true,
  stopAtFirstError: false, // Return all validation errors
});
