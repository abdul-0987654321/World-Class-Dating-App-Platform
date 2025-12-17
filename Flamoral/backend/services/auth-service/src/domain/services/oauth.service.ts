import { userRepository, User, CreateUserDto } from '../repositories/user.repository';
import jwtUtils, { JwtPayload, TokenPair } from '../../utils/jwt';
import logger from '../../utils/logger';
import redisCache from '../../infrastructure/cache/redis';
import axios from 'axios';
import * as jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { config } from '../../config';

export interface OAuthProfile {
  provider: 'google' | 'facebook' | 'apple';
  providerId: string;
  email: string;
  firstName: string;
  lastName: string;
  profilePicture?: string;
  emailVerified?: boolean;
}

export interface OAuthResponse {
  user: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    is_email_verified: boolean;
  };
  accessToken: string;
  refreshToken: string;
  isNewUser: boolean;
}

class OAuthService {
  // OAuth provider configuration with validation
  private readonly googleClientId: string;
  private readonly facebookAppId: string;
  private readonly facebookAppSecret: string;
  private readonly appleClientId: string;
  private readonly appleTeamId: string;

  // JWKS clients for token verification
  private readonly googleJwksClient: jwksClient.JwksClient;
  private readonly appleJwksClient: jwksClient.JwksClient;

  constructor() {
    // Validate OAuth credentials are configured
    this.googleClientId = process.env.GOOGLE_CLIENT_ID || '';
    this.facebookAppId = process.env.FACEBOOK_APP_ID || '';
    this.facebookAppSecret = process.env.FACEBOOK_APP_SECRET || '';
    this.appleClientId = process.env.APPLE_CLIENT_ID || 'com.flamoral.app';
    this.appleTeamId = process.env.APPLE_TEAM_ID || '';

    // Initialize JWKS clients for secure token verification
    this.googleJwksClient = jwksClient({
      jwksUri: 'https://www.googleapis.com/oauth2/v3/certs',
      cache: true,
      cacheMaxAge: 86400000, // 24 hours
      rateLimit: true,
      jwksRequestsPerMinute: 10,
    });

    this.appleJwksClient = jwksClient({
      jwksUri: 'https://appleid.apple.com/auth/keys',
      cache: true,
      cacheMaxAge: 86400000, // 24 hours
      rateLimit: true,
      jwksRequestsPerMinute: 10,
    });

    // Warn if OAuth credentials are not configured
    if (!this.googleClientId) {
      logger.warn('GOOGLE_CLIENT_ID is not configured. Google OAuth will not work.');
    }
    if (!this.facebookAppId || !this.facebookAppSecret) {
      logger.warn('Facebook OAuth credentials not configured. Facebook OAuth will not work.');
    }
    if (!this.appleClientId || !this.appleTeamId) {
      logger.warn('Apple OAuth credentials not configured. Apple OAuth will not work.');
    }
  }

  /**
   * Verify Google OAuth token and get user info
   * Uses Google's tokeninfo endpoint for secure verification
   */
  async verifyGoogleToken(accessToken: string): Promise<OAuthProfile> {
    try {
      if (!this.googleClientId) {
        throw new Error('Google OAuth is not configured');
      }

      // Verify token using Google's tokeninfo endpoint
      const tokenInfoResponse = await axios.get('https://oauth2.googleapis.com/tokeninfo', {
        params: {
          access_token: accessToken,
        },
        timeout: 5000,
      });

      const tokenInfo = tokenInfoResponse.data;

      // Validate audience (client ID)
      if (tokenInfo.aud !== this.googleClientId) {
        throw new Error('Invalid Google token audience');
      }

      // Validate token expiration
      if (tokenInfo.exp && parseInt(tokenInfo.exp) < Date.now() / 1000) {
        throw new Error('Google token has expired');
      }

      // Get user info
      const userInfoResponse = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        timeout: 5000,
      });

      const { sub, email, given_name, family_name, picture, email_verified } = userInfoResponse.data;

      if (!email) {
        throw new Error('Email not provided by Google');
      }

      return {
        provider: 'google',
        providerId: sub,
        email: email,
        firstName: given_name || 'Unknown',
        lastName: family_name || 'User',
        profilePicture: picture,
        emailVerified: email_verified,
      };
    } catch (error: any) {
      logger.error('Failed to verify Google token', { error: error.message });
      throw new Error('Invalid Google access token');
    }
  }

  /**
   * Verify Facebook OAuth token and get user info
   * Uses Facebook's debug_token endpoint for secure verification
   */
  async verifyFacebookToken(accessToken: string): Promise<OAuthProfile> {
    try {
      if (!this.facebookAppId || !this.facebookAppSecret) {
        throw new Error('Facebook OAuth is not configured');
      }

      // Get app access token for verification
      const appTokenResponse = await axios.get('https://graph.facebook.com/oauth/access_token', {
        params: {
          client_id: this.facebookAppId,
          client_secret: this.facebookAppSecret,
          grant_type: 'client_credentials',
        },
        timeout: 5000,
      });

      const appAccessToken = appTokenResponse.data.access_token;

      // Verify user token using debug_token endpoint
      const debugTokenResponse = await axios.get('https://graph.facebook.com/debug_token', {
        params: {
          input_token: accessToken,
          access_token: appAccessToken,
        },
        timeout: 5000,
      });

      const debugData = debugTokenResponse.data.data;

      // Validate token
      if (!debugData.is_valid) {
        throw new Error('Invalid Facebook token');
      }

      // Validate app ID
      if (debugData.app_id !== this.facebookAppId) {
        throw new Error('Token was not issued for this app');
      }

      // Validate token expiration
      if (debugData.expires_at && debugData.expires_at < Date.now() / 1000) {
        throw new Error('Facebook token has expired');
      }

      // Get user info
      const userResponse = await axios.get('https://graph.facebook.com/v18.0/me', {
        params: {
          fields: 'id,email,first_name,last_name,picture',
          access_token: accessToken,
        },
        timeout: 5000,
      });

      const { id, email, first_name, last_name, picture } = userResponse.data;

      if (!email) {
        throw new Error('Email permission not granted');
      }

      return {
        provider: 'facebook',
        providerId: id,
        email: email,
        firstName: first_name || 'Unknown',
        lastName: last_name || 'User',
        profilePicture: picture?.data?.url,
        emailVerified: true, // Facebook emails are verified
      };
    } catch (error: any) {
      logger.error('Failed to verify Facebook token', { error: error.message });
      throw new Error('Invalid Facebook access token');
    }
  }

  /**
   * Get signing key for Apple JWT verification
   */
  private async getAppleSigningKey(header: jwt.JwtHeader): Promise<string> {
    return new Promise((resolve, reject) => {
      this.appleJwksClient.getSigningKey(header.kid, (err, key) => {
        if (err) {
          reject(err);
        } else {
          const signingKey = key?.getPublicKey();
          if (signingKey) {
            resolve(signingKey);
          } else {
            reject(new Error('Unable to get Apple signing key'));
          }
        }
      });
    });
  }

  /**
   * Verify Apple OAuth token (ID token verification)
   * Uses Apple's public keys for JWT signature verification
   */
  async verifyAppleToken(idToken: string): Promise<OAuthProfile> {
    try {
      if (!this.appleClientId) {
        throw new Error('Apple OAuth is not configured');
      }

      // Decode token header to get key ID
      const decodedHeader = jwt.decode(idToken, { complete: true });
      if (!decodedHeader || !decodedHeader.header || !decodedHeader.header.kid) {
        throw new Error('Invalid Apple ID token format');
      }

      // Get Apple's public key for verification
      const signingKey = await this.getAppleSigningKey(decodedHeader.header);

      // Verify the token with Apple's public key
      const decoded = jwt.verify(idToken, signingKey, {
        algorithms: ['RS256'],
        audience: this.appleClientId,
        issuer: 'https://appleid.apple.com',
      }) as any;

      if (!decoded || !decoded.sub || !decoded.email) {
        throw new Error('Invalid Apple ID token claims');
      }

      // Validate token expiration
      if (decoded.exp && decoded.exp < Date.now() / 1000) {
        throw new Error('Apple ID token has expired');
      }

      // Validate issued at time (not too far in the past)
      if (decoded.iat && decoded.iat > Date.now() / 1000 + 300) {
        throw new Error('Apple ID token issued in the future');
      }

      // Extract name from the token or use defaults
      // Apple only sends name on first sign-in
      const nameParts = decoded.name?.split(' ') || ['Unknown', 'User'];

      return {
        provider: 'apple',
        providerId: decoded.sub,
        email: decoded.email,
        firstName: nameParts[0] || 'Unknown',
        lastName: nameParts.slice(1).join(' ') || 'User',
        emailVerified: decoded.email_verified !== false, // Apple emails are verified
      };
    } catch (error: any) {
      logger.error('Failed to verify Apple token', { error: error.message });
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid Apple ID token signature');
      } else if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Apple ID token has expired');
      }
      throw new Error('Invalid Apple ID token');
    }
  }

  /**
   * Authenticate user with OAuth
   * Creates new user if doesn't exist, or logs in existing user
   */
  async authenticateWithOAuth(profile: OAuthProfile): Promise<OAuthResponse> {
    let user: User | null = null;
    let isNewUser = false;

    // Try to find user by email
    user = await userRepository.findByEmail(profile.email);

    if (!user) {
      // Create new user
      isNewUser = true;

      // For OAuth users, we don't have a password, so generate a secure random password
      // This prevents the account from being accessed via traditional login
      const { generateSecurePassword, hashPassword } = await import('../../utils/encryption');
      const randomPassword = generateSecurePassword();
      const hashedPassword = await hashPassword(randomPassword);

      // Determine gender based on first name or set to 'other' for user to update later
      const gender = 'other';

      // Set a default date of birth (user will need to update this)
      const dateOfBirth = new Date();
      dateOfBirth.setFullYear(dateOfBirth.getFullYear() - 25); // Default to 25 years old

      const createUserDto: CreateUserDto = {
        email: profile.email,
        password_hash: hashedPassword, // Hashed random password - prevents traditional login
        first_name: profile.firstName,
        last_name: profile.lastName,
        date_of_birth: dateOfBirth,
        gender: gender,
      };

      user = await userRepository.create(createUserDto);

      // Mark email as verified if the OAuth provider confirms it
      if (profile.emailVerified && user.id) {
        await userRepository.verifyEmail(user.id);
        logger.info(`Email auto-verified for OAuth user: ${user.email}`);
      }

      logger.info(`New user created via ${profile.provider} OAuth: ${user.email}`);

      // Store OAuth provider info
      await this.storeOAuthProvider(user.id, profile.provider, profile.providerId);
    } else {
      // Existing user - check if they already have this OAuth provider linked
      const hasProvider = await this.hasOAuthProvider(user.id, profile.provider);

      if (!hasProvider) {
        // Link OAuth provider to existing user
        await this.storeOAuthProvider(user.id, profile.provider, profile.providerId);
        logger.info(`Linked ${profile.provider} OAuth to existing user: ${user.email}`);
      }

      // Update last login
      await userRepository.updateLastLogin(user.id);
    }

    // Generate tokens
    const tokens = this.generateTokens(user);

    // Store refresh token in Redis
    const decoded = jwtUtils.decodeToken(tokens.refreshToken);
    await redisCache.setRefreshToken(
      user.id,
      tokens.refreshToken,
      7 * 24 * 60 * 60, // 7 days
      decoded?.jti
    );

    logger.info(`User authenticated via ${profile.provider} OAuth: ${user.email}`);

    return {
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        is_email_verified: user.is_email_verified,
      },
      ...tokens,
      isNewUser,
    };
  }

  /**
   * Store OAuth provider information in Redis
   */
  private async storeOAuthProvider(
    userId: string,
    provider: string,
    providerId: string
  ): Promise<void> {
    const key = `oauth:${userId}:${provider}`;
    await redisCache.set(key, providerId, 365 * 24 * 60 * 60); // 1 year
  }

  /**
   * Check if user has OAuth provider linked
   */
  private async hasOAuthProvider(userId: string, provider: string): Promise<boolean> {
    const key = `oauth:${userId}:${provider}`;
    const providerId = await redisCache.get(key);
    return !!providerId;
  }

  /**
   * Generate JWT tokens
   */
  private generateTokens(user: User): TokenPair {
    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
    };

    return jwtUtils.generateTokenPair(payload);
  }
}

export const oauthService = new OAuthService();
export default oauthService;
