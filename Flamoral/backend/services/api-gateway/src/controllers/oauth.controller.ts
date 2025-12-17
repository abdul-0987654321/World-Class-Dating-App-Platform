import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ProxyService } from '../services/proxy.service';
import { Public } from '../decorators/public.decorator';

@Controller('auth/oauth')
export class OAuthController {
  constructor(private readonly proxyService: ProxyService) {}

  /**
   * Google OAuth authentication
   * POST /api/auth/oauth/google
   */
  @Public()
  @Post('google')
  @HttpCode(HttpStatus.OK)
  async googleAuth(@Body() body: any) {
    return this.proxyService.post('authService', '/api/auth/oauth/google', body);
  }

  /**
   * Facebook OAuth authentication
   * POST /api/auth/oauth/facebook
   */
  @Public()
  @Post('facebook')
  @HttpCode(HttpStatus.OK)
  async facebookAuth(@Body() body: any) {
    return this.proxyService.post('authService', '/api/auth/oauth/facebook', body);
  }

  /**
   * Apple OAuth authentication
   * POST /api/auth/oauth/apple
   */
  @Public()
  @Post('apple')
  @HttpCode(HttpStatus.OK)
  async appleAuth(@Body() body: any) {
    return this.proxyService.post('authService', '/api/auth/oauth/apple', body);
  }
}
