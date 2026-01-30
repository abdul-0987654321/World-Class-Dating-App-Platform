import axios from 'axios';

import { db } from '../infrastructure/database';
import { DashboardStats } from '../types';

export class DashboardService {
  async getDashboardStats(
    timeRange: 'today' | 'week' | 'month' = 'today'
  ): Promise<DashboardStats> {
    const startDate = this.getStartDate(timeRange);

    const [
      totalUsers,
      activeUsers,
      newUsersToday,
      premiumUsers,
      totalMatches,
      matchesToday,
      totalMessages,
      messagesToday,
      pendingVerifications,
      pendingReports,
      revenue,
    ] = await Promise.all([
      this.getTotalUsers(),
      this.getActiveUsers(startDate),
      this.getNewUsersToday(),
      this.getPremiumUsers(),
      this.getTotalMatches(),
      this.getMatchesToday(),
      this.getTotalMessages(),
      this.getMessagesToday(),
      this.getPendingVerifications(),
      this.getPendingReports(),
      this.getRevenue(),
    ]);

    return {
      totalUsers,
      activeUsers,
      newUsersToday,
      premiumUsers,
      totalMatches,
      matchesToday,
      totalMessages,
      messagesToday,
      pendingVerifications,
      pendingReports,
      revenue,
    };
  }

  async getRecentActivity(limit: number = 20) {
    const activities = await db('activity_logs')
      .select('*')
      .orderBy('created_at', 'desc')
      .limit(limit);

    return activities.map((activity) => ({
      id: activity.id,
      type: activity.type,
      description: activity.description,
      timestamp: activity.created_at,
      userId: activity.user_id,
    }));
  }

  private async getTotalUsers(): Promise<number> {
    const result = await db('users').count('* as count').first();
    return parseInt(result?.count as string, 10) || 0;
  }

  private async getActiveUsers(since: Date): Promise<number> {
    const result = await db('users').where('last_active', '>=', since).count('* as count').first();
    return parseInt(result?.count as string, 10) || 0;
  }

  private async getNewUsersToday(): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result = await db('users').where('created_at', '>=', today).count('* as count').first();
    return parseInt(result?.count as string, 10) || 0;
  }

  private async getPremiumUsers(): Promise<number> {
    const result = await db('users')
      .whereIn('subscription_tier', ['GOLD', 'PLATINUM', 'DIAMOND'])
      .count('* as count')
      .first();
    return parseInt(result?.count as string, 10) || 0;
  }

  private async getTotalMatches(): Promise<number> {
    const result = await db('matches').count('* as count').first();
    return parseInt(result?.count as string, 10) || 0;
  }

  private async getMatchesToday(): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result = await db('matches').where('created_at', '>=', today).count('* as count').first();
    return parseInt(result?.count as string, 10) || 0;
  }

  private async getTotalMessages(): Promise<number> {
    const result = await db('messages').count('* as count').first();
    return parseInt(result?.count as string, 10) || 0;
  }

  private async getMessagesToday(): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result = await db('messages')
      .where('created_at', '>=', today)
      .count('* as count')
      .first();
    return parseInt(result?.count as string, 10) || 0;
  }

  private async getPendingVerifications(): Promise<number> {
    const result = await db('photo_verifications')
      .where('status', 'pending')
      .count('* as count')
      .first();
    return parseInt(result?.count as string, 10) || 0;
  }

  private async getPendingReports(): Promise<number> {
    const result = await db('reports').where('status', 'pending').count('* as count').first();
    return parseInt(result?.count as string, 10) || 0;
  }

  private async getRevenue() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const [todayRevenue, monthRevenue, totalRevenue] = await Promise.all([
      db('transactions')
        .where('created_at', '>=', today)
        .where('status', 'completed')
        .sum('amount as total')
        .first(),
      db('transactions')
        .where('created_at', '>=', monthStart)
        .where('status', 'completed')
        .sum('amount as total')
        .first(),
      db('transactions').where('status', 'completed').sum('amount as total').first(),
    ]);

    return {
      today: parseInt(todayRevenue?.total as string, 10) || 0,
      month: parseInt(monthRevenue?.total as string, 10) || 0,
      total: parseInt(totalRevenue?.total as string, 10) || 0,
    };
  }

  private getStartDate(timeRange: 'today' | 'week' | 'month'): Date {
    const now = new Date();
    switch (timeRange) {
      case 'today':
        now.setHours(0, 0, 0, 0);
        return now;
      case 'week':
        now.setDate(now.getDate() - 7);
        return now;
      case 'month':
        now.setMonth(now.getMonth() - 1);
        return now;
      default:
        return now;
    }
  }
}
