import { UserRepository } from '../repositories/user.repository';
import { VerificationTokenRepository } from '../repositories/verification-token.repository';
import jwtUtils from '../../utils/jwt';
import emailService from '../../infrastructure/email/email.service';
import logger from '../../utils/logger';
import verificationBadgeService from './verification-badge.service';

export class VerificationService {
  private userRepository: UserRepository;
  private tokenRepository: VerificationTokenRepository;

  constructor() {
    this.userRepository = new UserRepository();
    this.tokenRepository = new VerificationTokenRepository();
  }

  async sendVerificationEmail(userId: string, email: string, firstName: string): Promise<void> {
    try {
      // Delete any existing verification tokens for this user
      await this.tokenRepository.deleteByUserId(userId, 'email_verification');

      // Generate new verification token
      const token = jwtUtils.generateRandomToken();
      const expiresAt = jwtUtils.calculateTokenExpiry(24); // 24 hours

      // Save token to database
      await this.tokenRepository.create(userId, token, 'email_verification', expiresAt);

      // Send verification email
      await emailService.sendVerificationEmail(email, firstName, token);

      logger.info(`Verification email sent to ${email}`);
    } catch (error) {
      logger.error('Failed to send verification email:', error);
      throw new Error('Failed to send verification email');
    }
  }

  async verifyEmail(token: string): Promise<void> {
    // Find verification token
    const verificationToken = await this.tokenRepository.findByToken(token, 'email_verification');

    if (!verificationToken) {
      throw new Error('Invalid or expired verification token');
    }

    // Verify email in user table
    await this.userRepository.verifyEmail(verificationToken.user_id);

    // Mark token as used
    await this.tokenRepository.markAsUsed(verificationToken.id);

    // Award email verification badge
    await verificationBadgeService.onEmailVerified(verificationToken.user_id);

    // Get user details for welcome email
    const user = await this.userRepository.findById(verificationToken.user_id);
    if (user) {
      // Send welcome email
      await emailService.sendWelcomeEmail(user.email, user.first_name);
    }

    logger.info(`Email verified for user: ${verificationToken.user_id}`);
  }

  async resendVerificationEmail(email: string): Promise<void> {
    // Find user by email
    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      throw new Error('User not found');
    }

    if (user.is_email_verified) {
      throw new Error('Email is already verified');
    }

    // Send verification email
    await this.sendVerificationEmail(user.id, user.email, user.first_name);
  }
}
