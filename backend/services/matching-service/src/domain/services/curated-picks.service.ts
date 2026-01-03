/**
 * Curated Daily Picks Service
 * Generates personalized daily picks based on ML scoring and user behavior
 */

import { db } from '../../database';
import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '@flamoral/backend-shared';
import axios from 'axios';

const logger = createLogger('curated-picks-service');

// Number of daily curated picks by tier
const DAILY_PICKS_COUNT = {
  free: 5,
  plus: 10,
  premium: 15,
  elite: 20,
};

interface CuratedPick {
  id: string;
  userId: string;
  pickUserId: string;
  score: number;
  reasons: string[];
  category: 'top_pick' | 'high_compatibility' | 'new_user' | 'recently_active' | 'mutual_interest';
  expiresAt: Date;
  createdAt: Date;
  viewed: boolean;
  actedUpon: boolean;
}

interface CuratedPicksResponse {
  picks: CuratedPickWithProfile[];
  generatedAt: string;
  expiresAt: string;
  remainingPicks: number;
  tier: string;
}

interface CuratedPickWithProfile {
  pickId: string;
  userId: string;
  score: number;
  reasons: string[];
  category: string;
  profile: {
    userId: string;
    displayName: string;
    age: number;
    city?: string;
    photos: string[];
    bio?: string;
    interests: string[];
    verified: boolean;
    compatibilityScore: number;
  };
}

export class CuratedPicksService {
  private userServiceUrl: string;
  private paymentServiceUrl: string;

  constructor() {
    this.userServiceUrl = process.env.USER_SERVICE_URL || 'http://localhost:3001';
    this.paymentServiceUrl = process.env.PAYMENT_SERVICE_URL || 'http://localhost:3005';
  }

  /**
   * Get today's curated picks for a user
   * Generates new picks if none exist for today
   */
  async getDailyPicks(userId: string): Promise<CuratedPicksResponse> {
    try {
      const tier = await this.getUserTier(userId);
      const pickCount = DAILY_PICKS_COUNT[tier as keyof typeof DAILY_PICKS_COUNT] || DAILY_PICKS_COUNT.free;

      // Check if picks already exist for today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      let existingPicks = await db('curated_picks')
        .where({ user_id: userId })
        .where('created_at', '>=', today)
        .where('created_at', '<', tomorrow)
        .orderBy('score', 'desc');

      // Generate new picks if none exist
      if (existingPicks.length === 0) {
        await this.generateDailyPicks(userId, pickCount);
        existingPicks = await db('curated_picks')
          .where({ user_id: userId })
          .where('created_at', '>=', today)
          .where('created_at', '<', tomorrow)
          .orderBy('score', 'desc');
      }

      // Fetch full profiles for picks
      const pickUserIds = existingPicks.map((p) => p.pick_user_id);
      const profiles = await this.fetchUserProfiles(pickUserIds);

      const picksWithProfiles: CuratedPickWithProfile[] = existingPicks.map((pick) => {
        const profile = profiles.find((p) => p.userId === pick.pick_user_id);
        return {
          pickId: pick.id,
          userId: pick.pick_user_id,
          score: pick.score,
          reasons: JSON.parse(pick.reasons || '[]'),
          category: pick.category,
          profile: profile || {
            userId: pick.pick_user_id,
            displayName: 'User',
            age: 0,
            photos: [],
            interests: [],
            verified: false,
            compatibilityScore: pick.score,
          },
        };
      });

      // Count remaining unviewed picks
      const remainingPicks = existingPicks.filter((p) => !p.viewed).length;

      return {
        picks: picksWithProfiles,
        generatedAt: today.toISOString(),
        expiresAt: tomorrow.toISOString(),
        remainingPicks,
        tier,
      };
    } catch (error) {
      logger.error('Failed to get daily picks', error);
      throw error;
    }
  }

  /**
   * Generate daily curated picks using ML-based scoring
   */
  async generateDailyPicks(userId: string, count: number): Promise<void> {
    try {
      logger.info(`Generating ${count} daily picks for user ${userId}`);

      // Get user preferences
      const userPrefs = await this.fetchUserPreferences(userId);

      // Get already swiped/matched users to exclude
      const excludedUserIds = await this.getExcludedUserIds(userId);

      // Calculate scores for potential candidates
      const candidates = await this.scoreCandidates(userId, userPrefs, excludedUserIds, count * 3);

      // Select top candidates with category diversification
      const selectedPicks = this.diversifyPicks(candidates, count);

      // Store picks in database
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const pickRecords = selectedPicks.map((pick) => ({
        id: uuidv4(),
        user_id: userId,
        pick_user_id: pick.userId,
        score: pick.score,
        reasons: JSON.stringify(pick.reasons),
        category: pick.category,
        expires_at: tomorrow,
        created_at: new Date(),
        viewed: false,
        acted_upon: false,
      }));

      if (pickRecords.length > 0) {
        await db('curated_picks').insert(pickRecords);
      }

      logger.info(`Generated ${pickRecords.length} daily picks for user ${userId}`);
    } catch (error) {
      logger.error('Failed to generate daily picks', error);
      throw error;
    }
  }

  /**
   * Score candidates using multiple factors
   */
  private async scoreCandidates(
    userId: string,
    userPrefs: any,
    excludedUserIds: string[],
    limit: number
  ): Promise<Array<{ userId: string; score: number; reasons: string[]; category: string }>> {
    try {
      // Fetch potential candidates from user service
      const response = await axios.post(`${this.userServiceUrl}/api/users/search`, {
        ageMin: userPrefs.ageMin || 18,
        ageMax: userPrefs.ageMax || 99,
        genderPreference: userPrefs.genderPreference,
        maxDistance: userPrefs.maxDistance || 100,
        excludedUserIds: [...excludedUserIds, userId],
        limit: limit,
        offset: 0,
        includeScoring: true,
      }, {
        timeout: 10000,
      });

      const candidates = response.data || [];

      // Score each candidate
      return candidates.map((candidate: any) => {
        const scoreBreakdown = this.calculateCandidateScore(candidate, userPrefs);
        return {
          userId: candidate.userId || candidate.id,
          score: scoreBreakdown.totalScore,
          reasons: scoreBreakdown.reasons,
          category: this.determineCategory(candidate, scoreBreakdown),
        };
      }).sort((a: any, b: any) => b.score - a.score);
    } catch (error) {
      logger.error('Failed to score candidates', error);
      return [];
    }
  }

  /**
   * Calculate comprehensive candidate score
   */
  private calculateCandidateScore(candidate: any, userPrefs: any): { totalScore: number; reasons: string[] } {
    let totalScore = 0;
    const reasons: string[] = [];

    // Base compatibility (0-30 points)
    if (candidate.compatibilityScore) {
      const compatScore = Math.min(30, candidate.compatibilityScore * 0.3);
      totalScore += compatScore;
      if (candidate.compatibilityScore >= 80) {
        reasons.push('Highly compatible with you');
      }
    }

    // Common interests (0-25 points)
    const commonInterests = candidate.commonInterests || [];
    if (commonInterests.length > 0) {
      const interestScore = Math.min(25, commonInterests.length * 5);
      totalScore += interestScore;
      if (commonInterests.length >= 3) {
        reasons.push(`${commonInterests.length} shared interests`);
      }
    }

    // Profile completeness (0-10 points)
    if (candidate.profileCompleteness) {
      const completenessScore = candidate.profileCompleteness * 0.1;
      totalScore += completenessScore;
      if (candidate.profileCompleteness >= 90) {
        reasons.push('Complete profile');
      }
    }

    // Photo quality/count (0-10 points)
    const photoCount = candidate.photos?.length || 0;
    if (photoCount >= 4) {
      totalScore += 10;
    } else if (photoCount >= 2) {
      totalScore += 5;
    }

    // Verification bonus (0-10 points)
    if (candidate.verified || candidate.isVerified) {
      totalScore += 10;
      reasons.push('Verified profile');
    }

    // Activity bonus - recently active (0-10 points)
    if (candidate.lastActive) {
      const lastActiveDate = new Date(candidate.lastActive);
      const hoursSinceActive = (Date.now() - lastActiveDate.getTime()) / (1000 * 60 * 60);
      if (hoursSinceActive < 1) {
        totalScore += 10;
        reasons.push('Online now');
      } else if (hoursSinceActive < 24) {
        totalScore += 7;
        reasons.push('Recently active');
      } else if (hoursSinceActive < 72) {
        totalScore += 3;
      }
    }

    // Distance proximity (0-5 points)
    if (candidate.distance) {
      if (candidate.distance < 5) {
        totalScore += 5;
        reasons.push('Lives nearby');
      } else if (candidate.distance < 20) {
        totalScore += 3;
      }
    }

    // New user bonus (0-5 points)
    if (candidate.createdAt) {
      const createdDate = new Date(candidate.createdAt);
      const daysSinceCreated = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceCreated < 7) {
        totalScore += 5;
        reasons.push('New to the app');
      }
    }

    return { totalScore, reasons };
  }

  /**
   * Determine pick category based on scoring
   */
  private determineCategory(candidate: any, scoreBreakdown: { totalScore: number; reasons: string[] }): string {
    if (scoreBreakdown.totalScore >= 80) {
      return 'top_pick';
    }
    if (candidate.compatibilityScore >= 85) {
      return 'high_compatibility';
    }
    if (candidate.createdAt) {
      const daysSinceCreated = (Date.now() - new Date(candidate.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceCreated < 7) {
        return 'new_user';
      }
    }
    if (candidate.lastActive) {
      const hoursSinceActive = (Date.now() - new Date(candidate.lastActive).getTime()) / (1000 * 60 * 60);
      if (hoursSinceActive < 2) {
        return 'recently_active';
      }
    }
    if (candidate.commonInterests?.length >= 3) {
      return 'mutual_interest';
    }
    return 'high_compatibility';
  }

  /**
   * Diversify picks across categories
   */
  private diversifyPicks(
    candidates: Array<{ userId: string; score: number; reasons: string[]; category: string }>,
    count: number
  ): Array<{ userId: string; score: number; reasons: string[]; category: string }> {
    const categories = ['top_pick', 'high_compatibility', 'new_user', 'recently_active', 'mutual_interest'];
    const selectedPicks: Array<{ userId: string; score: number; reasons: string[]; category: string }> = [];
    const usedUserIds = new Set<string>();

    // First pass: get at least one from each category
    for (const category of categories) {
      const categoryPicks = candidates.filter((c) => c.category === category && !usedUserIds.has(c.userId));
      if (categoryPicks.length > 0) {
        selectedPicks.push(categoryPicks[0]);
        usedUserIds.add(categoryPicks[0].userId);
      }
      if (selectedPicks.length >= count) break;
    }

    // Second pass: fill remaining with highest scored
    const remaining = candidates.filter((c) => !usedUserIds.has(c.userId)).sort((a, b) => b.score - a.score);
    for (const pick of remaining) {
      if (selectedPicks.length >= count) break;
      selectedPicks.push(pick);
      usedUserIds.add(pick.userId);
    }

    return selectedPicks.slice(0, count);
  }

  /**
   * Mark a pick as viewed
   */
  async markPickViewed(userId: string, pickId: string): Promise<void> {
    await db('curated_picks')
      .where({ id: pickId, user_id: userId })
      .update({ viewed: true, viewed_at: new Date() });
  }

  /**
   * Mark a pick as acted upon (liked/passed)
   */
  async markPickActedUpon(userId: string, pickId: string): Promise<void> {
    await db('curated_picks')
      .where({ id: pickId, user_id: userId })
      .update({ acted_upon: true, acted_upon_at: new Date() });
  }

  /**
   * Get excluded user IDs (already swiped, matched, or blocked)
   */
  private async getExcludedUserIds(userId: string): Promise<string[]> {
    const [swipes, matches, blocks] = await Promise.all([
      db('swipes').where({ swiper_id: userId }).select('swiped_id'),
      db('matches')
        .where((builder) => {
          builder.where({ user1_id: userId }).orWhere({ user2_id: userId });
        })
        .select('user1_id', 'user2_id'),
      db('user_blocks')
        .where((builder) => {
          builder.where({ blocker_id: userId }).orWhere({ blocked_id: userId });
        })
        .select('blocker_id', 'blocked_id'),
    ]);

    const excludedIds = new Set<string>();

    swipes.forEach((s) => excludedIds.add(s.swiped_id));
    matches.forEach((m) => {
      if (m.user1_id !== userId) excludedIds.add(m.user1_id);
      if (m.user2_id !== userId) excludedIds.add(m.user2_id);
    });
    blocks.forEach((b) => {
      if (b.blocker_id !== userId) excludedIds.add(b.blocker_id);
      if (b.blocked_id !== userId) excludedIds.add(b.blocked_id);
    });

    return Array.from(excludedIds);
  }

  /**
   * Fetch user preferences
   */
  private async fetchUserPreferences(userId: string): Promise<any> {
    try {
      const response = await axios.get(`${this.userServiceUrl}/api/users/${userId}/preferences`, {
        timeout: 5000,
      });
      return response.data || {};
    } catch (error) {
      logger.warn(`Failed to fetch preferences for ${userId}`);
      return { ageMin: 18, ageMax: 99, maxDistance: 100 };
    }
  }

  /**
   * Fetch user profiles by IDs
   */
  private async fetchUserProfiles(userIds: string[]): Promise<any[]> {
    if (userIds.length === 0) return [];

    try {
      const response = await axios.post(`${this.userServiceUrl}/api/users/batch`, {
        userIds,
        fields: ['userId', 'displayName', 'age', 'city', 'photos', 'bio', 'interests', 'verified', 'compatibilityScore'],
      }, {
        timeout: 10000,
      });
      return response.data || [];
    } catch (error) {
      logger.warn('Failed to fetch user profiles');
      return [];
    }
  }

  /**
   * Get user's subscription tier
   */
  private async getUserTier(userId: string): Promise<string> {
    try {
      const response = await axios.get(`${this.paymentServiceUrl}/api/subscriptions/user/${userId}/tier`, {
        timeout: 5000,
      });
      return response.data?.tier || 'free';
    } catch (error) {
      return 'free';
    }
  }
}

export default new CuratedPicksService();
