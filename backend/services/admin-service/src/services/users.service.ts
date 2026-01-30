import axios from 'axios';

import { db } from '../infrastructure/database';
import { logger } from '../utils/logger';

export class UsersService {
  async searchUsers(filters: {
    search?: string;
    filter?: 'all' | 'verified' | 'premium' | 'banned' | 'reported';
    page?: number;
    limit?: number;
  }) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    let query = db('users')
      .select('users.*', db.raw('COUNT(DISTINCT reports.id) as report_count'))
      .leftJoin('reports', 'users.id', 'reports.reported_user_id')
      .groupBy('users.id');

    // Search filter
    if (filters.search) {
      query = query.where(function () {
        this.where('email', 'ilike', `%${filters.search}%`)
          .orWhere('first_name', 'ilike', `%${filters.search}%`)
          .orWhere('last_name', 'ilike', `%${filters.search}%`)
          .orWhere('id', 'ilike', `%${filters.search}%`);
      });
    }

    // Status filters
    switch (filters.filter) {
      case 'verified':
        query = query.where('is_verified', true);
        break;
      case 'premium':
        query = query.whereIn('subscription_tier', ['GOLD', 'PLATINUM', 'DIAMOND']);
        break;
      case 'banned':
        query = query.where('is_banned', true);
        break;
      case 'reported':
        query = query.having(db.raw('COUNT(DISTINCT reports.id) > 0'));
        break;
    }

    // Get total count
    const countQuery = query.clone().clearSelect().clearOrder().count('* as count');
    const [{ count }] = await countQuery;
    const total = parseInt(count as string, 10);

    // Get paginated results
    const users = await query.orderBy('created_at', 'desc').limit(limit).offset(offset);

    return {
      users: users.map((user) => ({
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        profilePhoto: user.profile_photo,
        subscription: user.subscription_tier,
        isVerified: user.is_verified,
        isActive: user.is_active,
        isBanned: user.is_banned,
        createdAt: user.created_at,
        lastActive: user.last_active,
        reportCount: parseInt(user.report_count, 10),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getUserDetails(userId: string) {
    const user = await db('users').where({ id: userId }).first();

    if (!user) {
      throw new Error('User not found');
    }

    const [matches, reports, subscriptionHistory, loginHistory] = await Promise.all([
      db('matches')
        .where('user1_id', userId)
        .orWhere('user2_id', userId)
        .count('* as count')
        .first(),
      db('reports').where('reported_user_id', userId).orderBy('created_at', 'desc').limit(10),
      db('subscription_history').where('user_id', userId).orderBy('created_at', 'desc').limit(10),
      db('login_history').where('user_id', userId).orderBy('created_at', 'desc').limit(20),
    ]);

    // SECURITY: Strip sensitive fields before returning user data
    const { password_hash, password_reset_token, password_reset_expires, totp_secret, ...safeUser } = user;
    return {
      ...safeUser,
      matchCount: parseInt(matches?.count as string, 10) || 0,
      reports,
      subscriptionHistory,
      loginHistory,
    };
  }

  async banUser(userId: string, reason: string, duration?: number) {
    const banUntil = duration ? new Date(Date.now() + duration * 1000) : null;

    await db('users').where({ id: userId }).update({
      is_banned: true,
      ban_reason: reason,
      banned_at: db.fn.now(),
      ban_until: banUntil,
      updated_at: db.fn.now(),
    });

    await db('user_actions').insert({
      user_id: userId,
      action: 'banned',
      reason,
      created_at: db.fn.now(),
    });

    logger.info(`User banned: ${userId}`, { reason, duration });
  }

  async unbanUser(userId: string) {
    await db('users').where({ id: userId }).update({
      is_banned: false,
      ban_reason: null,
      banned_at: null,
      ban_until: null,
      updated_at: db.fn.now(),
    });

    await db('user_actions').insert({
      user_id: userId,
      action: 'unbanned',
      created_at: db.fn.now(),
    });

    logger.info(`User unbanned: ${userId}`);
  }

  async verifyUser(userId: string) {
    await db('users').where({ id: userId }).update({
      is_verified: true,
      verified_at: db.fn.now(),
      updated_at: db.fn.now(),
    });

    logger.info(`User verified: ${userId}`);
  }

  async deleteUser(userId: string, reason: string) {
    // Soft delete
    await db('users').where({ id: userId }).update({
      is_active: false,
      deleted_at: db.fn.now(),
      deletion_reason: reason,
      updated_at: db.fn.now(),
    });

    // Schedule data anonymization
    await db('deletion_queue').insert({
      user_id: userId,
      scheduled_for: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      created_at: db.fn.now(),
    });

    logger.info(`User deleted: ${userId}`, { reason });
  }

  async updateUser(userId: string, updates: any) {
    await db('users')
      .where({ id: userId })
      .update({
        ...updates,
        updated_at: db.fn.now(),
      });

    logger.info(`User updated: ${userId}`, { updates });
  }

  async resetPassword(userId: string) {
    // Generate password reset token
    const resetToken = this.generateResetToken();
    const resetExpiry = new Date(Date.now() + 3600000); // 1 hour

    await db('users').where({ id: userId }).update({
      password_reset_token: resetToken,
      password_reset_expires: resetExpiry,
      updated_at: db.fn.now(),
    });

    // Send password reset email (integrate with notification service)
    // await this.sendPasswordResetEmail(userId, resetToken);

    logger.info(`Password reset initiated: ${userId}`);
    return resetToken;
  }

  private generateResetToken(): string {
    // SECURITY: Use cryptographically secure random bytes instead of Math.random()
    const crypto = require('crypto');
    return crypto.randomBytes(32).toString('hex');
  }
}
