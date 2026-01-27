import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { map } = require('rxjs/operators');

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
  path: string;
  requestId?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    [key: string]: any;
  };
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  private readonly logger = new Logger(TransformInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): any {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    // Extract request ID from headers (added by tracing middleware)
    const requestId = request.headers['x-request-id'] as string;

    return (next.handle() as any).pipe(
      map((data) => {
        // If data is already wrapped (from microservices), unwrap it
        let responseData = data;
        let meta: any = undefined;

        // Handle different response formats
        if (data && typeof data === 'object') {
          // If already in standard format, pass through
          if ('success' in data && 'data' in data) {
            return data;
          }

          // Extract pagination metadata if present
          if ('items' in data && 'total' in data) {
            responseData = data.items;
            meta = {
              total: data.total,
              page: data.page,
              limit: data.limit,
              totalPages: data.totalPages,
            };
          } else if ('data' in data && 'meta' in data) {
            responseData = data.data;
            meta = data.meta;
          } else if ('data' in data) {
            responseData = data.data;
          }
        }

        // Build the standardized response
        const apiResponse: ApiResponse<T> = {
          success: true,
          data: responseData,
          timestamp: new Date().toISOString(),
          path: request.url,
        };

        // Add request ID if available
        if (requestId) {
          apiResponse.requestId = requestId;
        }

        // Add metadata if available
        if (meta) {
          apiResponse.meta = meta;
        }

        // Set response headers
        response.setHeader('X-Response-Time', Date.now() - (request as any).startTime || 0);
        if (requestId) {
          response.setHeader('X-Request-ID', requestId);
        }

        return apiResponse;
      })
    );
  }
}
