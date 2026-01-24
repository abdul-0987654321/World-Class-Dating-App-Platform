import { Controller, Get, Post, Body, Headers, HttpCode, HttpStatus, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiBody } from '@nestjs/swagger';
import { Request } from 'express';

import { CurrentUser, JwtPayload } from '../decorators/current-user.decorator';
import { Public } from '../decorators/public.decorator';
import { ProxyService } from '../services/proxy.service';
import {
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
  VerifyEmailDto,
  ResendVerificationDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from '../dto/auth.dto';

// Response DTOs for session endpoint
interface UserSummary {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  emailVerified: boolean;
}

interface EntitlementsSnapshot {
  subscription: {
    tier: string;
    status: string;
    expiresAt?: string;
  };
  features: string[];
  limits: {
    dailyLikes: number;
    dailySuperLikes: number;
    dailyBoosts: number;
    messageLimit: number;
  };
  usageToday: {
    likesUsed: number;
    superLikesUsed: number;
    boostsUsed: number;
  };
}

interface SessionResponse {
  user: UserSummary;
  entitlements: EntitlementsSnapshot;
  session: {
    createdAt: string;
    expiresAt: string;
    deviceId?: string;
  };
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly proxyService: ProxyService) {}

  /**
   * Register a new user
   * Transforms camelCase fields to snake_case for auth service compatibility
   */
  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user' })
  @ApiBody({ type: RegisterDto })
  async register(@Body() body: RegisterDto) {
    // Transform camelCase to snake_case for auth service
    const transformedBody = {
      email: body.email,
      password: body.password,
      first_name: body.firstName,
      last_name: body.lastName || '',
      date_of_birth: body.dateOfBirth,
      gender: body.gender,
    };
    return this.proxyService.post('authService', '/api/v1/auth/register', transformedBody);
  }

  /**
   * Login user
   */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiBody({ type: LoginDto })
  async login(@Body() body: LoginDto) {
    return this.proxyService.post('authService', '/api/v1/auth/login', body);
  }

  /**
   * Logout user
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Headers('authorization') authorization: string) {
    return this.proxyService.post(
      'authService',
      '/api/v1/auth/logout',
      {},
      {
        Authorization: authorization,
      }
    );
  }

  /**
   * Refresh access token
   */
  @Public()
  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiBody({ type: RefreshTokenDto })
  async refreshToken(@Body() body: RefreshTokenDto) {
    return this.proxyService.post('authService', '/api/v1/auth/refresh-token', body);
  }

  /**
   * Verify email
   */
  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email address with token' })
  @ApiBody({ type: VerifyEmailDto })
  async verifyEmail(@Body() body: VerifyEmailDto) {
    return this.proxyService.post('authService', '/api/v1/auth/verify-email', body);
  }

  /**
   * Resend verification email
   */
  @Public()
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend email verification' })
  @ApiBody({ type: ResendVerificationDto })
  async resendVerification(@Body() body: ResendVerificationDto) {
    return this.proxyService.post('authService', '/api/v1/auth/resend-verification', body);
  }

  /**
   * Request password reset
   */
  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset email' })
  @ApiBody({ type: ForgotPasswordDto })
  async forgotPassword(@Body() body: ForgotPasswordDto) {
    return this.proxyService.post('authService', '/api/v1/auth/forgot-password', body);
  }

  /**
   * Reset password with token
   */
  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiBody({ type: ResetPasswordDto })
  async resetPassword(@Body() body: ResetPasswordDto) {
    return this.proxyService.post('authService', '/api/v1/auth/reset-password', body);
  }

  /**
   * Get current user info
   */
  @Get('me')
  @ApiOperation({ summary: 'Get current user info' })
  @ApiBearerAuth('JWT-auth')
  async me(@Headers('authorization') authorization: string) {
    return this.proxyService.get('authService', '/api/v1/auth/me', {
      Authorization: authorization,
    });
  }

  /**
   * Get current session info with entitlements snapshot
   * Returns user summary and their current entitlements/limits
   */
  @Get('session')
  @ApiOperation({ summary: 'Get current session info with entitlements' })
  @ApiBearerAuth('JWT-auth')
  @ApiResponse({
    status: 200,
    description: 'Session info with entitlements',
    schema: {
      type: 'object',
      properties: {
        user: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            emailVerified: { type: 'boolean' },
          },
        },
        entitlements: {
          type: 'object',
          properties: {
            subscription: {
              type: 'object',
              properties: {
                tier: { type: 'string' },
                status: { type: 'string' },
                expiresAt: { type: 'string' },
              },
            },
            features: { type: 'array', items: { type: 'string' } },
            limits: {
              type: 'object',
              properties: {
                dailyLikes: { type: 'number' },
                dailySuperLikes: { type: 'number' },
                dailyBoosts: { type: 'number' },
                messageLimit: { type: 'number' },
              },
            },
            usageToday: {
              type: 'object',
              properties: {
                likesUsed: { type: 'number' },
                superLikesUsed: { type: 'number' },
                boostsUsed: { type: 'number' },
              },
            },
          },
        },
        session: {
          type: 'object',
          properties: {
            createdAt: { type: 'string' },
            expiresAt: { type: 'string' },
            deviceId: { type: 'string' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getSession(
    @Headers('authorization') authorization: string,
    @CurrentUser() user: JwtPayload
  ): Promise<SessionResponse> {
    // Fetch user data and subscription info in parallel
    const [userData, subscriptionData, usageData] = await Promise.all([
      this.proxyService.get('authService', '/api/v1/auth/me', {
        Authorization: authorization,
      }),
      this.proxyService
        .get('userService', '/api/subscriptions/current', {
          Authorization: authorization,
        })
        .catch(() => null),
      this.proxyService
        .get('matchingService', '/api/swipes/stats', {
          Authorization: authorization,
        })
        .catch(() => null),
    ]);

    // Determine tier-based limits
    const tier = subscriptionData?.tier || user?.subscription || 'free';
    const limits = this.getTierLimits(tier);

    // Build entitlements snapshot
    const entitlements: EntitlementsSnapshot = {
      subscription: {
        tier: tier,
        status: subscriptionData?.status || 'active',
        expiresAt: subscriptionData?.expiresAt,
      },
      features: this.getTierFeatures(tier),
      limits: limits,
      usageToday: {
        likesUsed: usageData?.likesUsed || 0,
        superLikesUsed: usageData?.superLikesUsed || 0,
        boostsUsed: usageData?.boostsUsed || 0,
      },
    };

    // Build session info from JWT
    const session = {
      createdAt: user?.iat ? new Date(user.iat * 1000).toISOString() : new Date().toISOString(),
      expiresAt: user?.exp
        ? new Date(user.exp * 1000).toISOString()
        : new Date(Date.now() + 3600000).toISOString(),
      deviceId: user?.deviceId,
    };

    return {
      user: {
        id: userData?.id || user?.sub,
        email: userData?.email || user?.email,
        firstName: userData?.firstName,
        lastName: userData?.lastName,
        emailVerified: userData?.emailVerified ?? false,
      },
      entitlements,
      session,
    };
  }

  /**
   * Get tier-based limits
   */
  private getTierLimits(tier: string): EntitlementsSnapshot['limits'] {
    const tierLimits: Record<string, EntitlementsSnapshot['limits']> = {
      free: {
        dailyLikes: 50,
        dailySuperLikes: 1,
        dailyBoosts: 0,
        messageLimit: -1, // unlimited for matches
      },
      basic: {
        dailyLikes: 100,
        dailySuperLikes: 3,
        dailyBoosts: 1,
        messageLimit: -1,
      },
      plus: {
        dailyLikes: 200,
        dailySuperLikes: 5,
        dailyBoosts: 3,
        messageLimit: -1,
      },
      premium: {
        dailyLikes: -1, // unlimited
        dailySuperLikes: 10,
        dailyBoosts: 5,
        messageLimit: -1,
      },
      premium_plus: {
        dailyLikes: -1,
        dailySuperLikes: -1,
        dailyBoosts: -1,
        messageLimit: -1,
      },
      elite: {
        dailyLikes: -1,
        dailySuperLikes: -1,
        dailyBoosts: -1,
        messageLimit: -1,
      },
    };

    return tierLimits[tier] || tierLimits.free;
  }

  /**
   * Get tier-based features
   */
  private getTierFeatures(tier: string): string[] {
    const baseFeatures = ['swipe', 'match', 'message', 'profile'];
    const tierFeatures: Record<string, string[]> = {
      free: baseFeatures,
      basic: [...baseFeatures, 'super_like', 'rewind', 'see_likes_preview'],
      plus: [...baseFeatures, 'super_like', 'rewind', 'see_likes', 'boost', 'passport', 'hide_ads'],
      premium: [
        ...baseFeatures,
        'super_like',
        'rewind',
        'see_likes',
        'boost',
        'passport',
        'hide_ads',
        'priority_likes',
        'read_receipts',
        'top_picks',
      ],
      premium_plus: [
        ...baseFeatures,
        'super_like',
        'rewind',
        'see_likes',
        'boost',
        'passport',
        'hide_ads',
        'priority_likes',
        'read_receipts',
        'top_picks',
        'incognito',
        'message_before_match',
      ],
      elite: [
        ...baseFeatures,
        'super_like',
        'rewind',
        'see_likes',
        'boost',
        'passport',
        'hide_ads',
        'priority_likes',
        'read_receipts',
        'top_picks',
        'incognito',
        'message_before_match',
        'verified_badge',
        'concierge',
      ],
    };

    return tierFeatures[tier] || tierFeatures.free;
  }
}
