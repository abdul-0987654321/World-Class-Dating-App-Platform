import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { UserRepository, ProfileRepository } from '../../repositories';
import { UserCreateInput } from '../../models/User.model';
import { sendEmailService } from '../integrations/sendgrid/sendgrid.service';
import { sendSmsService } from '../integrations/twilio/twilio.service';
import crypto from 'crypto';

interface LoginResult {
  user: {
    id: string;
    email: string;
    firstName: string;
    role: string;
    subscription: string;
  };
  accessToken: string;
  refreshToken: string;
}

export class AuthService {
  private userRepo: UserRepository;
  private profileRepo: ProfileRepository;
  private jwtSecret: string;
  private jwtRefreshSecret: string;

  constructor(userRepo: UserRepository, profileRepo: ProfileRepository) {
    this.userRepo = userRepo;
    this.profileRepo = profileRepo;
    this.jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
    this.jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-change-in-production';
  }

  async register(input: UserCreateInput): Promise<LoginResult> {
    // Check if user already exists
    const existingUser = await this.userRepo.findByEmail(input.email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    if (input.phone) {
      const existingPhone = await this.userRepo.findByPhone(input.phone);
      if (existingPhone) {
        throw new Error('User with this phone number already exists');
      }
    }

    // Validate age (must be 18+)
    const birthDate = new Date(input.dateOfBirth);
    const age = this.calculateAge(birthDate);
    if (age < 18) {
      throw new Error('You must be at least 18 years old to register');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(input.password, 12);

    // Create user
    const user = await this.userRepo.create(input, passwordHash);

    // Create profile
    await this.profileRepo.create({
      userId: user.id,
    });

    // Send verification email
    await this.sendVerificationEmail(user.email, user.id);

    // Generate tokens
    const { accessToken, refreshToken } = this.generateTokens(user.id, user.email, user.role);

    // Update last login
    await this.userRepo.updateLastLogin(user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        role: user.role,
        subscription: user.subscription_tier,
      },
      accessToken,
      refreshToken,
    };
  }

  async login(email: string, password: string): Promise<LoginResult> {
    // Find user
    const user = await this.userRepo.findByEmail(email);
    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Check if user is banned
    if (user.is_banned) {
      throw new Error('Your account has been banned');
    }

    // Check if user is deleted
    if (user.deleted_at) {
      throw new Error('Account not found');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    // Generate tokens
    const { accessToken, refreshToken } = this.generateTokens(user.id, user.email, user.role);

    // Update last login
    await this.userRepo.updateLastLogin(user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        role: user.role,
        subscription: user.subscription_tier,
      },
      accessToken,
      refreshToken,
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string }> {
    try {
      const decoded = jwt.verify(refreshToken, this.jwtRefreshSecret) as any;

      const user = await this.userRepo.findById(decoded.userId);
      if (!user || user.is_banned || user.deleted_at) {
        throw new Error('Invalid token');
      }

      const accessToken = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          role: user.role,
        },
        this.jwtSecret,
        { expiresIn: '15m' }
      );

      return { accessToken };
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.userRepo.findByEmail(email);
    if (!user) {
      // Don't reveal if user exists
      return;
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Store reset token (you'd need a password_reset_tokens table for production)
    // For now, we'll send the email
    await sendEmailService.sendPasswordResetEmail(user.email, resetToken);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    // In production, verify token from database
    // For now, simplified version
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Find user by token (you'd need to implement this properly with token storage)
    // This is simplified
    throw new Error('Password reset not fully implemented - need token storage table');
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    // Update password
    await this.userRepo.updatePassword(userId, newPasswordHash);
  }

  async verifyEmail(userId: string, token: string): Promise<void> {
    // In production, verify token from database
    // For now, simplified version
    await this.userRepo.verifyEmail(userId);
  }

  async sendVerificationEmail(email: string, userId: string): Promise<void> {
    // Generate verification token
    const token = crypto.randomBytes(32).toString('hex');

    // In production, store token in database

    // Send email
    const verificationLink = `${process.env.WEB_URL}/verify-email?token=${token}&userId=${userId}`;
    await sendEmailService.sendEmail(
      email,
      'Verify your email',
      `Click here to verify your email: ${verificationLink}`
    );
  }

  async requestPhoneVerification(userId: string, phone: string): Promise<void> {
    // Generate verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // In production, store code in database with expiration

    // Send SMS
    await sendSmsService.sendVerificationCode(phone, code);
  }

  async verifyPhone(userId: string, phone: string, code: string): Promise<void> {
    // In production, verify code from database
    // For now, simplified
    await this.userRepo.verifyPhone(userId);
  }

  private generateTokens(userId: string, email: string, role: string): {
    accessToken: string;
    refreshToken: string;
  } {
    const accessToken = jwt.sign(
      {
        userId,
        email,
        role,
      },
      this.jwtSecret,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      {
        userId,
        email,
      },
      this.jwtRefreshSecret,
      { expiresIn: '7d' }
    );

    return { accessToken, refreshToken };
  }

  private calculateAge(birthDate: Date): number {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  }

  verifyToken(token: string): any {
    try {
      return jwt.verify(token, this.jwtSecret);
    } catch (error) {
      throw new Error('Invalid token');
    }
  }
}
