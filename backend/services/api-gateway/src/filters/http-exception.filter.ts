import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

/**
 * Standard API error response matching openapi.yaml specification
 */
interface ApiErrorResponse {
  code: string;
  message: string;
  correlation_id: string;
  timestamp: string;
  path: string;
  // Additional fields for specific error types
  required_plan?: string;
  current_plan?: string;
  details?: Record<string, any>;
}

/**
 * Error code mappings for different HTTP status codes
 */
const ERROR_CODES: Record<number, string> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  402: 'PAYMENT_REQUIRED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'UNPROCESSABLE_ENTITY',
  429: 'RATE_LIMITED',
  500: 'INTERNAL_SERVER_ERROR',
  502: 'BAD_GATEWAY',
  503: 'SERVICE_UNAVAILABLE',
  504: 'GATEWAY_TIMEOUT',
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Generate correlation ID for error tracking
    const correlationId = (request.headers['x-correlation-id'] as string) ||
                          (request.headers['x-request-id'] as string) ||
                          uuidv4();

    let status: number;
    let code: string;
    let message: string;
    let additionalFields: Record<string, any> = {};

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object') {
        const resp = exceptionResponse as Record<string, any>;

        // Extract code and message from the response
        code = resp.code || ERROR_CODES[status] || 'ERROR';
        message = resp.message || exception.message;

        // Handle PaymentRequiredOrUpgrade (402) specific fields
        if (status === 402) {
          additionalFields.required_plan = resp.required_plan;
          additionalFields.current_plan = resp.current_plan;
        }

        // Handle validation errors (400)
        if (status === 400 && Array.isArray(resp.message)) {
          message = resp.message.join('; ');
          additionalFields.details = { validation_errors: resp.message };
        }

        // Handle rate limiting (429) specific fields
        if (status === 429) {
          additionalFields.retry_after = resp.retry_after;
        }
      } else {
        code = ERROR_CODES[status] || 'ERROR';
        message = String(exceptionResponse);
      }
    } else if (exception instanceof Error) {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      code = 'INTERNAL_SERVER_ERROR';
      message = process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred'
        : exception.message;

      // Log the actual error for debugging
      this.logger.error(
        `Unhandled exception: ${exception.message}`,
        exception.stack,
      );
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      code = 'INTERNAL_SERVER_ERROR';
      message = 'An unexpected error occurred';
    }

    // Build the standardized error response
    const errorResponse: ApiErrorResponse = {
      code,
      message,
      correlation_id: correlationId,
      timestamp: new Date().toISOString(),
      path: request.url,
      ...additionalFields,
    };

    // Add stack trace in development mode
    if (process.env.NODE_ENV === 'development' && exception instanceof Error) {
      (errorResponse as any).stack = exception.stack;
    }

    // Log error details
    this.logger.error(
      `${request.method} ${request.url} - ${status} - [${correlationId}] ${code}: ${message}`,
    );

    // Set correlation ID header for tracking
    response.setHeader('X-Correlation-ID', correlationId);
    response.status(status).json(errorResponse);
  }
}

/**
 * Factory functions for creating standardized error responses
 */
export class ApiErrors {
  /**
   * 400 Bad Request
   */
  static badRequest(message: string, code?: string, details?: Record<string, any>): BadRequestException {
    return new BadRequestException({
      code: code || 'BAD_REQUEST',
      message,
      details,
    });
  }

  /**
   * 401 Unauthorized
   */
  static unauthorized(message: string = 'Authentication required'): UnauthorizedException {
    return new UnauthorizedException({
      code: 'UNAUTHORIZED',
      message,
    });
  }

  /**
   * 402 Payment Required / Upgrade Required
   */
  static paymentRequired(
    message: string,
    requiredPlan: string,
    currentPlan: string
  ): HttpException {
    return new HttpException({
      code: 'PAYMENT_REQUIRED',
      message,
      required_plan: requiredPlan,
      current_plan: currentPlan,
    }, HttpStatus.PAYMENT_REQUIRED);
  }

  /**
   * 403 Forbidden
   */
  static forbidden(message: string = 'Access denied'): ForbiddenException {
    return new ForbiddenException({
      code: 'FORBIDDEN',
      message,
    });
  }

  /**
   * 404 Not Found
   */
  static notFound(resource: string, id?: string): NotFoundException {
    const message = id
      ? `${resource} with ID '${id}' not found`
      : `${resource} not found`;
    return new NotFoundException({
      code: 'NOT_FOUND',
      message,
    });
  }

  /**
   * 429 Rate Limited
   */
  static rateLimited(message: string = 'Too many requests', retryAfter?: number): HttpException {
    return new HttpException({
      code: 'RATE_LIMITED',
      message,
      retry_after: retryAfter,
    }, HttpStatus.TOO_MANY_REQUESTS);
  }

  /**
   * 500 Internal Server Error
   */
  static internalError(message: string = 'An unexpected error occurred'): HttpException {
    return new HttpException({
      code: 'INTERNAL_SERVER_ERROR',
      message,
    }, HttpStatus.INTERNAL_SERVER_ERROR);
  }

  /**
   * 503 Service Unavailable
   */
  static serviceUnavailable(service: string): HttpException {
    return new HttpException({
      code: 'SERVICE_UNAVAILABLE',
      message: `${service} is temporarily unavailable`,
    }, HttpStatus.SERVICE_UNAVAILABLE);
  }
}
