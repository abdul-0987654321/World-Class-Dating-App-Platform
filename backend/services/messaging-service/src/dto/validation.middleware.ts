import { Request, Response, NextFunction } from 'express';
import { validate, ValidationError } from 'class-validator';
import { plainToInstance, ClassConstructor } from 'class-transformer';

/**
 * Validation options for the middleware
 */
export interface ValidationOptions {
  /** Strip properties not decorated with validators (default: true) */
  whitelist?: boolean;
  /** Throw error when non-whitelisted properties are present (default: true) */
  forbidNonWhitelisted?: boolean;
  /** Skip missing properties (default: false) */
  skipMissingProperties?: boolean;
}

const defaultOptions: ValidationOptions = {
  whitelist: true,
  forbidNonWhitelisted: true,
  skipMissingProperties: false,
};

/**
 * Format validation errors into a readable array of messages
 */
function formatErrors(errors: ValidationError[]): string[] {
  const messages: string[] = [];

  function extractMessages(error: ValidationError, parentPath = ''): void {
    const propertyPath = parentPath ? `${parentPath}.${error.property}` : error.property;

    if (error.constraints) {
      Object.values(error.constraints).forEach((message) => {
        messages.push(message);
      });
    }

    if (error.children && error.children.length > 0) {
      error.children.forEach((child) => extractMessages(child, propertyPath));
    }
  }

  errors.forEach((error) => extractMessages(error));
  return messages;
}

/**
 * Express middleware for validating request body against a DTO class
 *
 * @param DtoClass - The DTO class to validate against
 * @param options - Validation options
 * @returns Express middleware function
 *
 * @example
 * ```typescript
 * import { validateBody } from '../dto/validation.middleware';
 * import { SendMessageDto } from '../dto';
 *
 * router.post('/messages',
 *   authenticate,
 *   validateBody(SendMessageDto),
 *   messageController.sendMessage
 * );
 * ```
 */
export function validateBody<T extends object>(
  DtoClass: ClassConstructor<T>,
  options: ValidationOptions = {}
) {
  const opts = { ...defaultOptions, ...options };

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Transform plain object to DTO class instance
      const dtoInstance = plainToInstance(DtoClass, req.body, {
        excludeExtraneousValues: opts.whitelist,
        enableImplicitConversion: true,
      });

      // Validate the DTO instance
      const errors = await validate(dtoInstance, {
        whitelist: opts.whitelist,
        forbidNonWhitelisted: opts.forbidNonWhitelisted,
        skipMissingProperties: opts.skipMissingProperties,
      });

      if (errors.length > 0) {
        const errorMessages = formatErrors(errors);
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errorMessages,
        });
        return;
      }

      // Replace request body with validated/transformed DTO
      req.body = dtoInstance;
      next();
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: 'Invalid request body',
        details: [error.message],
      });
    }
  };
}

/**
 * Express middleware for validating query parameters against a DTO class
 *
 * @param DtoClass - The DTO class to validate against
 * @param options - Validation options
 * @returns Express middleware function
 *
 * @example
 * ```typescript
 * import { validateQuery } from '../dto/validation.middleware';
 * import { ConversationPaginationDto } from '../dto';
 *
 * router.get('/conversations',
 *   authenticate,
 *   validateQuery(ConversationPaginationDto),
 *   conversationController.getConversations
 * );
 * ```
 */
export function validateQuery<T extends object>(
  DtoClass: ClassConstructor<T>,
  options: ValidationOptions = {}
) {
  const opts = { ...defaultOptions, ...options };

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Transform query object to DTO class instance
      const dtoInstance = plainToInstance(DtoClass, req.query, {
        excludeExtraneousValues: opts.whitelist,
        enableImplicitConversion: true,
      });

      // Validate the DTO instance
      const errors = await validate(dtoInstance, {
        whitelist: opts.whitelist,
        forbidNonWhitelisted: opts.forbidNonWhitelisted,
        skipMissingProperties: true, // Query params are often optional
      });

      if (errors.length > 0) {
        const errorMessages = formatErrors(errors);
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errorMessages,
        });
        return;
      }

      // Replace query with validated/transformed DTO
      (req as any).validatedQuery = dtoInstance;
      next();
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: 'Invalid query parameters',
        details: [error.message],
      });
    }
  };
}

/**
 * Express middleware for validating URL parameters against a DTO class
 *
 * @param DtoClass - The DTO class to validate against
 * @param options - Validation options
 * @returns Express middleware function
 *
 * @example
 * ```typescript
 * import { validateParams } from '../dto/validation.middleware';
 * import { IdParamDto } from '../dto';
 *
 * router.get('/messages/:id',
 *   authenticate,
 *   validateParams(IdParamDto),
 *   messageController.getMessage
 * );
 * ```
 */
export function validateParams<T extends object>(
  DtoClass: ClassConstructor<T>,
  options: ValidationOptions = {}
) {
  const opts = { ...defaultOptions, ...options };

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Transform params object to DTO class instance
      const dtoInstance = plainToInstance(DtoClass, req.params, {
        excludeExtraneousValues: opts.whitelist,
        enableImplicitConversion: true,
      });

      // Validate the DTO instance
      const errors = await validate(dtoInstance, {
        whitelist: opts.whitelist,
        forbidNonWhitelisted: opts.forbidNonWhitelisted,
        skipMissingProperties: false,
      });

      if (errors.length > 0) {
        const errorMessages = formatErrors(errors);
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errorMessages,
        });
        return;
      }

      // Replace params with validated/transformed DTO
      (req as any).validatedParams = dtoInstance;
      next();
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: 'Invalid URL parameters',
        details: [error.message],
      });
    }
  };
}
