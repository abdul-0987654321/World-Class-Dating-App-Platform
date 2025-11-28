import { UserRepository } from '../repositories/user.repository';
import { VerificationTokenRepository } from '../repositories/verification-token.repository';
import { hashPassword } from '../../utils/encryption';
import jwtUtils from '../../utils/jwt';
import emailService from '../../infrastructure/email/email.service';
import logger from '../../utils/logger';
import { isValidPassword } from '@flamoral/shared/utils/validation';

export class PasswordResetService {
  private userRepository: UserRepository;
  private tokenRepository: VerificationTokenRepository;

  constructor() {
    this.userRepository = new UserRepository();
    this.tokenRepository = new VerificationTokenRepository();
  }

  async requestPasswordReset(email: string): Promise<void> {
    // Find user
    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      // Don't reveal if user exists or not (security best practice)
      logger.warn(`Password reset requested for non-existent email: ${email}`);
      return;
    }

    try {
      // Delete any existing reset tokens for this user
      await this.tokenRepository.deleteByUserId(user.id, 'password_reset');

      // Generate reset token
      const token = jwtUtils.generateRandomToken();
      const expiresAt = jwtUtils.calculateTokenExpiry(1); // 1 hour

      // Save token to database
      await this.tokenRepository.create(user.id, token, 'password_reset', expiresAt);

      // Send reset email
      await emailService.sendPasswordResetEmail(user.email, user.first_name, token);

      logger.info(`Password reset email sent to ${email}`);
    } catch (error) {
      logger.error('Failed to send password reset email:', error);
      throw new Error('Failed to send password reset email');
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    // Validate new password
    if (!isValidPassword(newPassword)) {
      throw new Error(
        'Password must be at least 8 characters long and contain uppercase, lowercase, number, and special character'
      );
    }

    // Find reset token
    const resetToken = await this.tokenRepository.findByToken(token, 'password_reset');

    if (!resetToken) {
      throw new Error('Invalid or expired reset token');
    }

    // Hash new password
    const password_hash = await hashPassword(newPassword);

    // Update user password
    await this.userRepository.updatePassword(resetToken.user_id, password_hash);

    // Mark token as used
    await this.tokenRepository.markAsUsed(resetToken.id);

    logger.info(`Password reset successful for user: ${resetToken.user_id}`);
  }

  async verifyResetToken(token: string): Promise<boolean> {
    const resetToken = await this.tokenRepository.findByToken(token, 'password_reset');
    return resetToken !== null;
  }
}
