import { plainToInstance, ClassConstructor } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { Request, Response, NextFunction } from 'express';
import 'reflect-metadata';

export interface ValidationOptions {
  whitelist?: boolean;
  forbidNonWhitelisted?: boolean;
  skipMissingProperties?: boolean;
}

const defaultOptions: ValidationOptions = {
  whitelist: true,
  forbidNonWhitelisted: true,
  skipMissingProperties: false,
};

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

function formatErrorMessages(errors: ValidationError[]): string[] {
  const messages: string[] = [];
  function extractMessages(error: ValidationError): void {
    if (error.constraints) {
      Object.values(error.constraints).forEach((message) => {
        messages.push(message);
      });
    }
    if (error.children && error.children.length > 0) {
      error.children.forEach((child) => extractMessages(child));
    }
  }
  errors.forEach((error) => extractMessages(error));
  return messages;
}

export function validateBody<T extends object>(
  DtoClass: ClassConstructor<T>,
  options: ValidationOptions = {}
) {
  const opts = { ...defaultOptions, ...options };

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dtoInstance = plainToInstance(DtoClass, req.body, {
        excludeExtraneousValues: false,
        enableImplicitConversion: true,
      });

      const errors = await validate(dtoInstance, {
        whitelist: opts.whitelist,
        forbidNonWhitelisted: opts.forbidNonWhitelisted,
        skipMissingProperties: opts.skipMissingProperties,
      });

      if (errors.length > 0) {
        const errorDetails = formatValidationErrors(errors);
        res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: errorDetails,
        });
        return;
      }

      req.body = dtoInstance;
      next();
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Validation processing failed',
        error: error.message,
      });
    }
  };
}

export function validateQuery<T extends object>(
  DtoClass: ClassConstructor<T>,
  options: ValidationOptions = {}
) {
  const opts = { ...defaultOptions, ...options };

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dtoInstance = plainToInstance(DtoClass, req.query, {
        excludeExtraneousValues: false,
        enableImplicitConversion: true,
      });

      const errors = await validate(dtoInstance, {
        whitelist: opts.whitelist,
        forbidNonWhitelisted: opts.forbidNonWhitelisted,
        skipMissingProperties: true,
      });

      if (errors.length > 0) {
        const errorDetails = formatValidationErrors(errors);
        res.status(400).json({
          success: false,
          message: 'Query validation error',
          errors: errorDetails,
        });
        return;
      }

      (req as any).validatedQuery = dtoInstance;
      next();
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Query validation processing failed',
        error: error.message,
      });
    }
  };
}

export function validateParams<T extends object>(
  DtoClass: ClassConstructor<T>,
  options: ValidationOptions = {}
) {
  const opts = { ...defaultOptions, ...options };

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dtoInstance = plainToInstance(DtoClass, req.params, {
        excludeExtraneousValues: false,
        enableImplicitConversion: true,
      });

      const errors = await validate(dtoInstance, {
        whitelist: opts.whitelist,
        forbidNonWhitelisted: opts.forbidNonWhitelisted,
        skipMissingProperties: false,
      });

      if (errors.length > 0) {
        const errorDetails = formatValidationErrors(errors);
        res.status(400).json({
          success: false,
          message: 'Parameter validation error',
          errors: errorDetails,
        });
        return;
      }

      (req as any).validatedParams = dtoInstance;
      next();
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Parameter validation processing failed',
        error: error.message,
      });
    }
  };
}
