import { Request, Response, NextFunction } from 'express';
import logger from '../../utils/logger';
import Stripe from 'stripe';

/**
 * Custom Error Types
 */
export class PaymentError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'PaymentError';
  }
}

export class StripeError extends PaymentError {
  constructor(message: string, public stripeError: any) {
    super(message, 400, stripeError.code);
    this.name = 'StripeError';
    this.details = {
      type: stripeError.type,
      code: stripeError.code,
      param: stripeError.param,
      declineCode: stripeError.decline_code,
    };
  }
}

export class WebhookError extends PaymentError {
  constructor(message: string, public eventId?: string) {
    super(message, 400, 'webhook_error');
    this.name = 'WebhookError';
  }
}

export class RateLimitError extends PaymentError {
  constructor(retryAfter: number) {
    super('Too many requests', 429, 'rate_limit_exceeded');
    this.name = 'RateLimitError';
    this.details = { retryAfter };
  }
}

export class ValidationError extends PaymentError {
  constructor(message: string, fields?: Record<string, string>) {
    super(message, 400, 'validation_error');
    this.name = 'ValidationError';
    this.details = { fields };
  }
}

/**
 * Global error handler middleware
 */
export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Log the error
  logger.error('Error occurred:', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    userId: (req as any).user?.id,
  });

  // Handle Stripe errors
  if (error instanceof Stripe.errors.StripeError) {
    const stripeError = new StripeError(
      getStripeErrorMessage(error),
      error
    );

    return res.status(stripeError.statusCode).json({
      success: false,
      error: {
        message: stripeError.message,
        code: stripeError.code,
        type: 'stripe_error',
        details: stripeError.details,
      },
    });
  }

  // Handle custom payment errors
  if (error instanceof PaymentError) {
    return res.status(error.statusCode).json({
      success: false,
      error: {
        message: error.message,
        code: error.code,
        type: error.name.toLowerCase(),
        details: error.details,
      },
    });
  }

  // Handle validation errors
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: {
        message: error.message,
        code: 'validation_error',
        type: 'validation_error',
      },
    });
  }

  // Handle unknown errors
  const statusCode = (error as any).statusCode || 500;
  const message = statusCode === 500
    ? 'An unexpected error occurred. Please try again later.'
    : error.message;

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      code: 'internal_error',
      type: 'error',
    },
  });
}

/**
 * Get user-friendly Stripe error message
 */
function getStripeErrorMessage(error: Stripe.errors.StripeError): string {
  switch (error.type) {
    case 'StripeCardError':
      return getCardErrorMessage(error);
    case 'StripeRateLimitError':
      return 'Too many requests. Please try again shortly.';
    case 'StripeInvalidRequestError':
      return 'Invalid request. Please check your payment details.';
    case 'StripeAPIError':
      return 'Payment service is temporarily unavailable. Please try again.';
    case 'StripeConnectionError':
      return 'Network error. Please check your connection and try again.';
    case 'StripeAuthenticationError':
      return 'Payment authentication failed. Please contact support.';
    default:
      return 'Payment processing failed. Please try again.';
  }
}

/**
 * Get user-friendly card error message
 */
function getCardErrorMessage(error: Stripe.errors.StripeError): string {
  const code = error.code;

  switch (code) {
    case 'card_declined':
      return 'Your card was declined. Please try a different payment method.';
    case 'insufficient_funds':
      return 'Insufficient funds. Please try a different payment method.';
    case 'incorrect_cvc':
      return 'Incorrect CVC code. Please check your card details.';
    case 'expired_card':
      return 'Your card has expired. Please try a different payment method.';
    case 'processing_error':
      return 'Payment processing error. Please try again.';
    case 'incorrect_number':
      return 'Incorrect card number. Please check your card details.';
    case 'invalid_expiry_month':
    case 'invalid_expiry_year':
      return 'Invalid expiry date. Please check your card details.';
    case 'invalid_cvc':
      return 'Invalid CVC code. Please check your card details.';
    case 'authentication_required':
      return 'Additional authentication required. Please complete the verification.';
    default:
      return error.message || 'Card payment failed. Please try again.';
  }
}

/**
 * Async handler wrapper to catch promise rejections
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Timeout middleware
 */
export function requestTimeout(timeoutMs: number = 30000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        logger.error(`Request timeout after ${timeoutMs}ms`, {
          path: req.path,
          method: req.method,
        });

        res.status(408).json({
          success: false,
          error: {
            message: 'Request timeout. Please try again.',
            code: 'request_timeout',
            type: 'timeout_error',
          },
        });
      }
    }, timeoutMs);

    // Clear timeout when response is sent
    res.on('finish', () => clearTimeout(timeout));
    res.on('close', () => clearTimeout(timeout));

    next();
  };
}

/**
 * Not found handler
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: {
      message: `Route ${req.method} ${req.path} not found`,
      code: 'not_found',
      type: 'not_found_error',
    },
  });
}
