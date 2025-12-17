import { db } from '../infrastructure/database';
import { generateAdminToken } from '../middleware/auth';
import { AdminRole } from '../types';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

export class AuthService {
  /**
   * Authenticate admin user with email and password
   */
  async login(email: string, password: string): Promise<{ admin: any; token: string }> {
    const admin = await db('admins')
      .where({ email, is_active: true })
      .first();

    if (!admin) {
      throw new Error('Invalid credentials');
    }

    // Verify password (assuming password is hashed)
    const isValidPassword = await this.verifyPassword(password, admin.password_hash);

    if (!isValidPassword) {
      // Log failed login attempt
      await this.logLoginAttempt(email, false);
      throw new Error('Invalid credentials');
    }

    // Update last login
    await db('admins')
      .where({ id: admin.id })
      .update({
        last_login: db.fn.now(),
        last_activity: db.fn.now(),
      });

    // Log successful login
    await this.logLoginAttempt(email, true, admin.id);

    // Generate JWT token
    const token = generateAdminToken({
      id: admin.id,
      email: admin.email,
      role: admin.role,
    });

    return {
      admin: {
        id: admin.id,
        email: admin.email,
        firstName: admin.first_name,
        lastName: admin.last_name,
        role: admin.role,
        lastLogin: admin.last_login,
      },
      token,
    };
  }

  /**
   * Logout admin (invalidate token)
   */
  async logout(adminId: string): Promise<void> {
    // Update last activity
    await db('admins')
      .where({ id: adminId })
      .update({ last_activity: db.fn.now() });

    logger.info(`Admin logged out: ${adminId}`);
  }

  /**
   * Verify admin password
   */
  private async verifyPassword(password: string, hash: string): Promise<boolean> {
    // In production, use bcrypt or similar
    // For now, using simple comparison (this should be replaced)
    const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
    return passwordHash === hash;
  }

  /**
   * Hash password
   */
  async hashPassword(password: string): Promise<string> {
    // In production, use bcrypt
    // For now, using simple hash (this should be replaced)
    return crypto.createHash('sha256').update(password).digest('hex');
  }

  /**
   * Log login attempt
   */
  private async logLoginAttempt(email: string, success: boolean, adminId?: string): Promise<void> {
    try {
      await db('admin_login_attempts').insert({
        id: uuidv4(),
        admin_id: adminId || null,
        email,
        success,
        created_at: db.fn.now(),
      });
    } catch (error) {
      logger.error('Failed to log login attempt:', error);
    }
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<string> {
    const admin = await db('admins').where({ email }).first();

    if (!admin) {
      // Don't reveal if email exists
      throw new Error('If the email exists, a reset link will be sent');
    }

    const resetToken = this.generateResetToken();
    const resetExpiry = new Date(Date.now() + 3600000); // 1 hour

    await db('admins')
      .where({ id: admin.id })
      .update({
        password_reset_token: resetToken,
        password_reset_expires: resetExpiry,
        updated_at: db.fn.now(),
      });

    logger.info(`Password reset requested for admin: ${email}`);
    return resetToken;
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const admin = await db('admins')
      .where({ password_reset_token: token })
      .where('password_reset_expires', '>', db.fn.now())
      .first();

    if (!admin) {
      throw new Error('Invalid or expired reset token');
    }

    const passwordHash = await this.hashPassword(newPassword);

    await db('admins')
      .where({ id: admin.id })
      .update({
        password_hash: passwordHash,
        password_reset_token: null,
        password_reset_expires: null,
        updated_at: db.fn.now(),
      });

    logger.info(`Password reset completed for admin: ${admin.email}`);
  }

  /**
   * Change password (authenticated)
   */
  async changePassword(adminId: string, currentPassword: string, newPassword: string): Promise<void> {
    const admin = await db('admins').where({ id: adminId }).first();

    if (!admin) {
      throw new Error('Admin not found');
    }

    const isValidPassword = await this.verifyPassword(currentPassword, admin.password_hash);

    if (!isValidPassword) {
      throw new Error('Current password is incorrect');
    }

    const passwordHash = await this.hashPassword(newPassword);

    await db('admins')
      .where({ id: adminId })
      .update({
        password_hash: passwordHash,
        updated_at: db.fn.now(),
      });

    logger.info(`Password changed for admin: ${admin.email}`);
  }

  /**
   * Generate reset token
   */
  private generateResetToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Verify session token
   */
  async verifySession(adminId: string): Promise<boolean> {
    const admin = await db('admins')
      .where({ id: adminId, is_active: true })
      .first();

    return !!admin;
  }
}
