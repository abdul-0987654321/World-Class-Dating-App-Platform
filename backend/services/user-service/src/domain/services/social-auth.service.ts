import axios from 'axios';
import { OAuth2Client } from 'google-auth-library';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import * as crypto from 'crypto';
import { UserRepository } from '../repositories/user.repository';
import { ProfileRepository } from '../repositories/profile.repository';
import { SocialAccountRepository } from '../repositories/social-account.repository';
import { AuthResponse } from './auth.service';
import jwtUtils from '../../utils/jwt';
import logger from '../../utils/logger';
import { UserResponse } from '../entities/User.entity';

export interface GoogleTokenPayload {
  code?: string;
  id_token?: string;
  access_token?: string;
  state?: string;
  nonce?: string;
}

export interface AppleTokenPayload {
  code: string;
  id_token: string;
  state?: string;
  nonce?: string;
  user?: {
    name?: {
      firstName?: string;
      lastName?: string;
    };
    email?: string;
  };
}

export interface FacebookTokenPayload {
  access_token: string;
  state?: string;
}

export interface SocialLoginResponse extends AuthResponse {
  isNewUser: boolean;
  needsProfileSetup: boolean;
}

export interface AccountLinkRequest {
  userId: string;
  provider: 'google' | 'apple' | 'facebook';
  token: GoogleTokenPayload | AppleTokenPayload | FacebookTokenPayload;
}

export class SocialAuthService {
  private userRepository: UserRepository;
  private profileRepository: ProfileRepository;
  private socialAccountRepository: SocialAccountRepository;
  private googleClient: OAuth2Client;
  private appleJWKS: ReturnType<typeof createRemoteJWKSet>;

  // In-memory state store (in production, use Redis or database)
  private stateStore: Map<string, { timestamp: number; nonce?: string }> = new Map();

  // State expiration time (5 minutes)
  private readonly STATE_EXPIRATION = 5 * 60 * 1000;

  constructor() {
    this.userRepository = new UserRepository();
    this.profileRepository = new ProfileRepository();
    this.socialAccountRepository = new SocialAccountRepository();

    // Initialize Google OAuth2 Client
    this.googleClient = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    // Initialize Apple JWKS
    this.appleJWKS = createRemoteJWKSet(
      new URL('https://appleid.apple.com/auth/keys')
    );

    // Cleanup expired states every minute
    setInterval(() => this.cleanupExpiredStates(), 60 * 1000);
  }

  /**
   * Generate and store state parameter for CSRF protection
   */
  generateState(nonce?: string): string {
    const state = crypto.randomBytes(32).toString('hex');
    this.stateStore.set(state, {
      timestamp: Date.now(),
      nonce
    });
    return state;
  }

  /**
   * Validate state parameter
   */
  private validateState(state: string, expectedNonce?: string): boolean {
    const stateData = this.stateStore.get(state);

    if (!stateData) {
      logger.error('Invalid state: state not found');
      return false;
    }

    // Check if state has expired
    if (Date.now() - stateData.timestamp > this.STATE_EXPIRATION) {
      this.stateStore.delete(state);
      logger.error('Invalid state: state has expired');
      return false;
    }

    // Validate nonce if provided
    if (expectedNonce && stateData.nonce !== expectedNonce) {
      logger.error('Invalid state: nonce mismatch');
      return false;
    }

    // Remove used state (one-time use)
    this.stateStore.delete(state);
    return true;
  }

  /**
   * Cleanup expired states
   */
  private cleanupExpiredStates(): void {
    const now = Date.now();
    for (const [state, data] of this.stateStore.entries()) {
      if (now - data.timestamp > this.STATE_EXPIRATION) {
        this.stateStore.delete(state);
      }
    }
  }

  /**
   * Google OAuth 2.0 Login
   */
  async loginWithGoogle(tokenPayload: GoogleTokenPayload): Promise<SocialLoginResponse> {
    try {
      // Validate state parameter for CSRF protection
      if (tokenPayload.state && !this.validateState(tokenPayload.state, tokenPayload.nonce)) {
        throw new Error('Invalid state parameter - possible CSRF attack');
      }

      // Verify and decode Google token with proper cryptographic verification
      const googleUserInfo = await this.verifyGoogleToken(tokenPayload);

      // Check if social account already exists
      let socialAccount = await this.socialAccountRepository.findByProvider(
        'google',
        googleUserInfo.sub
      );

      let user;
      let isNewUser = false;
      let needsProfileSetup = false;

      if (socialAccount) {
        // Existing social account - get user
        user = await this.userRepository.findById(socialAccount.user_id);

        if (!user) {
          throw new Error('User account not found');
        }

        // Update social account tokens
        await this.socialAccountRepository.updateTokens(
          socialAccount.id,
          tokenPayload.access_token || '',
          undefined,
          googleUserInfo.exp ? new Date(googleUserInfo.exp * 1000) : undefined
        );
      } else {
        // Check if user exists with this email
        user = await this.userRepository.findByEmail(googleUserInfo.email);

        if (user) {
          // Link Google account to existing user
          await this.socialAccountRepository.create({
            user_id: user.id,
            provider: 'google',
            provider_user_id: googleUserInfo.sub,
            provider_email: googleUserInfo.email,
            provider_name: googleUserInfo.name,
            provider_picture: googleUserInfo.picture,
            access_token: tokenPayload.access_token,
            token_expires_at: googleUserInfo.exp ? new Date(googleUserInfo.exp * 1000) : undefined,
            profile_data: googleUserInfo,
            is_primary: false,
          });
        } else {
          // Create new user
          isNewUser = true;
          needsProfileSetup = true;

          const [firstName, ...lastNameParts] = (googleUserInfo.name || '').split(' ');
          const lastName = lastNameParts.join(' ') || firstName;

          user = await this.userRepository.create({
            email: googleUserInfo.email,
            password_hash: await this.generateRandomPassword(),
            first_name: firstName || 'User',
            last_name: lastName || 'User',
            date_of_birth: new Date('2000-01-01'), // Will be updated during profile setup
            gender: 'prefer_not_to_say',
            is_email_verified: googleUserInfo.email_verified || false,
          });

          // Create empty profile
          await this.profileRepository.create({
            user_id: user.id,
          });

          // Create social account
          await this.socialAccountRepository.create({
            user_id: user.id,
            provider: 'google',
            provider_user_id: googleUserInfo.sub,
            provider_email: googleUserInfo.email,
            provider_name: googleUserInfo.name,
            provider_picture: googleUserInfo.picture,
            access_token: tokenPayload.access_token,
            token_expires_at: googleUserInfo.exp ? new Date(googleUserInfo.exp * 1000) : undefined,
            profile_data: googleUserInfo,
            is_primary: true,
          });

          logger.info(`New user created via Google OAuth: ${user.email}`);
        }
      }

      // Update last login
      await this.userRepository.updateLastLogin(user.id);

      // Generate tokens
      const tokens = this.generateTokens(user);

      return {
        user: this.sanitizeUser(user),
        ...tokens,
        isNewUser,
        needsProfileSetup,
      };
    } catch (error: any) {
      logger.error('Google OAuth error:', error);
      throw new Error(error.message || 'Google authentication failed');
    }
  }

  /**
   * Apple Sign In
   */
  async loginWithApple(tokenPayload: AppleTokenPayload): Promise<SocialLoginResponse> {
    try {
      // Validate state parameter for CSRF protection
      if (tokenPayload.state && !this.validateState(tokenPayload.state, tokenPayload.nonce)) {
        throw new Error('Invalid state parameter - possible CSRF attack');
      }

      // Verify and decode Apple token with proper JWT signature verification
      const appleUserInfo = await this.verifyAppleToken(tokenPayload);

      // Check if social account already exists
      let socialAccount = await this.socialAccountRepository.findByProvider(
        'apple',
        appleUserInfo.sub
      );

      let user;
      let isNewUser = false;
      let needsProfileSetup = false;

      if (socialAccount) {
        // Existing social account
        user = await this.userRepository.findById(socialAccount.user_id);

        if (!user) {
          throw new Error('User account not found');
        }
      } else {
        // Check if user exists with this email
        const email = appleUserInfo.email || tokenPayload.user?.email;

        if (!email) {
          throw new Error('Email is required for Apple Sign In');
        }

        user = await this.userRepository.findByEmail(email);

        if (user) {
          // Link Apple account to existing user
          await this.socialAccountRepository.create({
            user_id: user.id,
            provider: 'apple',
            provider_user_id: appleUserInfo.sub,
            provider_email: email,
            provider_name: tokenPayload.user?.name
              ? `${tokenPayload.user.name.firstName} ${tokenPayload.user.name.lastName}`.trim()
              : undefined,
            profile_data: appleUserInfo,
            is_primary: false,
          });
        } else {
          // Create new user
          isNewUser = true;
          needsProfileSetup = true;

          const firstName = tokenPayload.user?.name?.firstName || 'User';
          const lastName = tokenPayload.user?.name?.lastName || 'User';

          user = await this.userRepository.create({
            email,
            password_hash: await this.generateRandomPassword(),
            first_name: firstName,
            last_name: lastName,
            date_of_birth: new Date('2000-01-01'),
            gender: 'prefer_not_to_say',
            is_email_verified: appleUserInfo.email_verified === 'true' || true,
          });

          // Create empty profile
          await this.profileRepository.create({
            user_id: user.id,
          });

          // Create social account
          await this.socialAccountRepository.create({
            user_id: user.id,
            provider: 'apple',
            provider_user_id: appleUserInfo.sub,
            provider_email: email,
            provider_name: `${firstName} ${lastName}`.trim(),
            profile_data: appleUserInfo,
            is_primary: true,
          });

          logger.info(`New user created via Apple Sign In: ${user.email}`);
        }
      }

      // Update last login
      await this.userRepository.updateLastLogin(user.id);

      // Generate tokens
      const tokens = this.generateTokens(user);

      return {
        user: this.sanitizeUser(user),
        ...tokens,
        isNewUser,
        needsProfileSetup,
      };
    } catch (error: any) {
      logger.error('Apple Sign In error:', error);
      throw new Error(error.message || 'Apple authentication failed');
    }
  }

  /**
   * Facebook Login
   */
  async loginWithFacebook(tokenPayload: FacebookTokenPayload): Promise<SocialLoginResponse> {
    try {
      // Validate state parameter for CSRF protection
      if (tokenPayload.state && !this.validateState(tokenPayload.state)) {
        throw new Error('Invalid state parameter - possible CSRF attack');
      }

      // Verify and get Facebook user info with app secret proof
      const facebookUserInfo = await this.verifyFacebookToken(tokenPayload.access_token);

      // Check if social account already exists
      let socialAccount = await this.socialAccountRepository.findByProvider(
        'facebook',
        facebookUserInfo.id
      );

      let user;
      let isNewUser = false;
      let needsProfileSetup = false;

      if (socialAccount) {
        // Existing social account
        user = await this.userRepository.findById(socialAccount.user_id);

        if (!user) {
          throw new Error('User account not found');
        }

        // Update social account tokens
        await this.socialAccountRepository.updateTokens(
          socialAccount.id,
          tokenPayload.access_token
        );
      } else {
        // Check if user exists with this email
        const email = facebookUserInfo.email;

        if (!email) {
          throw new Error('Email is required for Facebook Login');
        }

        user = await this.userRepository.findByEmail(email);

        if (user) {
          // Link Facebook account to existing user
          await this.socialAccountRepository.create({
            user_id: user.id,
            provider: 'facebook',
            provider_user_id: facebookUserInfo.id,
            provider_email: email,
            provider_name: facebookUserInfo.name,
            provider_picture: facebookUserInfo.picture?.data?.url,
            access_token: tokenPayload.access_token,
            profile_data: facebookUserInfo,
            is_primary: false,
          });
        } else {
          // Create new user
          isNewUser = true;
          needsProfileSetup = true;

          const [firstName, ...lastNameParts] = (facebookUserInfo.name || '').split(' ');
          const lastName = lastNameParts.join(' ') || firstName;

          user = await this.userRepository.create({
            email,
            password_hash: await this.generateRandomPassword(),
            first_name: firstName || 'User',
            last_name: lastName || 'User',
            date_of_birth: new Date('2000-01-01'),
            gender: 'prefer_not_to_say',
            is_email_verified: true, // Facebook verifies emails
          });

          // Create empty profile
          await this.profileRepository.create({
            user_id: user.id,
          });

          // Create social account
          await this.socialAccountRepository.create({
            user_id: user.id,
            provider: 'facebook',
            provider_user_id: facebookUserInfo.id,
            provider_email: email,
            provider_name: facebookUserInfo.name,
            provider_picture: facebookUserInfo.picture?.data?.url,
            access_token: tokenPayload.access_token,
            profile_data: facebookUserInfo,
            is_primary: true,
          });

          logger.info(`New user created via Facebook Login: ${user.email}`);
        }
      }

      // Update last login
      await this.userRepository.updateLastLogin(user.id);

      // Generate tokens
      const tokens = this.generateTokens(user);

      return {
        user: this.sanitizeUser(user),
        ...tokens,
        isNewUser,
        needsProfileSetup,
      };
    } catch (error: any) {
      logger.error('Facebook Login error:', error);
      throw new Error(error.message || 'Facebook authentication failed');
    }
  }

  /**
   * Link social account to existing user
   */
  async linkAccount(request: AccountLinkRequest): Promise<void> {
    try {
      const { userId, provider, token } = request;

      // Verify user exists
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Check if already linked
      const existingLink = await this.socialAccountRepository.findByUserAndProvider(userId, provider);
      if (existingLink) {
        throw new Error(`Account already linked to ${provider}`);
      }

      let providerUserId: string;
      let providerEmail: string | undefined;
      let providerName: string | undefined;
      let providerPicture: string | undefined;
      let profileData: any;
      let accessToken: string | undefined;

      // Verify token and get user info based on provider
      switch (provider) {
        case 'google': {
          const googleInfo = await this.verifyGoogleToken(token as GoogleTokenPayload);
          providerUserId = googleInfo.sub;
          providerEmail = googleInfo.email;
          providerName = googleInfo.name;
          providerPicture = googleInfo.picture;
          profileData = googleInfo;
          accessToken = (token as GoogleTokenPayload).access_token;
          break;
        }
        case 'apple': {
          const appleInfo = await this.verifyAppleToken(token as AppleTokenPayload);
          const appleToken = token as AppleTokenPayload;
          providerUserId = appleInfo.sub;
          providerEmail = appleInfo.email || appleToken.user?.email;
          providerName = appleToken.user?.name
            ? `${appleToken.user.name.firstName} ${appleToken.user.name.lastName}`.trim()
            : undefined;
          profileData = appleInfo;
          break;
        }
        case 'facebook': {
          const facebookInfo = await this.verifyFacebookToken((token as FacebookTokenPayload).access_token);
          providerUserId = facebookInfo.id;
          providerEmail = facebookInfo.email;
          providerName = facebookInfo.name;
          providerPicture = facebookInfo.picture?.data?.url;
          profileData = facebookInfo;
          accessToken = (token as FacebookTokenPayload).access_token;
          break;
        }
        default:
          throw new Error('Invalid provider');
      }

      // Check if this social account is already linked to another user
      const existingAccount = await this.socialAccountRepository.findByProvider(provider, providerUserId);
      if (existingAccount && existingAccount.user_id !== userId) {
        throw new Error(`This ${provider} account is already linked to another user`);
      }

      // Create social account link
      await this.socialAccountRepository.create({
        user_id: userId,
        provider,
        provider_user_id: providerUserId,
        provider_email: providerEmail,
        provider_name: providerName,
        provider_picture: providerPicture,
        access_token: accessToken,
        profile_data: profileData,
        is_primary: false,
      });

      logger.info(`Social account linked: ${provider} for user ${userId}`);
    } catch (error: any) {
      logger.error('Account linking error:', error);
      throw new Error(error.message || 'Failed to link account');
    }
  }

  /**
   * Unlink social account from user
   */
  async unlinkAccount(userId: string, provider: string): Promise<void> {
    const socialAccount = await this.socialAccountRepository.findByUserAndProvider(userId, provider);

    if (!socialAccount) {
      throw new Error('Social account not found');
    }

    // Check if this is the only login method
    const allAccounts = await this.socialAccountRepository.findByUserId(userId);
    const user = await this.userRepository.findById(userId);

    // If user has no password and this is the only social account, prevent unlinking
    if (allAccounts.length === 1 && user && !user.password_hash) {
      throw new Error('Cannot unlink the only login method. Please set a password first.');
    }

    await this.socialAccountRepository.delete(socialAccount.id);
    logger.info(`Social account unlinked: ${provider} for user ${userId}`);
  }

  /**
   * Get user's linked social accounts
   */
  async getLinkedAccounts(userId: string): Promise<any[]> {
    const accounts = await this.socialAccountRepository.findByUserId(userId);

    return accounts.map(account => ({
      id: account.id,
      provider: account.provider,
      provider_email: account.provider_email,
      provider_name: account.provider_name,
      is_primary: account.is_primary,
      created_at: account.created_at,
    }));
  }

  /**
   * Refresh social provider tokens
   */
  async refreshSocialToken(userId: string, provider: string): Promise<void> {
    const socialAccount = await this.socialAccountRepository.findByUserAndProvider(userId, provider);

    if (!socialAccount) {
      throw new Error('Social account not found');
    }

    // Refresh token based on provider
    switch (provider) {
      case 'google':
        if (socialAccount.refresh_token) {
          const newTokens = await this.refreshGoogleToken(socialAccount.refresh_token);
          await this.socialAccountRepository.updateTokens(
            socialAccount.id,
            newTokens.access_token,
            newTokens.refresh_token,
            new Date(Date.now() + newTokens.expires_in * 1000)
          );
        }
        break;
      case 'facebook':
        if (socialAccount.access_token) {
          const newToken = await this.refreshFacebookToken(socialAccount.access_token);
          await this.socialAccountRepository.updateTokens(
            socialAccount.id,
            newToken.access_token
          );
        }
        break;
      // Apple tokens don't need refresh in the same way
      default:
        logger.warn(`Token refresh not implemented for provider: ${provider}`);
    }
  }

  /**
   * Private helper methods
   */

  /**
   * Verify Google token using proper JWT verification with Google's public keys
   * SECURITY FIX: Replaced HTTP endpoint with cryptographic verification
   */
  private async verifyGoogleToken(tokenPayload: GoogleTokenPayload): Promise<any> {
    try {
      let idToken = tokenPayload.id_token;

      // If we have an authorization code, exchange it for tokens
      if (tokenPayload.code && !idToken) {
        const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
          code: tokenPayload.code,
          client_id: process.env.GOOGLE_CLIENT_ID,
          client_secret: process.env.GOOGLE_CLIENT_SECRET,
          redirect_uri: process.env.GOOGLE_REDIRECT_URI,
          grant_type: 'authorization_code',
        });

        idToken = tokenResponse.data.id_token;
        tokenPayload.access_token = tokenResponse.data.access_token;
      }

      if (!idToken) {
        throw new Error('ID token is required');
      }

      // SECURITY FIX: Use google-auth-library for proper JWT verification
      // This verifies the JWT signature using Google's public keys
      const ticket = await this.googleClient.verifyIdToken({
        idToken: idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();

      if (!payload) {
        throw new Error('Invalid token payload');
      }

      // Additional security checks
      if (payload.aud !== process.env.GOOGLE_CLIENT_ID) {
        throw new Error('Invalid token audience');
      }

      if (payload.iss !== 'accounts.google.com' && payload.iss !== 'https://accounts.google.com') {
        throw new Error('Invalid token issuer');
      }

      // Check token expiration
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < now) {
        throw new Error('Token has expired');
      }

      // Verify nonce if provided (OpenID Connect)
      if (tokenPayload.nonce && payload.nonce !== tokenPayload.nonce) {
        throw new Error('Invalid nonce - possible replay attack');
      }

      // Return verified user info
      return {
        sub: payload.sub,
        email: payload.email,
        email_verified: payload.email_verified,
        name: payload.name,
        picture: payload.picture,
        given_name: payload.given_name,
        family_name: payload.family_name,
        locale: payload.locale,
        exp: payload.exp,
        iat: payload.iat,
      };
    } catch (error: any) {
      logger.error('Google token verification error:', error);
      if (error.message.includes('expired')) {
        throw new Error('Google token has expired');
      }
      if (error.message.includes('audience')) {
        throw new Error('Invalid Google token audience');
      }
      if (error.message.includes('nonce')) {
        throw new Error('Invalid nonce - possible replay attack');
      }
      throw new Error('Failed to verify Google token: ' + error.message);
    }
  }

  /**
   * Verify Apple token using proper JWT signature verification with Apple's public keys
   * SECURITY FIX: Implemented proper JWT signature verification using JWKS
   */
  private async verifyAppleToken(tokenPayload: AppleTokenPayload): Promise<any> {
    try {
      const idToken = tokenPayload.id_token;

      if (!idToken) {
        throw new Error('Apple ID token is required');
      }

      // SECURITY FIX: Verify JWT signature using Apple's public keys from JWKS endpoint
      // This provides cryptographic verification of the token
      const { payload } = await jwtVerify(idToken, this.appleJWKS, {
        issuer: 'https://appleid.apple.com',
        audience: process.env.APPLE_CLIENT_ID,
      });

      // Additional security checks
      if (!payload.sub) {
        throw new Error('Invalid token: missing subject');
      }

      // Check token expiration (additional check beyond jwtVerify)
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < now) {
        throw new Error('Token has expired');
      }

      // Verify auth_time if present (when user actually authenticated)
      if (payload.auth_time && typeof payload.auth_time === 'number') {
        // Token should not be older than 10 minutes from authentication
        if (now - payload.auth_time > 600) {
          logger.warn('Apple token authentication time is old');
        }
      }

      // Verify nonce if provided (OpenID Connect)
      if (tokenPayload.nonce && payload.nonce !== tokenPayload.nonce) {
        throw new Error('Invalid nonce - possible replay attack');
      }

      // Check if email is private relay
      const email = payload.email as string;
      const isPrivateEmail = payload.is_private_email === true || payload.is_private_email === 'true';

      return {
        sub: payload.sub,
        email: email,
        email_verified: payload.email_verified || 'true',
        is_private_email: isPrivateEmail,
        auth_time: payload.auth_time,
        nonce_supported: payload.nonce_supported,
        exp: payload.exp,
        iat: payload.iat,
      };
    } catch (error: any) {
      logger.error('Apple token verification error:', error);
      if (error.message.includes('expired')) {
        throw new Error('Apple token has expired');
      }
      if (error.message.includes('audience')) {
        throw new Error('Invalid Apple token audience');
      }
      if (error.message.includes('issuer')) {
        throw new Error('Invalid Apple token issuer');
      }
      if (error.message.includes('signature')) {
        throw new Error('Invalid Apple token signature - token may be forged');
      }
      if (error.message.includes('nonce')) {
        throw new Error('Invalid nonce - possible replay attack');
      }
      throw new Error('Failed to verify Apple token: ' + error.message);
    }
  }

  /**
   * Verify Facebook token with proper app secret proof
   * SECURITY FIX: Added app secret proof for secure token verification
   */
  private async verifyFacebookToken(accessToken: string): Promise<any> {
    try {
      if (!accessToken) {
        throw new Error('Facebook access token is required');
      }

      const appSecret = process.env.FACEBOOK_APP_SECRET;
      const appId = process.env.FACEBOOK_APP_ID;

      if (!appSecret || !appId) {
        throw new Error('Facebook app credentials not configured');
      }

      // SECURITY FIX: Generate app secret proof
      // This proves to Facebook that the request is coming from our server
      const appsecretProof = crypto
        .createHmac('sha256', appSecret)
        .update(accessToken)
        .digest('hex');

      // First, verify the access token with Facebook's debug endpoint
      const debugResponse = await axios.get(
        `https://graph.facebook.com/debug_token`,
        {
          params: {
            input_token: accessToken,
            access_token: `${appId}|${appSecret}`,
          },
        }
      );

      const tokenData = debugResponse.data.data;

      // Validate token is valid
      if (!tokenData.is_valid) {
        throw new Error('Invalid Facebook access token');
      }

      // Validate token is for our app
      if (tokenData.app_id !== appId) {
        throw new Error('Token is not for this application');
      }

      // Check token expiration
      if (tokenData.expires_at && tokenData.expires_at > 0) {
        const expirationTime = tokenData.expires_at * 1000; // Convert to milliseconds
        if (Date.now() >= expirationTime) {
          throw new Error('Facebook token has expired');
        }
      }

      // Check token scopes (ensure we have email permission)
      const scopes = tokenData.scopes || [];
      if (!scopes.includes('email')) {
        logger.warn('Facebook token missing email scope');
      }

      // Get user information with app secret proof
      const userResponse = await axios.get(
        `https://graph.facebook.com/me`,
        {
          params: {
            fields: 'id,name,email,picture',
            access_token: accessToken,
            appsecret_proof: appsecretProof,
          },
        }
      );

      const userData = userResponse.data;

      // Validate user ID matches token
      if (userData.id !== tokenData.user_id) {
        throw new Error('User ID mismatch - possible token tampering');
      }

      return {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        picture: userData.picture,
        token_expires_at: tokenData.expires_at,
        scopes: tokenData.scopes,
      };
    } catch (error: any) {
      logger.error('Facebook token verification error:', error);
      if (error.response?.data?.error) {
        const fbError = error.response.data.error;
        if (fbError.code === 190) {
          throw new Error('Facebook token has expired or is invalid');
        }
        throw new Error(`Facebook API error: ${fbError.message}`);
      }
      if (error.message.includes('expired')) {
        throw new Error('Facebook token has expired');
      }
      if (error.message.includes('tampering')) {
        throw new Error('Possible token tampering detected');
      }
      throw new Error('Failed to verify Facebook token: ' + error.message);
    }
  }

  private async refreshGoogleToken(refreshToken: string): Promise<any> {
    try {
      const response = await axios.post('https://oauth2.googleapis.com/token', {
        refresh_token: refreshToken,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        grant_type: 'refresh_token',
      });

      return response.data;
    } catch (error: any) {
      logger.error('Google token refresh error:', error);
      throw new Error('Failed to refresh Google token');
    }
  }

  private async refreshFacebookToken(accessToken: string): Promise<any> {
    try {
      const response = await axios.get(
        `https://graph.facebook.com/oauth/access_token?grant_type=fb_exchange_token&client_id=${process.env.FACEBOOK_APP_ID}&client_secret=${process.env.FACEBOOK_APP_SECRET}&fb_exchange_token=${accessToken}`
      );

      return response.data;
    } catch (error: any) {
      logger.error('Facebook token refresh error:', error);
      throw new Error('Failed to refresh Facebook token');
    }
  }

  private async generateRandomPassword(): Promise<string> {
    const crypto = require('crypto');
    return crypto.randomBytes(32).toString('hex');
  }

  private generateTokens(user: any): { accessToken: string; refreshToken: string } {
    const payload = {
      userId: user.id,
      email: user.email,
    };

    return {
      accessToken: jwtUtils.generateAccessToken(payload),
      refreshToken: jwtUtils.generateRefreshToken(payload),
    };
  }

  private sanitizeUser(user: any): UserResponse {
    const { password_hash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}
