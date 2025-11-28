/**
 * ML Matching Service
 * Machine learning-powered matching algorithm with travel mode and daily selections
 */

import { logger } from '../../utils/logger';
import { db } from '../../config/database.config';

// Types
export interface MatchCandidate {
  userId: string;
  compatibilityScore: number;
  features: MatchFeatures;
  distance?: number;
  boostMultiplier: number;
  isBoosted: boolean;
}

export interface MatchFeatures {
  ageCompatibility: number;
  distanceScore: number;
  interestOverlap: number;
  activityLevel: number;
  responseRate: number;
  profileQuality: number;
  verificationBonus: number;
  behavioralMatch: number;
}

export interface UserPreferences {
  minAge: number;
  maxAge: number;
  maxDistance: number;
  genderPreference: string[];
  interests: string[];
  lookingFor: string[];
  dealbreakers: string[];
  priorityTraits: string[];
}

export interface TravelModeSettings {
  isEnabled: boolean;
  destinationLat: number;
  destinationLng: number;
  destinationName: string;
  arrivalDate: Date;
  departureDate?: Date;
  showMeInDestination: boolean;
  matchWithLocals: boolean;
  matchWithTravelers: boolean;
}

export interface DailyPick {
  userId: string;
  pickType: 'top_pick' | 'new_match' | 'mutual_interest' | 'common_interest' | 'compatibility';
  score: number;
  reason: string;
  expiresAt: Date;
}

// Feature weights for ML scoring
const FEATURE_WEIGHTS = {
  ageCompatibility: 0.15,
  distanceScore: 0.12,
  interestOverlap: 0.18,
  activityLevel: 0.10,
  responseRate: 0.12,
  profileQuality: 0.13,
  verificationBonus: 0.08,
  behavioralMatch: 0.12,
};

// Activity scoring thresholds
const ACTIVITY_THRESHOLDS = {
  highly_active: { minDaysActive: 5, score: 1.0 },
  active: { minDaysActive: 3, score: 0.8 },
  moderate: { minDaysActive: 1, score: 0.5 },
  inactive: { minDaysActive: 0, score: 0.2 },
};

class MLMatchingService {
  /**
   * Get recommended profiles for a user
   */
  async getRecommendations(
    userId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<MatchCandidate[]> {
    try {
      // Get user's profile and preferences
      const user = await this.getUserProfile(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const preferences = await this.getUserPreferences(userId);
      const travelMode = await this.getTravelModeSettings(userId);

      // Get candidate pool
      const candidates = await this.getCandidatePool(
        userId,
        preferences,
        travelMode,
        limit * 3 // Get more candidates for scoring
      );

      // Score and rank candidates
      const scoredCandidates = await Promise.all(
        candidates.map(async (candidate) => {
          const features = await this.calculateFeatures(user, candidate, preferences);
          const score = this.calculateCompatibilityScore(features);
          const boostMultiplier = await this.getBoostMultiplier(candidate.id);

          return {
            userId: candidate.id,
            compatibilityScore: score * boostMultiplier,
            features,
            distance: candidate.distance,
            boostMultiplier,
            isBoosted: boostMultiplier > 1,
          };
        })
      );

      // Sort by score and apply boost priorities
      scoredCandidates.sort((a, b) => {
        // Boosted profiles get priority placement
        if (a.isBoosted && !b.isBoosted) return -1;
        if (!a.isBoosted && b.isBoosted) return 1;
        return b.compatibilityScore - a.compatibilityScore;
      });

      // Return top candidates
      return scoredCandidates.slice(offset, offset + limit);
    } catch (error) {
      logger.error('Error getting recommendations:', error);
      return [];
    }
  }

  /**
   * Get daily picks for a user
   */
  async getDailyPicks(userId: string): Promise<DailyPick[]> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Check if picks already generated for today
      const existingPicks = await db('daily_picks')
        .where('user_id', userId)
        .where('created_at', '>=', today)
        .select('*');

      if (existingPicks.length > 0) {
        return existingPicks.map(this.mapDbPickToPick);
      }

      // Generate new daily picks
      const picks = await this.generateDailyPicks(userId);

      // Store picks
      for (const pick of picks) {
        await db('daily_picks').insert({
          id: require('crypto').randomUUID(),
          user_id: userId,
          picked_user_id: pick.userId,
          pick_type: pick.pickType,
          score: pick.score,
          reason: pick.reason,
          expires_at: pick.expiresAt,
          created_at: new Date(),
        });
      }

      return picks;
    } catch (error) {
      logger.error('Error getting daily picks:', error);
      return [];
    }
  }

  /**
   * Enable travel mode
   */
  async enableTravelMode(
    userId: string,
    settings: Omit<TravelModeSettings, 'isEnabled'>
  ): Promise<boolean> {
    try {
      await db('user_travel_mode')
        .insert({
          id: require('crypto').randomUUID(),
          user_id: userId,
          is_enabled: true,
          destination_lat: settings.destinationLat,
          destination_lng: settings.destinationLng,
          destination_name: settings.destinationName,
          arrival_date: settings.arrivalDate,
          departure_date: settings.departureDate,
          show_me_in_destination: settings.showMeInDestination,
          match_with_locals: settings.matchWithLocals,
          match_with_travelers: settings.matchWithTravelers,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .onConflict('user_id')
        .merge();

      logger.info(`Travel mode enabled for user ${userId} to ${settings.destinationName}`);
      return true;
    } catch (error) {
      logger.error('Error enabling travel mode:', error);
      return false;
    }
  }

  /**
   * Disable travel mode
   */
  async disableTravelMode(userId: string): Promise<boolean> {
    try {
      await db('user_travel_mode')
        .where('user_id', userId)
        .update({
          is_enabled: false,
          updated_at: new Date(),
        });

      logger.info(`Travel mode disabled for user ${userId}`);
      return true;
    } catch (error) {
      logger.error('Error disabling travel mode:', error);
      return false;
    }
  }

  /**
   * Get travel mode settings
   */
  async getTravelModeSettings(userId: string): Promise<TravelModeSettings | null> {
    const settings = await db('user_travel_mode')
      .where('user_id', userId)
      .where('is_enabled', true)
      .first();

    if (!settings) return null;

    return {
      isEnabled: settings.is_enabled,
      destinationLat: settings.destination_lat,
      destinationLng: settings.destination_lng,
      destinationName: settings.destination_name,
      arrivalDate: settings.arrival_date,
      departureDate: settings.departure_date,
      showMeInDestination: settings.show_me_in_destination,
      matchWithLocals: settings.match_with_locals,
      matchWithTravelers: settings.match_with_travelers,
    };
  }

  /**
   * Record interaction for ML learning
   */
  async recordInteraction(
    userId: string,
    targetUserId: string,
    interactionType: 'like' | 'superlike' | 'pass' | 'message' | 'unmatch',
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      await db('ml_interactions').insert({
        id: require('crypto').randomUUID(),
        user_id: userId,
        target_user_id: targetUserId,
        interaction_type: interactionType,
        metadata: JSON.stringify(metadata || {}),
        created_at: new Date(),
      });

      // Update behavioral model
      await this.updateBehavioralModel(userId, targetUserId, interactionType);
    } catch (error) {
      logger.error('Error recording interaction:', error);
    }
  }

  /**
   * Get compatibility breakdown between two users
   */
  async getCompatibilityBreakdown(
    userId1: string,
    userId2: string
  ): Promise<{
    overallScore: number;
    features: MatchFeatures;
    commonInterests: string[];
    compatibilityInsights: string[];
  }> {
    const user1 = await this.getUserProfile(userId1);
    const user2 = await this.getUserProfile(userId2);
    const preferences = await this.getUserPreferences(userId1);

    const features = await this.calculateFeatures(user1, user2, preferences);
    const overallScore = this.calculateCompatibilityScore(features);

    // Get common interests
    const interests1 = user1.interests || [];
    const interests2 = user2.interests || [];
    const commonInterests = interests1.filter((i: string) => interests2.includes(i));

    // Generate insights
    const insights = this.generateCompatibilityInsights(features, commonInterests);

    return {
      overallScore,
      features,
      commonInterests,
      compatibilityInsights: insights,
    };
  }

  // Private helper methods

  /**
   * Get user profile
   */
  private async getUserProfile(userId: string): Promise<any> {
    const user = await db('users')
      .leftJoin('profiles', 'users.id', 'profiles.user_id')
      .where('users.id', userId)
      .select(
        'users.*',
        'profiles.bio',
        'profiles.interests',
        'profiles.current_city',
        'profiles.latitude',
        'profiles.longitude'
      )
      .first();

    return user;
  }

  /**
   * Get user preferences
   */
  private async getUserPreferences(userId: string): Promise<UserPreferences> {
    const prefs = await db('user_settings')
      .where('user_id', userId)
      .first();

    return {
      minAge: prefs?.min_age || 18,
      maxAge: prefs?.max_age || 99,
      maxDistance: prefs?.max_distance || 100,
      genderPreference: prefs?.preferred_gender ? [prefs.preferred_gender] : ['all'],
      interests: prefs?.interests || [],
      lookingFor: prefs?.looking_for || [],
      dealbreakers: prefs?.dealbreakers || [],
      priorityTraits: prefs?.priority_traits || [],
    };
  }

  /**
   * Get candidate pool
   */
  private async getCandidatePool(
    userId: string,
    preferences: UserPreferences,
    travelMode: TravelModeSettings | null,
    limit: number
  ): Promise<any[]> {
    // Get already swiped users
    const swipedIds = await db('swipes')
      .where('user_id', userId)
      .select('target_user_id');

    // Get blocked users
    const blockedIds = await db('user_blocks')
      .where('blocker_id', userId)
      .orWhere('blocked_id', userId)
      .select('blocker_id', 'blocked_id');

    const excludeIds = [
      userId,
      ...swipedIds.map((s: any) => s.target_user_id),
      ...blockedIds.flatMap((b: any) => [b.blocker_id, b.blocked_id]),
    ];

    let query = db('users')
      .leftJoin('profiles', 'users.id', 'profiles.user_id')
      .whereNotIn('users.id', excludeIds)
      .where('users.is_active', true)
      .where('users.is_banned', false);

    // Apply age filter
    const maxBirthDate = new Date();
    maxBirthDate.setFullYear(maxBirthDate.getFullYear() - preferences.minAge);
    const minBirthDate = new Date();
    minBirthDate.setFullYear(minBirthDate.getFullYear() - preferences.maxAge);

    query = query
      .where('users.date_of_birth', '<=', maxBirthDate)
      .where('users.date_of_birth', '>=', minBirthDate);

    // Apply gender filter
    if (!preferences.genderPreference.includes('all')) {
      query = query.whereIn('users.gender', preferences.genderPreference);
    }

    // If travel mode is enabled, filter by destination location
    // Otherwise filter by user's location
    // Note: In production, use PostGIS for proper geospatial queries

    const candidates = await query
      .select(
        'users.id',
        'users.first_name',
        'users.date_of_birth',
        'users.gender',
        'users.is_verified',
        'users.subscription_tier',
        'users.last_active_at',
        'profiles.bio',
        'profiles.interests',
        'profiles.latitude',
        'profiles.longitude'
      )
      .limit(limit);

    return candidates;
  }

  /**
   * Calculate matching features
   */
  private async calculateFeatures(
    user: any,
    candidate: any,
    preferences: UserPreferences
  ): Promise<MatchFeatures> {
    // Age compatibility
    const userAge = this.calculateAge(user.date_of_birth);
    const candidateAge = this.calculateAge(candidate.date_of_birth);
    const ageDiff = Math.abs(userAge - candidateAge);
    const ageCompatibility = Math.max(0, 1 - (ageDiff / 20)); // Max 20 year difference

    // Distance score (closer is better)
    const distance = this.calculateDistance(
      user.latitude, user.longitude,
      candidate.latitude, candidate.longitude
    );
    const distanceScore = Math.max(0, 1 - (distance / preferences.maxDistance));

    // Interest overlap
    const userInterests = user.interests || [];
    const candidateInterests = candidate.interests || [];
    const commonInterests = userInterests.filter((i: string) =>
      candidateInterests.includes(i)
    );
    const interestOverlap = userInterests.length > 0
      ? commonInterests.length / userInterests.length
      : 0;

    // Activity level
    const activityLevel = await this.calculateActivityLevel(candidate.id);

    // Response rate
    const responseRate = await this.calculateResponseRate(candidate.id);

    // Profile quality (based on completeness and photos)
    const profileQuality = await this.calculateProfileQuality(candidate.id);

    // Verification bonus
    const verificationBonus = candidate.is_verified ? 1 : 0.5;

    // Behavioral match (based on past interactions)
    const behavioralMatch = await this.calculateBehavioralMatch(user.id, candidate.id);

    return {
      ageCompatibility,
      distanceScore,
      interestOverlap,
      activityLevel,
      responseRate,
      profileQuality,
      verificationBonus,
      behavioralMatch,
    };
  }

  /**
   * Calculate overall compatibility score
   */
  private calculateCompatibilityScore(features: MatchFeatures): number {
    let score = 0;

    for (const [feature, weight] of Object.entries(FEATURE_WEIGHTS)) {
      score += (features[feature as keyof MatchFeatures] || 0) * weight;
    }

    // Normalize to 0-100 scale
    return Math.round(score * 100);
  }

  /**
   * Get boost multiplier for a user
   */
  private async getBoostMultiplier(userId: string): Promise<number> {
    const activeBoost = await db('boosts')
      .where('user_id', userId)
      .where('status', 'active')
      .where('expires_at', '>', new Date())
      .first();

    return activeBoost ? activeBoost.visibility_multiplier : 1;
  }

  /**
   * Calculate user's activity level
   */
  private async calculateActivityLevel(userId: string): Promise<number> {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const activeDays = await db('user_behavior_logs')
      .where('user_id', userId)
      .where('created_at', '>', weekAgo)
      .select(db.raw('COUNT(DISTINCT DATE(created_at)) as days'))
      .first();

    const days = Number(activeDays?.days || 0);

    for (const [, threshold] of Object.entries(ACTIVITY_THRESHOLDS)) {
      if (days >= threshold.minDaysActive) {
        return threshold.score;
      }
    }

    return 0.2;
  }

  /**
   * Calculate response rate
   */
  private async calculateResponseRate(userId: string): Promise<number> {
    const stats = await db('messages')
      .where('receiver_id', userId)
      .select(
        db.raw('COUNT(*) as total_received'),
        db.raw('COUNT(DISTINCT conversation_id) as conversations')
      )
      .first();

    const responded = await db('messages')
      .where('sender_id', userId)
      .select(db.raw('COUNT(DISTINCT conversation_id) as responded'))
      .first();

    if (!stats?.conversations || Number(stats.conversations) === 0) {
      return 0.5; // Neutral score for new users
    }

    return Math.min(1, Number(responded?.responded || 0) / Number(stats.conversations));
  }

  /**
   * Calculate profile quality score
   */
  private async calculateProfileQuality(userId: string): Promise<number> {
    let score = 0;

    // Check photos (up to 0.4)
    const photoCount = await db('profile_photos')
      .where('user_id', userId)
      .where('moderation_status', 'approved')
      .count('id as count')
      .first();

    score += Math.min(0.4, (Number(photoCount?.count || 0) / 6) * 0.4);

    // Check bio (up to 0.2)
    const profile = await db('profiles')
      .where('user_id', userId)
      .select('bio')
      .first();

    if (profile?.bio && profile.bio.length > 50) {
      score += 0.2;
    } else if (profile?.bio) {
      score += 0.1;
    }

    // Check interests (up to 0.2)
    const interests = profile?.interests || [];
    score += Math.min(0.2, (interests.length / 5) * 0.2);

    // Check prompts (up to 0.2)
    const promptCount = await db('user_prompts')
      .where('user_id', userId)
      .count('id as count')
      .first();

    score += Math.min(0.2, (Number(promptCount?.count || 0) / 3) * 0.2);

    return score;
  }

  /**
   * Calculate behavioral match based on past interactions
   */
  private async calculateBehavioralMatch(userId: string, candidateId: string): Promise<number> {
    // In a real ML system, this would use a trained model
    // For now, use a simplified heuristic

    // Check if candidate liked users similar to the requesting user
    const userInterests = await db('profiles')
      .where('user_id', userId)
      .select('interests')
      .first();

    // Check candidate's like patterns
    const candidateLikes = await db('swipes')
      .where('user_id', candidateId)
      .whereIn('action', ['like', 'super_like'])
      .limit(50);

    if (candidateLikes.length === 0) {
      return 0.5; // Neutral for new users
    }

    // This is a simplified version - in production, use ML model
    return 0.6 + Math.random() * 0.3;
  }

  /**
   * Generate daily picks
   */
  private async generateDailyPicks(userId: string): Promise<DailyPick[]> {
    const picks: DailyPick[] = [];
    const expiresAt = new Date();
    expiresAt.setHours(23, 59, 59, 999);

    // Get top recommendations
    const recommendations = await this.getRecommendations(userId, 10, 0);

    // Top Pick - highest compatibility
    if (recommendations.length > 0) {
      picks.push({
        userId: recommendations[0].userId,
        pickType: 'top_pick',
        score: recommendations[0].compatibilityScore,
        reason: 'Your top match for today based on compatibility',
        expiresAt,
      });
    }

    // New on Flamoral - recently joined users
    const newUsers = await db('users')
      .where('created_at', '>', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
      .where('is_active', true)
      .whereNot('id', userId)
      .limit(1);

    if (newUsers.length > 0) {
      picks.push({
        userId: newUsers[0].id,
        pickType: 'new_match',
        score: 75,
        reason: 'New to Flamoral and might be your match',
        expiresAt,
      });
    }

    // Common interests pick
    if (recommendations.length > 2) {
      const commonInterestPick = recommendations.find(r => r.features.interestOverlap > 0.5);
      if (commonInterestPick) {
        picks.push({
          userId: commonInterestPick.userId,
          pickType: 'common_interest',
          score: commonInterestPick.compatibilityScore,
          reason: 'You share multiple interests',
          expiresAt,
        });
      }
    }

    return picks;
  }

  /**
   * Update behavioral model
   */
  private async updateBehavioralModel(
    userId: string,
    targetUserId: string,
    interactionType: string
  ): Promise<void> {
    // In production, this would update ML models
    // For now, just log for future analysis
    logger.debug(`ML: User ${userId} ${interactionType} ${targetUserId}`);
  }

  /**
   * Generate compatibility insights
   */
  private generateCompatibilityInsights(
    features: MatchFeatures,
    commonInterests: string[]
  ): string[] {
    const insights: string[] = [];

    if (features.ageCompatibility > 0.8) {
      insights.push('You\'re in a similar life stage');
    }

    if (features.distanceScore > 0.8) {
      insights.push('They\'re nearby and easy to meet');
    }

    if (commonInterests.length > 2) {
      insights.push(`You share ${commonInterests.length} interests`);
    }

    if (features.activityLevel > 0.8) {
      insights.push('They\'re very active on the app');
    }

    if (features.responseRate > 0.8) {
      insights.push('They respond to most messages');
    }

    if (features.verificationBonus > 0.8) {
      insights.push('Their profile is verified');
    }

    return insights;
  }

  /**
   * Calculate age from date of birth
   */
  private calculateAge(dateOfBirth: Date): number {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  }

  /**
   * Calculate distance between two points (Haversine formula)
   */
  private calculateDistance(
    lat1: number, lon1: number,
    lat2: number, lon2: number
  ): number {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 100; // Default to max distance

    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  /**
   * Map database pick to DailyPick
   */
  private mapDbPickToPick(dbPick: any): DailyPick {
    return {
      userId: dbPick.picked_user_id,
      pickType: dbPick.pick_type,
      score: dbPick.score,
      reason: dbPick.reason,
      expiresAt: dbPick.expires_at,
    };
  }
}

export const mlMatchingService = new MLMatchingService();
