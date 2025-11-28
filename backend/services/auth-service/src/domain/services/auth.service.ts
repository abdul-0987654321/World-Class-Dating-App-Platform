import { userRepository, User, CreateUserDto } from '../repositories/user.repository';
import { tokenRepository } from '../repositories/token.repository';
import { hashPassword, comparePassword } from '../../utils/encryption';
import jwtUtils, { JwtPayload, TokenPair } from '../../utils/jwt';
import { isValidEmail, isValidPassword, isValidAge } from '../../utils/validation';
import emailService from '../../infrastructure/email/email.service';
import redisCache from '../../infrastructure/cache/redis';
import logger from '../../utils/logger';

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
   * Register a new user
   */
  async register(data: RegisterDto): Promise<AuthResponse> {
    // Validate input
    this.validateRegistrationData(data);

    // Check if user already exists
    const existingUser = await userRepository.findByEmail(data.email);
    if (existingUser) {
      throw new Error('User with this email already exists');
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
    this.sendVerificationEmail(user)
      .catch(error => logger.error('Failed to send verification email', error));

    logger.info(`New user registered: ${user.email}`);

    // Generate tokens
    const tokens = this.generateTokens(user);

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  /**
   * Login user
   */
  async login(data: LoginDto): Promise<AuthResponse> {
    // Find user
    const user = await userRepository.findByEmail(data.email);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Check if user is active
    if (!user.is_active) {
      throw new Error('Account is deactivated');
    }

    // Verify password
    const isPasswordValid = await comparePassword(data.password, user.password_hash);
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    // Update last login
    await userRepository.updateLastLogin(user.id);

    logger.info(`User logged in: ${user.email}`);

    // Generate tokens
    const tokens = this.generateTokens(user);

    // Store refresh token in Redis
    await redisCache.setRefreshToken(user.id, tokens.refreshToken, 30 * 24 * 60 * 60); // 30 days

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<TokenPair> {
    try {
      // Verify refresh token
      const payload = jwtUtils.verifyRefreshToken(refreshToken);

      // Find user
      const user = await userRepository.findById(payload.userId);
      if (!user || !user.is_active) {
        throw new Error('Invalid token');
      }

      // Generate new tokens
      const tokens = this.generateTokens(user);

      // Update stored refresh token
      await redisCache.setRefreshToken(user.id, tokens.refreshToken, 30 * 24 * 60 * 60);

      return tokens;
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  }

  /**
   * Logout user
   */
  async logout(userId: string, accessToken: string): Promise<void> {
    // Remove refresh token from Redis
    await redisCache.removeRefreshToken(userId);

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
      emailService.sendWelcomeEmail(user.email, user.first_name)
        .catch(error => logger.error('Failed to send welcome email', error));
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
   * Reset password with token
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

    // Hash new password
    const passwordHash = await hashPassword(newPassword);

    // Update password
    await userRepository.updatePassword(resetToken.user_id, passwordHash);

    // Mark token as used
    await tokenRepository.markAsUsed(resetToken.id);

    // Invalidate all existing sessions by removing refresh tokens
    await redisCache.removeRefreshToken(resetToken.user_id);

    logger.info(`Password reset for user: ${resetToken.user_id}`);
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
}

export const authService = new AuthService();
export default authService;
