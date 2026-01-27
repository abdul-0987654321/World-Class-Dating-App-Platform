import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Request } from 'express';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { tap } = require('rxjs/operators');

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): any {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, url, ip } = request;
    const userAgent = request.get('user-agent') || '';
    const userId = (request as any).user?.sub || 'anonymous';

    const now = Date.now();
    const self = this;

    return (next.handle() as any).pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse();
          const { statusCode } = response;
          const contentLength = response.get('content-length') || 0;
          const responseTime = Date.now() - now;

          self.logger.log(
            `${method} ${url} ${statusCode} ${contentLength} - ${responseTime}ms - ${userAgent} ${ip} [User: ${userId}]`
          );
        },
        error: (error: any) => {
          const responseTime = Date.now() - now;
          self.logger.error(`${method} ${url} ERROR - ${responseTime}ms - ${error.message}`);
        },
      })
    );
  }
}
