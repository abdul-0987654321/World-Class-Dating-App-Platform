import { Request, Response } from 'express';

import { AuthService } from '../../domain/services/auth.service';
import { SocialAuthService } from '../../domain/services/social-auth.service';
import { VerificationService } from '../../domain/services/verification.service';
import logger from '../../utils/logger';

export class AuthController {
  private authService: AuthService;
  private verificationService: VerificationService;
  private socialAuthService: SocialAuthService;

  constructor(
    authService?: AuthService,
    verificationService?: VerificationService,
    socialAuthService?: SocialAuthService
  ) {
    this.authService = authService || new AuthService();
    this.verificationService = verificationService || new VerificationService();
    this.socialAuthService = socialAuthService || new SocialAuthService();
  }

  async register(req: Request, res: Response): Promise<Response> {
    try {
      const result = await this.authService.register(req.body);

      return res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: result,
      });
    } catch (error: any) {
      logger.error('Registration error:', error);

      return res.status(400).json({
        success: false,
        message: error.message || 'Registration failed',
      });
    }
  }

  async login(req: Request, res: Response): Promise<Response> {
    try {
      const result = await this.authService.login(req.body);

      return res.status(200).json({
        success: true,
        message: 'Login successful',
        data: result,
      });
    } catch (error: any) {
      logger.error('Login error:', error);

      return res.status(401).json({
        success: false,
        message: error.message || 'Login failed',
      });
    }
  }

  async refreshToken(req: Request, res: Response): Promise<Response> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          message: 'Refresh token is required',
        });
      }

      const result = await this.authService.refreshToken(refreshToken);

      return res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        data: result,
      });
    } catch (error: any) {
      logger.error('Token refresh error:', error);

      return res.status(401).json({
        success: false,
        message: error.message || 'Token refresh failed',
      });
    }
  }

  async verifyEmail(req: Request, res: Response): Promise<Response> {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({
          success: false,
          message: 'Verification token is required',
        });
      }

      await this.verificationService.verifyEmail(token);

      return res.status(200).json({
        success: true,
        message: 'Email verified successfully',
      });
    } catch (error: any) {
      logger.error('Email verification error:', error);

      return res.status(400).json({
        success: false,
        message: error.message || 'Email verification failed',
      });
    }
  }

  async resendVerification(req: Request, res: Response): Promise<Response> {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email is required',
        });
      }

      await this.verificationService.resendVerificationEmail(email);

      return res.status(200).json({
        success: true,
        message: 'Verification email sent successfully',
      });
    } catch (error: any) {
      logger.error('Resend verification error:', error);

      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to send verification email',
      });
    }
  }

  async forgotPassword(req: Request, res: Response): Promise<Response> {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email is required',
        });
      }

      await this.authService.requestPasswordReset(email);

      return res.status(200).json({
        success: true,
        message: 'Password reset email sent successfully',
      });
    } catch (error: any) {
      logger.error('Forgot password error:', error);

      // Return success even if user not found (security best practice)
      return res.status(200).json({
        success: true,
        message: 'If the email exists, a password reset link has been sent',
      });
    }
  }

  async resetPassword(req: Request, res: Response): Promise<Response> {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({
          success: false,
          message: 'Token and new password are required',
        });
      }

      await this.authService.resetPassword(token, newPassword);

      return res.status(200).json({
        success: true,
        message: 'Password reset successfully',
      });
    } catch (error: any) {
      logger.error('Reset password error:', error);

      return res.status(400).json({
        success: false,
        message: error.message || 'Password reset failed',
      });
    }
  }

  // Social Authentication Endpoints

  async googleLogin(req: Request, res: Response): Promise<Response> {
    try {
      const { code, id_token, access_token } = req.body;

      if (!code && !id_token) {
        return res.status(400).json({
          success: false,
          message: 'Google authorization code or ID token is required',
        });
      }

      const result = await this.socialAuthService.loginWithGoogle({
        code,
        id_token,
        access_token,
      });

      return res.status(200).json({
        success: true,
        message: result.isNewUser ? 'Account created successfully' : 'Login successful',
        data: result,
      });
    } catch (error: any) {
      logger.error('Google login error:', error);

      return res.status(401).json({
        success: false,
        message: error.message || 'Google authentication failed',
      });
    }
  }

  async appleLogin(req: Request, res: Response): Promise<Response> {
    try {
      const { code, id_token, user } = req.body;

      if (!code || !id_token) {
        return res.status(400).json({
          success: false,
          message: 'Apple authorization code and ID token are required',
        });
      }

      const result = await this.socialAuthService.loginWithApple({
        code,
        id_token,
        user,
      });

      return res.status(200).json({
        success: true,
        message: result.isNewUser ? 'Account created successfully' : 'Login successful',
        data: result,
      });
    } catch (error: any) {
      logger.error('Apple login error:', error);

      return res.status(401).json({
        success: false,
        message: error.message || 'Apple authentication failed',
      });
    }
  }

  async facebookLogin(req: Request, res: Response): Promise<Response> {
    try {
      const { access_token } = req.body;

      if (!access_token) {
        return res.status(400).json({
          success: false,
          message: 'Facebook access token is required',
        });
      }

      const result = await this.socialAuthService.loginWithFacebook({
        access_token,
      });

      return res.status(200).json({
        success: true,
        message: result.isNewUser ? 'Account created successfully' : 'Login successful',
        data: result,
      });
    } catch (error: any) {
      logger.error('Facebook login error:', error);

      return res.status(401).json({
        success: false,
        message: error.message || 'Facebook authentication failed',
      });
    }
  }

  async linkSocialAccount(req: Request, res: Response): Promise<Response> {
    try {
      const userId = (req as any).user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      const { provider, token } = req.body;

      if (!provider || !token) {
        return res.status(400).json({
          success: false,
          message: 'Provider and token are required',
        });
      }

      await this.socialAuthService.linkAccount({
        userId,
        provider,
        token,
      });

      return res.status(200).json({
        success: true,
        message: `${provider} account linked successfully`,
      });
    } catch (error: any) {
      logger.error('Link account error:', error);

      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to link account',
      });
    }
  }

  async unlinkSocialAccount(req: Request, res: Response): Promise<Response> {
    try {
      const userId = (req as any).user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      const { provider } = req.body;

      if (!provider) {
        return res.status(400).json({
          success: false,
          message: 'Provider is required',
        });
      }

      await this.socialAuthService.unlinkAccount(userId, provider);

      return res.status(200).json({
        success: true,
        message: `${provider} account unlinked successfully`,
      });
    } catch (error: any) {
      logger.error('Unlink account error:', error);

      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to unlink account',
      });
    }
  }

  async getLinkedAccounts(req: Request, res: Response): Promise<Response> {
    try {
      const userId = (req as any).user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      const accounts = await this.socialAuthService.getLinkedAccounts(userId);

      return res.status(200).json({
        success: true,
        data: accounts,
      });
    } catch (error: any) {
      logger.error('Get linked accounts error:', error);

      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to get linked accounts',
      });
    }
  }

  async refreshSocialToken(req: Request, res: Response): Promise<Response> {
    try {
      const userId = (req as any).user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      const { provider } = req.body;

      if (!provider) {
        return res.status(400).json({
          success: false,
          message: 'Provider is required',
        });
      }

      await this.socialAuthService.refreshSocialToken(userId, provider);

      return res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
      });
    } catch (error: any) {
      logger.error('Refresh social token error:', error);

      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to refresh token',
      });
    }
  }

  /**
   * Generate state parameter for OAuth CSRF protection
   */
  async generateOAuthState(req: Request, res: Response): Promise<Response> {
    try {
      const { nonce } = req.body;

      const state = this.socialAuthService.generateState(nonce);

      return res.status(200).json({
        success: true,
        data: {
          state,
          expiresIn: 300, // 5 minutes in seconds
        },
      });
    } catch (error: any) {
      logger.error('Generate OAuth state error:', error);

      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to generate state',
      });
    }
  }
}
