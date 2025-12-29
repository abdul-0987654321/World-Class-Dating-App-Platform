import logger from '../../utils/logger';
import db from '../../infrastructure/database/connection';

export interface ProfileBoost {
  id: string;
  userId: string;
  startTime: Date;
  endTime: Date;
  duration: number; // minutes
  isActive: boolean;
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
  boostType: 'standard' | 'premium' | 'super';
  multiplier: number;
  impressions: number;
  likes: number;
  matches: number;
  createdAt: Date;
}

export interface BoostSchedule {
  userId: string;
  scheduledTime: Date;
  duration: number;
  boostType: 'standard' | 'premium' | 'super';
  autoActivate: boolean;
}

export interface BoostAnalytics {
  totalBoosts: number;
  totalImpressions: number;
  totalLikes: number;
  totalMatches: number;
  avgImpressionsPerBoost: number;
  avgLikesPerBoost: number;
  avgMatchesPerBoost: number;
  roi: number; // Return on investment score
  bestPerformingTime: string;
}

class ProfileBoostService {
  private readonly BOOST_DURATIONS = {
    standard: 30, // 30 minutes
    premium: 60, // 1 hour
    super: 180, // 3 hours
  };

  private readonly BOOST_MULTIPLIERS = {
    standard: 2,
    premium: 5,
    super: 10,
  };

  /**
   * Activate profile boost
   */
  async activateBoost(
    userId: string,
    boostType: 'standard' | 'premium' | 'super'
  ): Promise<ProfileBoost> {
    // Check if user already has an active boost
    const activeBoost = await this.getActiveBoost(userId);
    if (activeBoost) {
      throw new Error('User already has an active boost');
    }

    const now = new Date();
    const duration = this.BOOST_DURATIONS[boostType];
    const endTime = new Date(now.getTime() + duration * 60 * 1000);

    const boost: ProfileBoost = {
      id: this.generateBoostId(),
      userId,
      startTime: now,
      endTime,
      duration,
      isActive: true,
      status: 'active',
      boostType,
      multiplier: this.BOOST_MULTIPLIERS[boostType],
      impressions: 0,
      likes: 0,
      matches: 0,
      createdAt: now,
    };

    // Store boost (in production, save to database)
    await this.storeBoost(boost);

    // Schedule automatic deactivation
    this.scheduleBoostEnd(boost);

    logger.info('Profile boost activated', {
      userId,
      boostType,
      duration,
      endTime,
    });

    return boost;
  }

  /**
   * Schedule profile boost
   */
  async scheduleBoost(schedule: BoostSchedule): Promise<ProfileBoost> {
    const now = new Date();
    const scheduledTime = new Date(schedule.scheduledTime);

    if (scheduledTime <= now) {
      throw new Error('Scheduled time must be in the future');
    }

    const endTime = new Date(
      scheduledTime.getTime() + schedule.duration * 60 * 1000
    );

    const boost: ProfileBoost = {
      id: this.generateBoostId(),
      userId: schedule.userId,
      startTime: scheduledTime,
      endTime,
      duration: schedule.duration,
      isActive: false,
      status: 'scheduled',
      boostType: schedule.boostType,
      multiplier: this.BOOST_MULTIPLIERS[schedule.boostType],
      impressions: 0,
      likes: 0,
      matches: 0,
      createdAt: now,
    };

    await this.storeBoost(boost);

    // Schedule automatic activation
    if (schedule.autoActivate) {
      this.scheduleBoostStart(boost);
    }

    logger.info('Profile boost scheduled', {
      userId: schedule.userId,
      scheduledTime,
      boostType: schedule.boostType,
    });

    return boost;
  }

  /**
   * Get active boost for user
   */
  async getActiveBoost(userId: string): Promise<ProfileBoost | null> {
    try {
      const boost = await db('boosts')
        .where({ user_id: userId, status: 'active' })
        .where('expires_at', '>', new Date())
        .first();

      if (!boost) {
        return null;
      }

      return this.mapDbRowToProfileBoost(boost);
    } catch (error) {
      logger.error('Error fetching active boost', { userId, error });
      throw error;
    }
  }

  /**
   * Get scheduled boosts for user
   */
  async getScheduledBoosts(userId: string): Promise<ProfileBoost[]> {
    try {
      // 'pending' status in the database corresponds to 'scheduled' in ProfileBoost
      const boosts = await db('boosts')
        .where({ user_id: userId, status: 'pending' })
        .where('started_at', '>', new Date())
        .orderBy('started_at', 'asc')
        .select('*');

      return boosts.map((boost: any) => this.mapDbRowToProfileBoost(boost));
    } catch (error) {
      logger.error('Error fetching scheduled boosts', { userId, error });
      throw error;
    }
  }

  /**
   * Get boost history
   */
  async getBoostHistory(
    userId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<ProfileBoost[]> {
    try {
      const limit = options?.limit ?? 50;
      const offset = options?.offset ?? 0;

      const boosts = await db('boosts')
        .where({ user_id: userId })
        .orderBy('created_at', 'desc')
        .limit(limit)
        .offset(offset)
        .select('*');

      return boosts.map((boost: any) => this.mapDbRowToProfileBoost(boost));
    } catch (error) {
      logger.error('Error fetching boost history', { userId, error });
      throw error;
    }
  }

  /**
   * Cancel scheduled boost
   */
  async cancelScheduledBoost(boostId: string): Promise<void> {
    // In production, update in database
    logger.info('Scheduled boost cancelled', { boostId });
  }

  /**
   * End boost early
   */
  async endBoostEarly(boostId: string): Promise<ProfileBoost> {
    // In production, get from database and update
    const boost: any = { id: boostId, status: 'active' };

    if (boost.status !== 'active') {
      throw new Error('Boost is not active');
    }

    boost.status = 'completed';
    boost.isActive = false;
    boost.endTime = new Date();

    logger.info('Boost ended early', { boostId });

    return boost;
  }

  /**
   * Update boost metrics
   */
  async updateBoostMetrics(
    boostId: string,
    metric: 'impression' | 'like' | 'match'
  ): Promise<void> {
    // In production, increment metric in database
    logger.debug('Boost metric updated', { boostId, metric });
  }

  /**
   * Get boost analytics
   */
  async getBoostAnalytics(userId: string): Promise<BoostAnalytics> {
    const history = await this.getBoostHistory(userId);

    if (history.length === 0) {
      return this.getEmptyAnalytics();
    }

    const totalBoosts = history.length;
    const totalImpressions = history.reduce((sum, b) => sum + b.impressions, 0);
    const totalLikes = history.reduce((sum, b) => sum + b.likes, 0);
    const totalMatches = history.reduce((sum, b) => sum + b.matches, 0);

    const analytics: BoostAnalytics = {
      totalBoosts,
      totalImpressions,
      totalLikes,
      totalMatches,
      avgImpressionsPerBoost: Math.round(totalImpressions / totalBoosts),
      avgLikesPerBoost: Math.round(totalLikes / totalBoosts),
      avgMatchesPerBoost: Math.round(totalMatches / totalBoosts),
      roi: this.calculateROI(history),
      bestPerformingTime: this.findBestPerformingTime(history),
    };

    return analytics;
  }

  /**
   * Get recommended boost time
   */
  async getRecommendedBoostTime(userId: string): Promise<Date[]> {
    // Analyze user's target audience activity patterns
    // Return top 3 recommended times

    const now = new Date();
    const recommendations: Date[] = [];

    // Peak times for dating apps:
    // Sunday 9 PM
    // Wednesday 9 PM
    // Thursday 9 PM

    // Get next Sunday at 9 PM
    const sunday = this.getNextDayOfWeek(0, 21); // 0 = Sunday
    recommendations.push(sunday);

    // Get next Wednesday at 9 PM
    const wednesday = this.getNextDayOfWeek(3, 21); // 3 = Wednesday
    recommendations.push(wednesday);

    // Get next Thursday at 9 PM
    const thursday = this.getNextDayOfWeek(4, 21); // 4 = Thursday
    recommendations.push(thursday);

    return recommendations.filter(date => date > now).slice(0, 3);
  }

  /**
   * Check if user can use boost
   */
  async canUseBoost(userId: string, boostType: 'standard' | 'premium' | 'super'): Promise<{
    canUse: boolean;
    reason?: string;
  }> {
    // Check if user has active boost
    const activeBoost = await this.getActiveBoost(userId);
    if (activeBoost) {
      return {
        canUse: false,
        reason: 'You already have an active boost',
      };
    }

    // Check cooldown period (e.g., 6 hours between boosts)
    const lastBoost = await this.getLastBoost(userId);
    if (lastBoost) {
      const hoursSinceLastBoost =
        (Date.now() - lastBoost.endTime.getTime()) / (1000 * 60 * 60);

      if (hoursSinceLastBoost < 6) {
        return {
          canUse: false,
          reason: `Please wait ${Math.ceil(6 - hoursSinceLastBoost)} more hours`,
        };
      }
    }

    // In production, check user's subscription/credits
    // For now, assume they can use it
    return { canUse: true };
  }

  /**
   * Get boost visibility multiplier
   */
  getVisibilityMultiplier(boostType: 'standard' | 'premium' | 'super'): number {
    return this.BOOST_MULTIPLIERS[boostType];
  }

  /**
   * Check if boost is currently active
   */
  isBoostActive(boost: ProfileBoost): boolean {
    if (!boost.isActive || boost.status !== 'active') {
      return false;
    }

    const now = new Date();
    return now >= boost.startTime && now < boost.endTime;
  }

  // Private helper methods

  private generateBoostId(): string {
    return `boost_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Map database row to ProfileBoost interface
   */
  private mapDbRowToProfileBoost(row: any): ProfileBoost {
    // Map database status to ProfileBoost status
    const statusMap: { [key: string]: ProfileBoost['status'] } = {
      pending: 'scheduled',
      active: 'active',
      completed: 'completed',
      expired: 'completed',
      canceled: 'cancelled',
    };

    // Map database boost type to ProfileBoost boost type
    const typeMap: { [key: string]: ProfileBoost['boostType'] } = {
      standard: 'standard',
      prime_time: 'premium',
      spotlight: 'super',
    };

    return {
      id: row.id,
      userId: row.user_id,
      startTime: row.started_at ? new Date(row.started_at) : new Date(row.created_at),
      endTime: row.expires_at ? new Date(row.expires_at) : new Date(row.created_at),
      duration: row.duration_minutes,
      isActive: row.status === 'active',
      status: statusMap[row.status] || 'completed',
      boostType: typeMap[row.type] || 'standard',
      multiplier: parseFloat(row.visibility_multiplier) || 1,
      impressions: row.impressions_gained || 0,
      likes: row.likes_gained || 0,
      matches: row.matches_gained || 0,
      createdAt: new Date(row.created_at),
    };
  }

  private async storeBoost(boost: ProfileBoost): Promise<void> {
    // In production, save to database
    logger.debug('Boost stored', { boostId: boost.id });
  }

  private scheduleBoostEnd(boost: ProfileBoost): void {
    const delay = boost.endTime.getTime() - Date.now();

    setTimeout(async () => {
      await this.endBoost(boost.id);
    }, delay);
  }

  private scheduleBoostStart(boost: ProfileBoost): void {
    const delay = boost.startTime.getTime() - Date.now();

    setTimeout(async () => {
      await this.startScheduledBoost(boost.id);
    }, delay);
  }

  private async endBoost(boostId: string): Promise<void> {
    // Update boost status to completed
    logger.info('Boost ended', { boostId });
  }

  private async startScheduledBoost(boostId: string): Promise<void> {
    // Activate scheduled boost
    logger.info('Scheduled boost started', { boostId });
  }

  private async getLastBoost(userId: string): Promise<ProfileBoost | null> {
    const history = await this.getBoostHistory(userId);
    return history.length > 0 ? history[0] : null;
  }

  private calculateROI(history: ProfileBoost[]): number {
    // Calculate return on investment score (0-100)
    // Based on matches per boost relative to cost

    if (history.length === 0) return 0;

    const avgMatchesPerBoost = history.reduce((sum, b) => sum + b.matches, 0) / history.length;

    // Scoring: 1 match = 20 points, capped at 100
    return Math.min(Math.round(avgMatchesPerBoost * 20), 100);
  }

  private findBestPerformingTime(history: ProfileBoost[]): string {
    if (history.length === 0) return 'Not enough data';

    // Group by day of week and hour
    const timePerformance: { [key: string]: { matches: number; count: number } } = {};

    for (const boost of history) {
      const day = boost.startTime.getDay();
      const hour = boost.startTime.getHours();
      const key = `${this.getDayName(day)} ${hour}:00`;

      if (!timePerformance[key]) {
        timePerformance[key] = { matches: 0, count: 0 };
      }

      timePerformance[key].matches += boost.matches;
      timePerformance[key].count += 1;
    }

    // Find best performing time
    let bestTime = '';
    let bestAvg = 0;

    for (const [time, data] of Object.entries(timePerformance)) {
      const avg = data.matches / data.count;
      if (avg > bestAvg) {
        bestAvg = avg;
        bestTime = time;
      }
    }

    return bestTime || 'Not enough data';
  }

  private getDayName(day: number): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[day];
  }

  private getNextDayOfWeek(dayOfWeek: number, hour: number): Date {
    const now = new Date();
    const result = new Date(now);

    result.setHours(hour, 0, 0, 0);

    const currentDay = now.getDay();
    const daysUntilTarget = (dayOfWeek - currentDay + 7) % 7;

    if (daysUntilTarget === 0 && now.getHours() >= hour) {
      // If it's today but past the hour, schedule for next week
      result.setDate(result.getDate() + 7);
    } else {
      result.setDate(result.getDate() + daysUntilTarget);
    }

    return result;
  }

  private getEmptyAnalytics(): BoostAnalytics {
    return {
      totalBoosts: 0,
      totalImpressions: 0,
      totalLikes: 0,
      totalMatches: 0,
      avgImpressionsPerBoost: 0,
      avgLikesPerBoost: 0,
      avgMatchesPerBoost: 0,
      roi: 0,
      bestPerformingTime: 'Not enough data',
    };
  }
}

export const profileBoostService = new ProfileBoostService();
export default profileBoostService;
