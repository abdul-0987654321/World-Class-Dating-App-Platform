/**
 * Express Validation Middleware for DTOs
 *
 * This middleware validates request bodies, query parameters, and route parameters
 * against class-validator decorated DTOs.
 *
 * Usage:
 * ```typescript
 * import { validateBody, validateQuery, validateParams } from '../dto/validation.middleware';
 * import { MyDto } from '../dto';
 *
 * router.post('/endpoint', validateBody(MyDto), async (req, res) => {
 *   const validatedData = req.body; // Transformed and validated
 * });
 * ```
 */

import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { Request, Response, NextFunction } from 'express';
import 'reflect-metadata';

/**
 * Format validation errors into a readable structure
 */
function formatValidationErrors(errors: ValidationError[]): object[] {
  return errors.map((error) => {
    const constraints = error.constraints || {};
    return {
      property: error.property,
      value: error.value,
      constraints: Object.values(constraints),
      children: error.children?.length ? formatValidationErrors(error.children) : undefined,
    };
  });
}

/**
 * Options for validation middleware
 */
interface ValidationOptions {
  /**
   * Strip properties that are not defined in the DTO (whitelist mode)
   * @default true
   */
  whitelist?: boolean;

  /**
   * Throw error if non-whitelisted properties are present
   * @default true
   */
  forbidNonWhitelisted?: boolean;

  /**
   * Skip validation for undefined values
   * @default false
   */
  skipUndefinedProperties?: boolean;

  /**
   * Skip validation for null values
   * @default false
   */
  skipNullProperties?: boolean;

  /**
   * Skip validation for null and undefined values
   * @default false
   */
  skipMissingProperties?: boolean;
}

const defaultOptions: ValidationOptions = {
  whitelist: true,
  forbidNonWhitelisted: true,
  skipUndefinedProperties: false,
  skipNullProperties: false,
  skipMissingProperties: false,
};

/**
 * Creates a validation middleware for request bodies
 *
 * @param dtoClass - The DTO class to validate against
 * @param options - Validation options
 * @returns Express middleware function
 */
export function validateBody<T extends object>(
  dtoClass: new () => T,
  options: ValidationOptions = {}
): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  const opts = { ...defaultOptions, ...options };

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Transform plain object to DTO instance
      const dtoInstance = plainToInstance(dtoClass, req.body, {
        excludeExtraneousValues: opts.whitelist,
        enableImplicitConversion: true,
      });

      // Validate the DTO instance
      const errors = await validate(dtoInstance, {
        whitelist: opts.whitelist,
        forbidNonWhitelisted: opts.forbidNonWhitelisted,
        skipUndefinedProperties: opts.skipUndefinedProperties,
        skipNullProperties: opts.skipNullProperties,
        skipMissingProperties: opts.skipMissingProperties,
      });

      if (errors.length > 0) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: formatValidationErrors(errors),
        });
        return;
      }

      // Replace request body with validated and transformed DTO
      req.body = dtoInstance;
      next();
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Validation processing failed',
        code: 'VALIDATION_PROCESSING_ERROR',
        message: error.message,
      });
    }
  };
}

/**
 * Creates a validation middleware for query parameters
 *
 * @param dtoClass - The DTO class to validate against
 * @param options - Validation options
 * @returns Express middleware function
 */
export function validateQuery<T extends object>(
  dtoClass: new () => T,
  options: ValidationOptions = {}
): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  const opts = { ...defaultOptions, ...options };

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Transform plain object to DTO instance
      const dtoInstance = plainToInstance(dtoClass, req.query, {
        excludeExtraneousValues: opts.whitelist,
        enableImplicitConversion: true,
      });

      // Validate the DTO instance
      const errors = await validate(dtoInstance, {
        whitelist: opts.whitelist,
        forbidNonWhitelisted: opts.forbidNonWhitelisted,
        skipUndefinedProperties: opts.skipUndefinedProperties,
        skipNullProperties: opts.skipNullProperties,
        skipMissingProperties: opts.skipMissingProperties,
      });

      if (errors.length > 0) {
        res.status(400).json({
          success: false,
          error: 'Query validation failed',
          code: 'QUERY_VALIDATION_ERROR',
          details: formatValidationErrors(errors),
        });
        return;
      }

      // Replace request query with validated and transformed DTO
      req.query = dtoInstance as any;
      next();
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Query validation processing failed',
        code: 'QUERY_VALIDATION_PROCESSING_ERROR',
        message: error.message,
      });
    }
  };
}

/**
 * Creates a validation middleware for route parameters
 *
 * @param dtoClass - The DTO class to validate against
 * @param options - Validation options
 * @returns Express middleware function
 */
export function validateParams<T extends object>(
  dtoClass: new () => T,
  options: ValidationOptions = {}
): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  const opts = { ...defaultOptions, ...options };

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Transform plain object to DTO instance
      const dtoInstance = plainToInstance(dtoClass, req.params, {
        excludeExtraneousValues: opts.whitelist,
        enableImplicitConversion: true,
      });

      // Validate the DTO instance
      const errors = await validate(dtoInstance, {
        whitelist: opts.whitelist,
        forbidNonWhitelisted: opts.forbidNonWhitelisted,
        skipUndefinedProperties: opts.skipUndefinedProperties,
        skipNullProperties: opts.skipNullProperties,
        skipMissingProperties: opts.skipMissingProperties,
      });

      if (errors.length > 0) {
        res.status(400).json({
          success: false,
          error: 'Parameter validation failed',
          code: 'PARAM_VALIDATION_ERROR',
          details: formatValidationErrors(errors),
        });
        return;
      }

      // Replace request params with validated and transformed DTO
      req.params = dtoInstance as any;
      next();
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Parameter validation processing failed',
        code: 'PARAM_VALIDATION_PROCESSING_ERROR',
        message: error.message,
      });
    }
  };
}
