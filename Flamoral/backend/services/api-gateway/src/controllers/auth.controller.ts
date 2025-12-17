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

@Controller('api/auth')
export class AuthController {
  constructor(private readonly proxyService: ProxyService) {}

  /**
   * Register a new user
   * Transforms camelCase fields from frontend to snake_case for auth service
   */
  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() body: any) {
    // Transform camelCase to snake_case for auth service compatibility
    const transformedBody = {
      email: body.email,
      password: body.password,
      first_name: body.firstName || body.first_name,
      last_name: body.lastName || body.last_name,
      date_of_birth: body.dateOfBirth || body.date_of_birth,
      gender: this.normalizeGender(body.gender),
      phone_number: body.phoneNumber || body.phone_number,
    };

    // Remove undefined fields
    Object.keys(transformedBody).forEach(key => {
      if (transformedBody[key] === undefined) {
        delete transformedBody[key];
      }
    });

    return this.proxyService.post('authService', '/api/auth/register', transformedBody);
  }

  /**
   * Normalize gender values to match auth service expectations
   */
  private normalizeGender(gender: string): string {
    if (!gender) return gender;

    const genderMap: Record<string, string> = {
      'non_binary': 'non-binary',
      'nonbinary': 'non-binary',
      'prefer_not_to_say': 'other',
    };

    return genderMap[gender.toLowerCase()] || gender;
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
