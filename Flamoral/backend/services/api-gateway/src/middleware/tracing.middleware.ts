import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class TracingMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TracingMiddleware.name);

  use(req: Request, res: Response, next: NextFunction) {
    // Generate or extract request ID for tracing
    const requestId = (req.headers['x-request-id'] as string) || uuidv4();

    // Generate correlation ID for distributed tracing
    const correlationId = (req.headers['x-correlation-id'] as string) || uuidv4();

    // Generate span ID for this service
    const spanId = uuidv4();

    // Store timing information
    const startTime = Date.now();

    // Attach to request object for downstream use
    (req as any).requestId = requestId;
    (req as any).correlationId = correlationId;
    (req as any).spanId = spanId;
    (req as any).startTime = startTime;

    // Set tracing headers in request (for forwarding to microservices)
    req.headers['x-request-id'] = requestId;
    req.headers['x-correlation-id'] = correlationId;
    req.headers['x-span-id'] = spanId;
    req.headers['x-parent-span-id'] = req.headers['x-span-id'] as string || '';

    // Set tracing headers in response
    res.setHeader('X-Request-ID', requestId);
    res.setHeader('X-Correlation-ID', correlationId);

    // Log request with tracing information
    const { method, originalUrl, ip } = req;
    const userAgent = req.get('user-agent') || 'unknown';
    const userId = (req as any).user?.userId || (req as any).user?.sub || 'anonymous';

    this.logger.log(
      `[${requestId}] [${correlationId}] ${method} ${originalUrl} - User: ${userId} - IP: ${ip} - UA: ${userAgent}`,
    );

    // Log response when finished
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const { statusCode } = res;
      const contentLength = res.get('content-length') || 0;

      // Determine log level based on status code
      const logLevel = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'log';

      this.logger[logLevel](
        `[${requestId}] [${correlationId}] ${method} ${originalUrl} ${statusCode} ${contentLength}B - ${duration}ms`,
      );

      // Log to distributed tracing system (could be Jaeger, Zipkin, etc.)
      this.recordSpan({
        requestId,
        correlationId,
        spanId,
        parentSpanId: req.headers['x-parent-span-id'] as string,
        serviceName: 'api-gateway',
        operation: `${method} ${originalUrl}`,
        startTime,
        duration,
        statusCode,
        tags: {
          'http.method': method,
          'http.url': originalUrl,
          'http.status_code': statusCode,
          'http.user_agent': userAgent,
          'user.id': userId,
          'client.ip': ip,
        },
      });
    });

    next();
  }

  /**
   * Record span to distributed tracing system
   * In production, this would send to Jaeger, Zipkin, or similar
   */
  private recordSpan(span: {
    requestId: string;
    correlationId: string;
    spanId: string;
    parentSpanId: string;
    serviceName: string;
    operation: string;
    startTime: number;
    duration: number;
    statusCode: number;
    tags: Record<string, any>;
  }) {
    // For now, just log the span
    // In production, send to tracing backend (Jaeger, Zipkin, etc.)
    this.logger.debug(`Span recorded: ${JSON.stringify(span)}`);

    // Example: Send to Jaeger
    // await this.jaegerClient.sendSpan(span);
  }
}
