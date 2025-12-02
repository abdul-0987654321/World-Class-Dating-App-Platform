import { Injectable, NestMiddleware, BadRequestException, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { validate, ValidationError } from 'class-validator';
import { plainToClass } from 'class-transformer';

@Injectable()
export class ValidationMiddleware implements NestMiddleware {
  private readonly logger = new Logger(ValidationMiddleware.name);

  async use(req: Request, res: Response, next: NextFunction) {
    try {
      // Validate request body schema if present
      if (req.body && typeof req.body === 'object') {
        await this.validateRequestBody(req);
      }

      // Validate common request parameters
      this.validateCommonParams(req);

      next();
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Validation error:', error);
      throw new BadRequestException('Invalid request format');
    }
  }

  private async validateRequestBody(req: Request): Promise<void> {
    // Sanitize input - remove null bytes and control characters
    const sanitized = this.sanitizeObject(req.body);
    req.body = sanitized;

    // Check for oversized payloads
    const bodySize = JSON.stringify(req.body).length;
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (bodySize > maxSize) {
      throw new BadRequestException('Request body too large');
    }
  }

  private validateCommonParams(req: Request): void {
    // Validate common query parameters
    if (req.query.page) {
      const page = parseInt(req.query.page as string, 10);
      if (isNaN(page) || page < 1) {
        throw new BadRequestException('Invalid page parameter');
      }
    }

    if (req.query.limit) {
      const limit = parseInt(req.query.limit as string, 10);
      if (isNaN(limit) || limit < 1 || limit > 100) {
        throw new BadRequestException('Invalid limit parameter (must be 1-100)');
      }
    }

    // Validate common headers
    if (req.headers['content-type']) {
      const contentType = req.headers['content-type'];
      if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
        if (!contentType.includes('application/json') &&
            !contentType.includes('multipart/form-data')) {
          throw new BadRequestException('Invalid content-type header');
        }
      }
    }
  }

  private sanitizeObject(obj: any): any {
    if (typeof obj !== 'object' || obj === null) {
      return this.sanitizeValue(obj);
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }

    const sanitized: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const sanitizedKey = this.sanitizeValue(key);
        sanitized[sanitizedKey] = this.sanitizeObject(obj[key]);
      }
    }

    return sanitized;
  }

  private sanitizeValue(value: any): any {
    if (typeof value !== 'string') {
      return value;
    }

    // Remove null bytes and control characters (except newlines, tabs, and carriage returns)
    return value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  }
}

// Decorator for route-specific validation
export function ValidateBody(dtoClass: any) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const request = args.find(arg => arg && arg.body !== undefined);

      if (request && request.body) {
        const dtoInstance = plainToClass(dtoClass, request.body);
        const errors = await validate(dtoInstance);

        if (errors.length > 0) {
          const formattedErrors = errors.map((error: ValidationError) => ({
            property: error.property,
            constraints: error.constraints,
          }));

          throw new BadRequestException({
            message: 'Validation failed',
            errors: formattedErrors,
          });
        }

        // Replace body with validated DTO instance
        request.body = dtoInstance;
      }

      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}
