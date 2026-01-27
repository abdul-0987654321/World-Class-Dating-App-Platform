import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  RequestTimeoutException,
} from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { timeout, catchError } = require('rxjs/operators');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { throwError, TimeoutError } = require('rxjs');

@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  constructor(private readonly timeoutMs: number = 30000) {}

  intercept(context: ExecutionContext, next: CallHandler): any {
    return (next.handle() as any).pipe(
      timeout(this.timeoutMs),
      catchError((err: any) => {
        if (err instanceof TimeoutError) {
          return throwError(() => new RequestTimeoutException('Request timed out'));
        }
        return throwError(() => err);
      })
    );
  }
}
