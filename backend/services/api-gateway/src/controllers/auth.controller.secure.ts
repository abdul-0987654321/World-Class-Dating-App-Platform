import {
  Controller,
  Get,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  Res,
  Req,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ProxyService } from '../services/proxy.service';
import { Public } from '../decorators/public.decorator';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly proxyService: ProxyService) {}

  /**
   * Cookie configuration for secure token storage
   */
  private readonly COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    sameSite: 'strict' as const,
    maxAge: 15 * 60 * 1000, // 15 minutes for access token
    path: '/',
  };

  private readonly REFRESH_COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days for refresh token
    path: '/api/auth/refresh-token',
  };

  /**
   * Register a new user
   */
  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() body: any, @Res({ passthrough: true }) res: Response) {
    const response = await this.proxyService.post('authService', '/api/auth/register', body);

    // Set tokens in httpOnly cookies
    if (response.data?.accessToken) {
      res.cookie('accessToken', response.data.accessToken, this.COOKIE_OPTIONS);
    }
    if (response.data?.refreshToken) {
      res.cookie('refreshToken', response.data.refreshToken, this.REFRESH_COOKIE_OPTIONS);
    }

    // Return user data without tokens
    return {
      success: response.success,
      data: {
        user: response.data.user,
      },
    };
  }

  /**
   * Login user
   */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: any, @Res({ passthrough: true }) res: Response) {
    const response = await this.proxyService.post('authService', '/api/auth/login', body);

    // Set tokens in httpOnly cookies
    if (response.data?.accessToken) {
      res.cookie('accessToken', response.data.accessToken, this.COOKIE_OPTIONS);
    }
    if (response.data?.refreshToken) {
      res.cookie('refreshToken', response.data.refreshToken, this.REFRESH_COOKIE_OPTIONS);
    }

    // Return user data without tokens
    return {
      success: response.success,
      data: {
        user: response.data.user,
      },
    };
  }

  /**
   * Logout user
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Headers('authorization') authorization: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Clear cookies
    res.clearCookie('accessToken', { path: '/' });
    res.clearCookie('refreshToken', { path: '/api/auth/refresh-token' });

    return this.proxyService.post('authService', '/api/auth/logout', {}, {
      Authorization: authorization,
    });
  }

  /**
   * Refresh access token using httpOnly refresh token cookie
   */
  @Public()
  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  async refreshToken(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      throw new Error('Refresh token not found');
    }

    const response = await this.proxyService.post(
      'authService',
      '/api/auth/refresh-token',
      { refreshToken },
    );

    // Set new access token in httpOnly cookie
    if (response.data?.accessToken) {
      res.cookie('accessToken', response.data.accessToken, this.COOKIE_OPTIONS);
    }

    // Optionally rotate refresh token
    if (response.data?.refreshToken) {
      res.cookie('refreshToken', response.data.refreshToken, this.REFRESH_COOKIE_OPTIONS);
    }

    return {
      success: true,
      data: {
        user: response.data.user,
      },
    };
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
