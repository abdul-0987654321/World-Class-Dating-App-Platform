import { Request, Response, NextFunction } from 'express';
import { validate, ValidationError } from 'class-validator';
import { plainToInstance } from 'class-transformer';

/**
 * Format validation errors into a user-friendly structure
 */
function formatValidationErrors(errors: ValidationError[]): Record<string, string[]> {
  const formattedErrors: Record<string, string[]> = {};

  errors.forEach((error) => {
    const property = error.property;
    const constraints = error.constraints;

    if (constraints) {
      formattedErrors[property] = Object.values(constraints);
    }

    if (error.children && error.children.length > 0) {
      const nestedErrors = formatValidationErrors(error.children);
      Object.keys(nestedErrors).forEach((nestedKey) => {
        formattedErrors[`${property}.${nestedKey}`] = nestedErrors[nestedKey];
      });
    }
  });

  return formattedErrors;
}

/**
 * Middleware factory for validating request body against a DTO class.
 */
export function validateBody<T extends object>(DtoClass: new () => T) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dtoInstance = plainToInstance(DtoClass, req.body, {
        enableImplicitConversion: true,
        excludeExtraneousValues: false,
      });

      const errors = await validate(dtoInstance, {
        whitelist: true,
        forbidNonWhitelisted: false,
        skipMissingProperties: false,
      });

      if (errors.length > 0) {
        const formattedErrors = formatValidationErrors(errors);
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: formattedErrors,
        });
        return;
      }

      req.body = dtoInstance;
      next();
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal validation error',
      });
    }
  };
}

/**
 * Middleware factory for validating query parameters against a DTO class.
 */
export function validateQuery<T extends object>(DtoClass: new () => T) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dtoInstance = plainToInstance(DtoClass, req.query, {
        enableImplicitConversion: true,
        excludeExtraneousValues: false,
      });

      const errors = await validate(dtoInstance, {
        whitelist: true,
        forbidNonWhitelisted: false,
        skipMissingProperties: true,
      });

      if (errors.length > 0) {
        const formattedErrors = formatValidationErrors(errors);
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: formattedErrors,
        });
        return;
      }

      (req as any).validatedQuery = dtoInstance;
      next();
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal validation error',
      });
    }
  };
}

/**
 * Middleware factory for validating route parameters against a DTO class.
 */
export function validateParams<T extends object>(DtoClass: new () => T) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dtoInstance = plainToInstance(DtoClass, req.params, {
        enableImplicitConversion: true,
        excludeExtraneousValues: false,
      });

      const errors = await validate(dtoInstance, {
        whitelist: true,
        forbidNonWhitelisted: false,
        skipMissingProperties: false,
      });

      if (errors.length > 0) {
        const formattedErrors = formatValidationErrors(errors);
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: formattedErrors,
        });
        return;
      }

      (req as any).validatedParams = dtoInstance;
      next();
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal validation error',
      });
    }
  };
}
