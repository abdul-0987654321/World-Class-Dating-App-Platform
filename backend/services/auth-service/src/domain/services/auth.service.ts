import redisCache from '../../infrastructure/cache/redis';
import emailService from '../../infrastructure/email/email.service';
import { hashPassword, comparePassword } from '../../utils/encryption';
import jwtUtils, { JwtPayload, TokenPair } from '../../utils/jwt';
import logger from '../../utils/logger';
import { isValidEmail, isValidPassword, isValidAge } from '../../utils/validation';
import { tokenRepository } from '../repositories/token.repository';
import { userRepository, User, CreateUserDto } from '../repositories/user.repository';

import accountLockoutService from './account-lockout.service';
import deviceFingerprintService, { DeviceFingerprintData } from './device-fingerprint.service';
import passwordBreachCheckerService from './password-breach-checker.service';
import sessionManagementService from './session-management.service';
import suspiciousLoginDetectorService, { LoginAttempt } from './suspicious-login-detector.service';

export interface RegisterDto {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  phone_number?: string;
}

export interface LoginDto {
  email: string;
  password: string;
  ip?: string;
  userAgent?: string;
  deviceFingerprint?: string;
  deviceData?: Partial<DeviceFingerprintData>;
}

export interface UserResponse {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  date_of_birth: Date;
  gender: string;
  phone_number?: string;
  is_email_verified: boolean;
  is_phone_verified: boolean;
  is_active: boolean;
  created_at: Date;
}

export interface AuthResponse {
  user: UserResponse;
  accessToken: string;
  refreshToken: string;
}

class AuthService {
  /**
   * Register a new user with password breach checking
   */
  async register(data: RegisterDto): Promise<AuthResponse> {
    // Validate input
    this.validateRegistrationData(data);

    // Check if user already exists
    const existingUser = await userRepository.findByEmail(data.email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Check if password has been breached
    const breachCheck = await passwordBreachCheckerService.checkPasswordBreach(data.password);
    if (breachCheck.isBreached) {
      logger.warn('User attempted to register with breached password', {
        email: data.email,
        breachCount: breachCheck.breachCount,
      });
      throw new Error(breachCheck.message);
    }

    // Hash password
    const passwordHash = await hashPassword(data.password);

    // Create user
    const user = await userRepository.create({
      email: data.email,
      password_hash: passwordHash,
      first_name: data.first_name,
      last_name: data.last_name,
      date_of_birth: new Date(data.date_of_birth),
      gender: data.gender,
      phone_number: data.phone_number,
    });

    // Send verification email (async, don't wait)
    this.sendVerificationEmail(user).catch((error) =>
      logger.error('Failed to send verification email', error)
    );

    logger.info(`New user registered: ${user.email}`);

    // Generate tokens
    const tokens = this.generateTokens(user);

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  /**
   * Login user with enhanced security checks
   */
  async login(data: LoginDto): Promise<AuthResponse> {
    const ip = data.ip || 'unknown';
    const userAgent = data.userAgent || 'unknown';

    // Find user
    const user = await userRepository.findByEmail(data.email);
    if (!user) {
      // Record failed attempt even if user doesn't exist (generic tracking)
      logger.warn(`Login attempt for non-existent email: ${data.email} from IP: ${ip}`);
      throw new Error('Invalid credentials');
    }

    // Check if account is permanently locked
    const isPermanentlyLocked = await accountLockoutService.isPermanentlyLocked(user.id);
    if (isPermanentlyLocked) {
      throw new Error('Account has been permanently locked. Please contact support.');
    }

    // Check if account is temporarily locked
    const isLocked = await accountLockoutService.isAccountLocked(user.id);
    if (isLocked) {
      const remainingTime = await accountLockoutService.getRemainingLockoutTime(user.id);
      throw new Error(
        `Account is temporarily locked. Please try again in ${Math.ceil(remainingTime / 60)} minutes.`
      );
    }

    // Check if user is active
    if (!user.is_active) {
      throw new Error('Account is deactivated');
    }

    // Email verification check - configurable via environment variable
    // Set REQUIRE_EMAIL_VERIFICATION=true in production when email service is configured
    const requireEmailVerification = process.env.REQUIRE_EMAIL_VERIFICATION === 'true';
    if (requireEmailVerification && !user.is_email_verified) {
      // Allow resending verification email
      this.sendVerificationEmail(user).catch((error) =>
        logger.warn('Failed to resend verification email', error)
      );

      throw new Error(
        'Email verification required. Please check your inbox for the verification link. A new verification email has been sent.'
      );
    }

    // Verify password
    const isPasswordValid = await comparePassword(data.password, user.password_hash);
    if (!isPasswordValid) {
      // Record failed login attempt
      const lockoutInfo = await accountLockoutService.recordFailedAttempt(user.id, ip);

      // Record failed attempt for suspicious login detection
      const loginAttempt: LoginAttempt = {
        userId: user.id,
        ip,
        userAgent,
        timestamp: new Date(),
        success: false,
        deviceFingerprint: data.deviceFingerprint,
      };
      await suspiciousLoginDetectorService.analyzeLoginAttempt(loginAttempt);

      // Provide feedback about remaining attempts
      const remainingAttempts = 5 - lockoutInfo.failedAttempts;
      if (remainingAttempts > 0) {
        throw new Error(
          `Invalid credentials. ${remainingAttempts} attempts remaining before lockout.`
        );
      } else {
        throw new Error('Invalid credentials. Account has been temporarily locked.');
      }
    }

    // Password is valid - reset failed attempts
    await accountLockoutService.recordSuccessfulLogin(user.id);

    // Generate or get device fingerprint
    let deviceFingerprint = data.deviceFingerprint;
    if (!deviceFingerprint && data.deviceData) {
      deviceFingerprint = deviceFingerprintService.generateFingerprint(
        { headers: { 'user-agent': userAgent }, ip } as any,
        data.deviceData
      );
    }

    // Record device
    let isNewDevice = false;
    if (deviceFingerprint) {
      const isRecognized = await deviceFingerprintService.isDeviceRecognized(
        user.id,
        deviceFingerprint
      );
      isNewDevice = !isRecognized;

      await deviceFingerprintService.recordDevice(user.id, deviceFingerprint, {
        userAgent,
        ip,
        acceptLanguage: data.deviceData?.acceptLanguage || 'en',
        timezone: data.deviceData?.timezone,
        screenResolution: data.deviceData?.screenResolution,
        platform: data.deviceData?.platform,
      });
    }

    // Analyze login for suspicious activity
    const loginAttempt: LoginAttempt = {
      userId: user.id,
      ip,
      userAgent,
      timestamp: new Date(),
      success: true,
      deviceFingerprint,
    };
    const suspicionIndicators =
      await suspiciousLoginDetectorService.analyzeLoginAttempt(loginAttempt);

    // Send notification for new device or suspicious login
    if (isNewDevice || suspicionIndicators.score >= 50) {
      this.sendLoginNotification(user, {
        ip,
        userAgent,
        deviceFingerprint: deviceFingerprint || 'unknown',
        isNewDevice,
        suspicionScore: suspicionIndicators.score,
        timestamp: new Date(),
      }).catch((error) => logger.error('Failed to send login notification', error));
    }

    // Create session with device tracking
    const session = await sessionManagementService.createSession({
      userId: user.id,
      deviceFingerprint,
      ip,
      userAgent,
    });

    // Update last login
    await userRepository.updateLastLogin(user.id);

    logger.info(`User logged in: ${user.email} from IP: ${ip}`, {
      sessionId: session.id,
      isNewDevice,
      suspicionScore: suspicionIndicators.score,
    });

    // Generate tokens
    const tokens = this.generateTokens(user);

    // Decode token to get jti for rotation tracking
    const decoded = jwtUtils.decodeToken(tokens.refreshToken);

    // Store refresh token in Redis with token ID for rotation detection
    await redisCache.setRefreshToken(
      user.id,
      tokens.refreshToken,
      7 * 24 * 60 * 60, // 7 days (reduced from 30)
      decoded?.jti
    );

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  /**
   * Refresh access token with rotation and reuse detection
   */
  async refreshToken(refreshToken: string): Promise<TokenPair> {
    try {
      // Verify refresh token
      const payload = jwtUtils.verifyRefreshToken(refreshToken);

      // Check for token reuse (potential security breach)
      if (payload.jti) {
        const isReused = await redisCache.isRefreshTokenReused(payload.jti);
        if (isReused) {
          // Token reuse detected - invalidate all tokens for this user
          await redisCache.invalidateAllUserTokens(payload.userId);
          logger.error(
            `Refresh token reuse detected for user ${payload.userId}. All tokens invalidated.`
          );
          throw new Error('Token reuse detected. All sessions have been invalidated for security.');
        }
      }

      // Verify the token matches the stored token for this user
      const storedToken = await redisCache.getRefreshToken(payload.userId);
      if (storedToken !== refreshToken) {
        // Token doesn't match - possible token theft
        await redisCache.invalidateAllUserTokens(payload.userId);
        logger.error(`Refresh token mismatch for user ${payload.userId}. Possible token theft.`);
        throw new Error('Invalid refresh token. All sessions have been invalidated for security.');
      }

      // Find user
      const user = await userRepository.findById(payload.userId);
      if (!user || !user.is_active) {
        throw new Error('Invalid token');
      }

      // Remove old refresh token from family
      if (payload.jti) {
        await redisCache.removeRefreshToken(payload.userId, payload.jti);
      }

      // Generate new tokens (rotation)
      const tokens = this.generateTokens(user);

      // Decode new token to get jti
      const decoded = jwtUtils.decodeToken(tokens.refreshToken);

      // Store new refresh token with token ID for rotation detection
      await redisCache.setRefreshToken(
        user.id,
        tokens.refreshToken,
        7 * 24 * 60 * 60, // 7 days
        decoded?.jti
      );

      logger.info(`Refresh token rotated for user ${user.id}`);

      return tokens;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Invalid or expired refresh token');
    }
  }

  /**
   * Logout user with token blacklisting
   */
  async logout(userId: string, accessToken: string, refreshToken?: string): Promise<void> {
    // Decode refresh token to get jti if provided
    let tokenId: string | undefined;
    if (refreshToken) {
      try {
        const decoded = jwtUtils.decodeToken(refreshToken);
        tokenId = decoded?.jti;
      } catch (error) {
        // Token might be invalid, but continue with logout
      }
    }

    // Remove refresh token from Redis with token ID
    await redisCache.removeRefreshToken(userId, tokenId);

    // Blacklist current access token
    // Calculate remaining time until token expiry
    try {
      const decoded = jwtUtils.decodeToken(accessToken);
      if (decoded?.exp) {
        const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);
        if (expiresIn > 0) {
          await redisCache.blacklistToken(accessToken, expiresIn);
        }
      }
    } catch (error) {
      // Token might be invalid, but that's ok for logout
    }

    logger.info(`User logged out: ${userId}`);
  }

  /**
   * Verify email with token
   */
  async verifyEmail(token: string): Promise<void> {
    const verificationToken = await tokenRepository.findByToken(token, 'email_verification');

    if (!verificationToken) {
      throw new Error('Invalid or expired verification token');
    }

    // Mark email as verified
    await userRepository.verifyEmail(verificationToken.user_id);

    // Mark token as used
    await tokenRepository.markAsUsed(verificationToken.id);

    // Send welcome email
    const user = await userRepository.findById(verificationToken.user_id);
    if (user) {
      emailService
        .sendWelcomeEmail(user.email, user.first_name)
        .catch((error) => logger.error('Failed to send welcome email', error));
    }

    logger.info(`Email verified for user: ${verificationToken.user_id}`);
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<void> {
    const user = await userRepository.findByEmail(email);

    if (!user) {
      // Don't reveal if user exists (security)
      logger.warn(`Password reset requested for non-existent email: ${email}`);
      return;
    }

    // Delete existing password reset tokens
    await tokenRepository.deleteByUserId(user.id, 'password_reset');

    // Generate new token
    const token = jwtUtils.generateRandomToken();
    const expiresAt = jwtUtils.calculateTokenExpiry(1); // 1 hour

    // Save token
    await tokenRepository.create(user.id, token, 'password_reset', expiresAt);

    // Send password reset email
    await emailService.sendPasswordResetEmail(user.email, user.first_name, token);

    logger.info(`Password reset email sent to: ${email}`);
  }

  /**
   * Reset password with token and breach checking
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const resetToken = await tokenRepository.findByToken(token, 'password_reset');

    if (!resetToken) {
      throw new Error('Invalid or expired password reset token');
    }

    // Validate new password
    if (!isValidPassword(newPassword)) {
      throw new Error(
        'Password must be at least 8 characters and contain uppercase, lowercase, number, and special character'
      );
    }

    // Check if password has been breached
    const breachCheck = await passwordBreachCheckerService.checkPasswordBreach(newPassword);
    if (breachCheck.isBreached) {
      logger.warn('User attempted to reset password with breached password', {
        userId: resetToken.user_id,
        breachCount: breachCheck.breachCount,
      });
      throw new Error(breachCheck.message);
    }

    // Hash new password
    const passwordHash = await hashPassword(newPassword);

    // Update password
    await userRepository.updatePassword(resetToken.user_id, passwordHash);

    // Mark token as used
    await tokenRepository.markAsUsed(resetToken.id);

    // Invalidate all existing sessions and tokens (security measure on password change)
    await redisCache.invalidateAllUserTokens(resetToken.user_id);

    // Revoke all active sessions
    await sessionManagementService.revokeAllUserSessions(resetToken.user_id);

    logger.info(
      `Password reset for user: ${resetToken.user_id}. All tokens and sessions invalidated.`
    );
  }

  /**
   * Resend verification email
   */
  async resendVerificationEmail(email: string): Promise<void> {
    const user = await userRepository.findByEmail(email);

    if (!user) {
      throw new Error('User not found');
    }

    if (user.is_email_verified) {
      throw new Error('Email already verified');
    }

    await this.sendVerificationEmail(user);

    logger.info(`Verification email resent to: ${email}`);
  }

  /**
   * Validate access token and return user info
   */
  async validateToken(token: string): Promise<UserResponse | null> {
    try {
      // Check if token is blacklisted
      const isBlacklisted = await redisCache.isTokenBlacklisted(token);
      if (isBlacklisted) {
        return null;
      }

      // Verify token
      const payload = jwtUtils.verifyAccessToken(token);

      // Find user
      const user = await userRepository.findById(payload.userId);
      if (!user || !user.is_active) {
        return null;
      }

      return this.sanitizeUser(user);
    } catch (error) {
      return null;
    }
  }

  /**
   * Get user by ID (for internal service calls)
   */
  async getUserById(userId: string): Promise<UserResponse | null> {
    const user = await userRepository.findById(userId);
    return user ? this.sanitizeUser(user) : null;
  }

  // Private methods

  private validateRegistrationData(data: RegisterDto): void {
    if (!isValidEmail(data.email)) {
      throw new Error('Invalid email format');
    }

    if (!isValidPassword(data.password)) {
      throw new Error(
        'Password must be at least 8 characters and contain uppercase, lowercase, number, and special character'
      );
    }

    if (!isValidAge(data.date_of_birth)) {
      throw new Error('User must be at least 18 years old');
    }

    if (!data.first_name || data.first_name.length < 2) {
      throw new Error('First name must be at least 2 characters');
    }

    if (!data.last_name || data.last_name.length < 2) {
      throw new Error('Last name must be at least 2 characters');
    }

    const validGenders = ['male', 'female', 'non-binary', 'other'];
    if (!validGenders.includes(data.gender)) {
      throw new Error('Invalid gender');
    }
  }

  private generateTokens(user: User): TokenPair {
    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      subscriptionTier: user.subscription_tier || 'free',
      subscriptionStatus: user.subscription_status || 'inactive',
      roles: user.roles || ['USER'],
    };

    return jwtUtils.generateTokenPair(payload);
  }

  private sanitizeUser(user: User): UserResponse {
    return {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      date_of_birth: user.date_of_birth,
      gender: user.gender,
      phone_number: user.phone_number,
      is_email_verified: user.is_email_verified,
      is_phone_verified: user.is_phone_verified,
      is_active: user.is_active,
      created_at: user.created_at,
    };
  }

  private async sendVerificationEmail(user: User): Promise<void> {
    // Delete existing verification tokens
    await tokenRepository.deleteByUserId(user.id, 'email_verification');

    // Generate new token
    const token = jwtUtils.generateRandomToken();
    const expiresAt = jwtUtils.calculateTokenExpiry(24); // 24 hours

    // Save token
    await tokenRepository.create(user.id, token, 'email_verification', expiresAt);

    // Send email
    await emailService.sendVerificationEmail(user.email, user.first_name, token);
  }

  private async sendLoginNotification(
    user: User,
    loginInfo: {
      ip: string;
      userAgent: string;
      deviceFingerprint: string;
      isNewDevice: boolean;
      suspicionScore: number;
      timestamp: Date;
    }
  ): Promise<void> {
    try {
      logger.info('Sending login notification', {
        userId: user.id,
        email: user.email,
        isNewDevice: loginInfo.isNewDevice,
        suspicionScore: loginInfo.suspicionScore,
      });

      // In production, send actual email notification
      // await emailService.sendLoginNotification(
      //   user.email,
      //   user.first_name,
      //   loginInfo
      // );
    } catch (error) {
      logger.error('Failed to send login notification', error);
    }
  }
}

export const authService = new AuthService();
export default authService;
