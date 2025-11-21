import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import logger from '../../utils/logger';

type ValidationType = 'body' | 'params' | 'query';

export const validate = (schema: Joi.ObjectSchema, type: ValidationType = 'body') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const target = type === 'body' ? req.body : type === 'params' ? req.params : req.query;

    const { error, value } = schema.validate(target, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      logger.warn(`Validation error (${type}):`, errors);

      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors,
      });
    }

    // Update the appropriate request property with validated value
    if (type === 'body') {
      req.body = value;
    } else if (type === 'params') {
      req.params = value;
    } else {
      req.query = value;
    }

    return next();
  };
};
