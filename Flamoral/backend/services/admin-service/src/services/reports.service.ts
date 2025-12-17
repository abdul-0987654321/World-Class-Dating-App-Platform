import { db } from '../infrastructure/database';
import { logger } from '../utils/logger';

export class ReportsService {
  /**
   * Generate user growth report
   */
  async getUserGrowthReport(startDate: Date, endDate: Date) {
    const dailySignups = await db('users')
      .select(db.raw('DATE(created_at) as date'))
      .count('* as signups')
      .whereBetween('created_at', [startDate, endDate])
      .groupBy(db.raw('DATE(created_at)'))
      .orderBy('date', 'asc');

    const totalUsers = await db('users')
      .where('created_at', '<=', endDate)
      .count('* as count')
      .first();

    const activeUsers = await db('users')
      .whereBetween('last_active', [startDate, endDate])
      .count('* as count')
      .first();

    return {
      period: { startDate, endDate },
      dailySignups,
      totalUsers: parseInt(totalUsers?.count as string) || 0,
      activeUsers: parseInt(activeUsers?.count as string) || 0,
    };
  }

  /**
   * Generate revenue report
   */
  async getRevenueReport(startDate: Date, endDate: Date) {
    const dailyRevenue = await db('transactions')
      .select(db.raw('DATE(created_at) as date'))
      .sum('amount as revenue')
      .count('* as transaction_count')
      .where('status', 'completed')
      .whereBetween('created_at', [startDate, endDate])
      .groupBy(db.raw('DATE(created_at)'))
      .orderBy('date', 'asc');

    const totalRevenue = await db('transactions')
      .where('status', 'completed')
      .whereBetween('created_at', [startDate, endDate])
      .sum('amount as total')
      .first();

    const byPaymentMethod = await db('transactions')
      .select('payment_method')
      .sum('amount as revenue')
      .count('* as count')
      .where('status', 'completed')
      .whereBetween('created_at', [startDate, endDate])
      .groupBy('payment_method');

    const bySubscriptionTier = await db('transactions')
      .select('subscription_tier')
      .sum('amount as revenue')
      .count('* as count')
      .where('status', 'completed')
      .whereBetween('created_at', [startDate, endDate])
      .groupBy('subscription_tier');

    return {
      period: { startDate, endDate },
      totalRevenue: parseFloat(totalRevenue?.total as string) || 0,
      dailyRevenue: dailyRevenue.map(d => ({
        date: d.date,
        revenue: parseFloat(d.revenue) || 0,
        transactionCount: parseInt(d.transaction_count),
      })),
      byPaymentMethod: byPaymentMethod.map(pm => ({
        method: pm.payment_method,
        revenue: parseFloat(pm.revenue) || 0,
        count: parseInt(pm.count),
      })),
      bySubscriptionTier: bySubscriptionTier.map(st => ({
        tier: st.subscription_tier,
        revenue: parseFloat(st.revenue) || 0,
        count: parseInt(st.count),
      })),
    };
  }

  /**
   * Generate engagement report
   */
  async getEngagementReport(startDate: Date, endDate: Date) {
    const matches = await db('matches')
      .whereBetween('created_at', [startDate, endDate])
      .count('* as count')
      .first();

    const messages = await db('messages')
      .whereBetween('created_at', [startDate, endDate])
      .count('* as count')
      .first();

    const likes = await db('likes')
      .whereBetween('created_at', [startDate, endDate])
      .count('* as count')
      .first();

    const profileViews = await db('profile_views')
      .whereBetween('created_at', [startDate, endDate])
      .count('* as count')
      .first();

    const dailyEngagement = await db.raw(`
      SELECT
        DATE(created_at) as date,
        COUNT(DISTINCT user_id) as active_users,
        COUNT(*) as total_actions
      FROM (
        SELECT created_at, user1_id as user_id FROM matches WHERE created_at BETWEEN ? AND ?
        UNION ALL
        SELECT created_at, sender_id as user_id FROM messages WHERE created_at BETWEEN ? AND ?
        UNION ALL
        SELECT created_at, liker_id as user_id FROM likes WHERE created_at BETWEEN ? AND ?
      ) as actions
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `, [startDate, endDate, startDate, endDate, startDate, endDate]);

    return {
      period: { startDate, endDate },
      totalMatches: parseInt(matches?.count as string) || 0,
      totalMessages: parseInt(messages?.count as string) || 0,
      totalLikes: parseInt(likes?.count as string) || 0,
      totalProfileViews: parseInt(profileViews?.count as string) || 0,
      dailyEngagement: dailyEngagement.rows,
    };
  }

  /**
   * Generate moderation report
   */
  async getModerationReport(startDate: Date, endDate: Date) {
    const reports = await db('reports')
      .whereBetween('created_at', [startDate, endDate]);

    const byStatus = await db('reports')
      .select('status')
      .count('* as count')
      .whereBetween('created_at', [startDate, endDate])
      .groupBy('status');

    const byCategory = await db('reports')
      .select('category')
      .count('* as count')
      .whereBetween('created_at', [startDate, endDate])
      .groupBy('category');

    const bans = await db('users')
      .where('is_banned', true)
      .whereBetween('banned_at', [startDate, endDate])
      .count('* as count')
      .first();

    const deletions = await db('users')
      .whereNotNull('deleted_at')
      .whereBetween('deleted_at', [startDate, endDate])
      .count('* as count')
      .first();

    const avgResolutionTime = await db('reports')
      .whereNotNull('resolved_at')
      .whereBetween('created_at', [startDate, endDate])
      .select(db.raw('AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))) as avg_seconds'))
      .first();

    return {
      period: { startDate, endDate },
      totalReports: reports.length,
      byStatus: byStatus.reduce((acc, item) => {
        acc[item.status] = parseInt(item.count);
        return acc;
      }, {} as Record<string, number>),
      byCategory: byCategory.reduce((acc, item) => {
        acc[item.category] = parseInt(item.count);
        return acc;
      }, {} as Record<string, number>),
      totalBans: parseInt(bans?.count as string) || 0,
      totalDeletions: parseInt(deletions?.count as string) || 0,
      avgResolutionTimeSeconds: Math.round(avgResolutionTime?.avg_seconds || 0),
    };
  }

  /**
   * Generate subscription report
   */
  async getSubscriptionReport(startDate: Date, endDate: Date) {
    const newSubscriptions = await db('subscription_history')
      .where('action', 'subscribe')
      .whereBetween('created_at', [startDate, endDate])
      .count('* as count')
      .first();

    const cancellations = await db('subscription_history')
      .where('action', 'cancel')
      .whereBetween('created_at', [startDate, endDate])
      .count('* as count')
      .first();

    const upgrades = await db('subscription_history')
      .where('action', 'upgrade')
      .whereBetween('created_at', [startDate, endDate])
      .count('* as count')
      .first();

    const downgrades = await db('subscription_history')
      .where('action', 'downgrade')
      .whereBetween('created_at', [startDate, endDate])
      .count('* as count')
      .first();

    const currentSubscribers = await db('users')
      .whereIn('subscription_tier', ['GOLD', 'PLATINUM', 'DIAMOND'])
      .select('subscription_tier')
      .count('* as count')
      .groupBy('subscription_tier');

    const churnRate = await this.calculateChurnRate(startDate, endDate);

    return {
      period: { startDate, endDate },
      newSubscriptions: parseInt(newSubscriptions?.count as string) || 0,
      cancellations: parseInt(cancellations?.count as string) || 0,
      upgrades: parseInt(upgrades?.count as string) || 0,
      downgrades: parseInt(downgrades?.count as string) || 0,
      currentSubscribers: currentSubscribers.reduce((acc, item) => {
        acc[item.subscription_tier] = parseInt(item.count);
        return acc;
      }, {} as Record<string, number>),
      churnRate,
    };
  }

  /**
   * Calculate churn rate
   */
  private async calculateChurnRate(startDate: Date, endDate: Date): Promise<number> {
    const startCount = await db('users')
      .whereIn('subscription_tier', ['GOLD', 'PLATINUM', 'DIAMOND'])
      .where('created_at', '<=', startDate)
      .count('* as count')
      .first();

    const endCount = await db('users')
      .whereIn('subscription_tier', ['GOLD', 'PLATINUM', 'DIAMOND'])
      .where('created_at', '<=', endDate)
      .count('* as count')
      .first();

    const start = parseInt(startCount?.count as string) || 0;
    const end = parseInt(endCount?.count as string) || 0;

    if (start === 0) return 0;

    return ((start - end) / start) * 100;
  }

  /**
   * Export data as CSV
   */
  async exportToCSV(reportType: string, startDate: Date, endDate: Date): Promise<string> {
    let data: any;

    switch (reportType) {
      case 'users':
        data = await this.getUserGrowthReport(startDate, endDate);
        break;
      case 'revenue':
        data = await this.getRevenueReport(startDate, endDate);
        break;
      case 'engagement':
        data = await this.getEngagementReport(startDate, endDate);
        break;
      case 'moderation':
        data = await this.getModerationReport(startDate, endDate);
        break;
      case 'subscriptions':
        data = await this.getSubscriptionReport(startDate, endDate);
        break;
      default:
        throw new Error('Invalid report type');
    }

    logger.info(`CSV export requested: ${reportType}`, { startDate, endDate });

    // Convert to CSV (simplified - in production, use a proper CSV library)
    return JSON.stringify(data);
  }

  /**
   * Get overview dashboard stats
   */
  async getOverviewStats() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [todayStats, monthStats] = await Promise.all([
      this.getDailyStats(today),
      this.getMonthlyStats(monthStart, now),
    ]);

    return {
      today: todayStats,
      month: monthStats,
    };
  }

  private async getDailyStats(date: Date) {
    const [users, revenue, matches, messages] = await Promise.all([
      db('users').where('created_at', '>=', date).count('* as count').first(),
      db('transactions')
        .where('status', 'completed')
        .where('created_at', '>=', date)
        .sum('amount as total')
        .first(),
      db('matches').where('created_at', '>=', date).count('* as count').first(),
      db('messages').where('created_at', '>=', date).count('* as count').first(),
    ]);

    return {
      newUsers: parseInt(users?.count as string) || 0,
      revenue: parseFloat(revenue?.total as string) || 0,
      matches: parseInt(matches?.count as string) || 0,
      messages: parseInt(messages?.count as string) || 0,
    };
  }

  private async getMonthlyStats(startDate: Date, endDate: Date) {
    const [users, revenue, matches, messages] = await Promise.all([
      db('users').whereBetween('created_at', [startDate, endDate]).count('* as count').first(),
      db('transactions')
        .where('status', 'completed')
        .whereBetween('created_at', [startDate, endDate])
        .sum('amount as total')
        .first(),
      db('matches').whereBetween('created_at', [startDate, endDate]).count('* as count').first(),
      db('messages').whereBetween('created_at', [startDate, endDate]).count('* as count').first(),
    ]);

    return {
      newUsers: parseInt(users?.count as string) || 0,
      revenue: parseFloat(revenue?.total as string) || 0,
      matches: parseInt(matches?.count as string) || 0,
      messages: parseInt(messages?.count as string) || 0,
    };
  }
}
