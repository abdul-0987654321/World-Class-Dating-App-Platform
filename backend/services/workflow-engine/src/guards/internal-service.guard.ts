import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class InternalServiceGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const internalKey = request.headers['x-internal-service-key'];
    const expectedKey = this.configService.get<string>('internalServiceKey');

    if (!internalKey || internalKey !== expectedKey) {
      throw new UnauthorizedException('Invalid or missing internal service key');
    }

    return true;
  }
}
