import { Request, Response } from 'express';
import oauthService from '../../domain/services/oauth.service';
import logger from '../../utils/logger';

class OAuthController {
  /**
   * POST /api/auth/oauth/google
   * Authenticate with Google OAuth
   */
  async googleAuth(req: Request, res: Response): Promise<Response> {
    try {
      const { accessToken } = req.body;

      if (!accessToken) {
        return res.status(400).json({
          success: false,
          error: 'Google access token is required',
        });
      }

      // Verify Google token and get profile
      const profile = await oauthService.verifyGoogleToken(accessToken);

      // Authenticate or create user
      const result = await oauthService.authenticateWithOAuth(profile);

      return res.status(200).json({
        success: true,
        message: result.isNewUser ? 'Account created successfully' : 'Login successful',
        data: result,
      });
    } catch (error: any) {
      logger.error('Google OAuth failed', error);
      return res.status(401).json({
        success: false,
        error: error.message || 'Google authentication failed',
      });
    }
  }

  /**
   * POST /api/auth/oauth/facebook
   * Authenticate with Facebook OAuth
   */
  async facebookAuth(req: Request, res: Response): Promise<Response> {
    try {
      const { accessToken } = req.body;

      if (!accessToken) {
        return res.status(400).json({
          success: false,
          error: 'Facebook access token is required',
        });
      }

      // Verify Facebook token and get profile
      const profile = await oauthService.verifyFacebookToken(accessToken);

      // Authenticate or create user
      const result = await oauthService.authenticateWithOAuth(profile);

      return res.status(200).json({
        success: true,
        message: result.isNewUser ? 'Account created successfully' : 'Login successful',
        data: result,
      });
    } catch (error: any) {
      logger.error('Facebook OAuth failed', error);
      return res.status(401).json({
        success: false,
        error: error.message || 'Facebook authentication failed',
      });
    }
  }

  /**
   * POST /api/auth/oauth/apple
   * Authenticate with Apple OAuth
   */
  async appleAuth(req: Request, res: Response): Promise<Response> {
    try {
      const { idToken, user } = req.body;

      if (!idToken) {
        return res.status(400).json({
          success: false,
          error: 'Apple ID token is required',
        });
      }

      // Verify Apple token and get profile
      const profile = await oauthService.verifyAppleToken(idToken);

      // Apple might send user info on first sign-in
      if (user && user.name) {
        profile.firstName = user.name.firstName || profile.firstName;
        profile.lastName = user.name.lastName || profile.lastName;
      }

      // Authenticate or create user
      const result = await oauthService.authenticateWithOAuth(profile);

      return res.status(200).json({
        success: true,
        message: result.isNewUser ? 'Account created successfully' : 'Login successful',
        data: result,
      });
    } catch (error: any) {
      logger.error('Apple OAuth failed', error);
      return res.status(401).json({
        success: false,
        error: error.message || 'Apple authentication failed',
      });
    }
  }
}

export const oauthController = new OAuthController();
export default oauthController;
