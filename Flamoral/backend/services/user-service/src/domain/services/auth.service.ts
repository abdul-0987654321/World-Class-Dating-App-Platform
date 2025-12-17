import { UserRepository } from '../repositories/user.repository';
import { ProfileRepository } from '../repositories/profile.repository';
import { VerificationTokenRepository } from '../repositories/verification-token.repository';
import { VerificationService } from './verification.service';
import { CreateUserDto, UserResponse } from '../entities/User.entity';
import { hashPassword, comparePassword } from '../../utils/encryption';
import jwtUtils from '../../utils/jwt';
import emailService from '../../infrastructure/email/email.service';
import logger from '../../utils/logger';
import { isValidEmail, isValidPassword, isValidAge } from '../../utils/validation';

export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: UserResponse;
  accessToken: string;
  refreshToken: string;
}

export class AuthService {
  private userRepository: UserRepository;
  private profileRepository: ProfileRepository;
  private tokenRepository: VerificationTokenRepository;
  private verificationService: VerificationService;

  constructor() {
    this.userRepository = new UserRepository();
    this.profileRepository = new ProfileRepository();
    this.tokenRepository = new VerificationTokenRepository();
    this.verificationService = new VerificationService();
  }

  async register(userData: CreateUserDto): Promise<AuthResponse> {
    // Validate input
    this.validateRegistrationData(userData);

    // Check if user already exists
    const existingUser = await this.userRepository.findByEmail(userData.email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Hash password
    const password_hash = await hashPassword(userData.password);

    // Create user
    const user = await this.userRepository.create({
      ...userData,
      password_hash,
    });

    // Create empty profile
    await this.profileRepository.create({
      user_id: user.id,
    });

    // Send verification email (async, don't wait)
    this.verificationService
      .sendVerificationEmail(user.id, user.email, user.first_name)
      .catch((error) => logger.error('Failed to send verification email:', error));

    logger.info(`New user registered: ${user.email}`);

    // Generate tokens
    const tokens = this.generateTokens(user);

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  async login(loginData: LoginDto): Promise<AuthResponse> {
    // Find user
    const user = await this.userRepository.findByEmail(loginData.email);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Check if user is active
    if (!user.is_active) {
      throw new Error('Account is deactivated');
    }

    // Verify password
    const isPasswordValid = await comparePassword(loginData.password, user.password_hash);
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    // Update last login
    await this.userRepository.updateLastLogin(user.id);

    logger.info(`User logged in: ${user.email}`);

    // Generate tokens with rotation support
    const tokens = this.generateTokens(user);

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      // Verify refresh token with enhanced validation
      const payload = jwtUtils.verifyRefreshToken(refreshToken);

      // Find user
      const user = await this.userRepository.findById(payload.userId);
      if (!user || !user.is_active) {
        throw new Error('Invalid token');
      }

      // Generate new tokens (implements rotation)
      const tokens = this.generateTokens(user);

      logger.info(`Refresh token rotated for user ${user.id}`);

      return tokens;
    } catch (error) {
      if (error instanceof Error) {
        // Re-throw specific error messages from JWT verification
        throw error;
      }
      throw new Error('Invalid or expired refresh token');
    }
  }

  async logout(userId: string): Promise<void> {
    // Note: Token blacklisting should be implemented with Redis in production
    // For now, rely on short-lived access tokens (15 minutes)
    logger.info(`User logged out: ${userId}`);
  }

  async verifyEmail(userId: string): Promise<void> {
    await this.userRepository.verifyEmail(userId);
    logger.info(`Email verified for user: ${userId}`);
  }

  async requestPasswordReset(email: string): Promise<void> {
    // Find user by email
    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      // Don't reveal if user exists (security best practice)
      logger.warn(`Password reset requested for non-existent email: ${email}`);
      return;
    }

    // Delete any existing password reset tokens for this user
    await this.tokenRepository.deleteByUserId(user.id, 'password_reset');

    // Generate new reset token
    const token = jwtUtils.generateRandomToken();
    const expiresAt = jwtUtils.calculateTokenExpiry(1); // 1 hour

    // Save token to database
    await this.tokenRepository.create(user.id, token, 'password_reset', expiresAt);

    // Send password reset email
    try {
      await emailService.sendPasswordResetEmail(user.email, user.first_name, token);
      logger.info(`Password reset email sent to ${user.email}`);
    } catch (error) {
      logger.error('Failed to send password reset email:', error);
      throw new Error('Failed to send password reset email');
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    // Find password reset token
    const resetToken = await this.tokenRepository.findByToken(token, 'password_reset');

    if (!resetToken) {
      throw new Error('Invalid or expired password reset token');
    }

    // Validate new password
    if (!isValidPassword(newPassword)) {
      throw new Error(
        'Password must be at least 8 characters long and contain uppercase, lowercase, number, and special character'
      );
    }

    // Hash new password
    const password_hash = await hashPassword(newPassword);

    // Update user password
    await this.userRepository.updatePassword(resetToken.user_id, password_hash);

    // Mark token as used
    await this.tokenRepository.markAsUsed(resetToken.id);

    // Note: In production, invalidate all refresh tokens and sessions
    // This would require Redis or database-based token tracking

    logger.info(`Password reset successfully for user: ${resetToken.user_id}. All sessions should be invalidated.`);
  }

  private validateRegistrationData(userData: CreateUserDto): void {
    if (!isValidEmail(userData.email)) {
      throw new Error('Invalid email format');
    }

    if (!isValidPassword(userData.password)) {
      throw new Error(
        'Password must be at least 8 characters long and contain uppercase, lowercase, number, and special character'
      );
    }

    if (!isValidAge(userData.date_of_birth)) {
      throw new Error('User must be at least 18 years old');
    }

    if (!userData.first_name || userData.first_name.length < 2) {
      throw new Error('First name must be at least 2 characters long');
    }

    if (!userData.last_name || userData.last_name.length < 2) {
      throw new Error('Last name must be at least 2 characters long');
    }
  }

  private generateTokens(user: any): { accessToken: string; refreshToken: string } {
    const payload = {
      id: user.id,
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
