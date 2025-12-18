import {
  Controller,
  Get,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ProxyService } from '../services/proxy.service';
import { Public } from '../decorators/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly proxyService: ProxyService) {}

  /**
   * Register a new user
   */
  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() body: any) {
    return this.proxyService.post('authService', '/api/auth/register', body);
  }

  /**
   * Login user
   */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: any) {
    return this.proxyService.post('authService', '/api/auth/login', body);
  }

  /**
   * Logout user
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Headers('authorization') authorization: string) {
    return this.proxyService.post('authService', '/api/auth/logout', {}, {
      Authorization: authorization,
    });
  }

  /**
   * Refresh access token
   */
  @Public()
  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  async refreshToken(@Body() body: any) {
    return this.proxyService.post('authService', '/api/auth/refresh-token', body);
  }

  /**
   * Verify email
   */
  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() body: any) {
    return this.proxyService.post('authService', '/api/auth/verify-email', body);
  }

  /**
   * Resend verification email
   */
  @Public()
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  async resendVerification(@Body() body: any) {
    return this.proxyService.post('authService', '/api/auth/resend-verification', body);
  }

  /**
   * Request password reset
   */
  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() body: any) {
    return this.proxyService.post('authService', '/api/auth/forgot-password', body);
  }

  /**
   * Reset password with token
   */
  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() body: any) {
    return this.proxyService.post('authService', '/api/auth/reset-password', body);
  }

  /**
   * Get current user info
   */
  @Get('me')
  async me(@Headers('authorization') authorization: string) {
    return this.proxyService.get('authService', '/api/auth/me', {
      Authorization: authorization,
    });
  }
}
