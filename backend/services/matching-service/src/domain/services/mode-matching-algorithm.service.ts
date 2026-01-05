/**
 * Mode-Specific Matching Algorithm Service
 * Implements different matching strategies for Date, Friends, and Network modes
 */

import { UserMode, UserProfile, MatchScore } from '../../types';

export class ModeMatchingAlgorithmService {
  /**
   * Calculate compatibility score based on mode
   */
  calculateModeScore(
    currentUser: UserProfile,
    targetUser: UserProfile,
    mode: UserMode
  ): MatchScore {
    switch (mode) {
      case UserMode.DATE:
        return this.calculateDateModeScore(currentUser, targetUser);
      case UserMode.FRIENDS:
        return this.calculateFriendsModeScore(currentUser, targetUser);
      case UserMode.NETWORK:
        return this.calculateNetworkModeScore(currentUser, targetUser);
      default:
        return this.calculateDateModeScore(currentUser, targetUser);
    }
  }

  /**
   * Date Mode Scoring
   * Focus: Romantic compatibility, attraction, relationship goals
   */
  private calculateDateModeScore(currentUser: UserProfile, targetUser: UserProfile): MatchScore {
    const factors = {
      distance: this.calculateDistanceScore(currentUser.location, targetUser.location),
      interests: this.calculateInterestsScore(currentUser.interests, targetUser.interests),
      activity: this.calculateActivityScore(targetUser),
      preferences: this.calculatePreferencesScore(currentUser, targetUser),
    };

    // Date mode weights: Distance and preferences are most important
    const weights = {
      distance: 0.3,
      interests: 0.25,
      activity: 0.2,
      preferences: 0.25,
    };

    const score = this.calculateWeightedScore(factors, weights);

    return {
      userId: targetUser.userId,
      score,
      factors,
    };
  }

  /**
   * Friends Mode Scoring
   * Focus: Shared activities, hobbies, platonic compatibility
   * Gender-neutral, activity-based matching
   */
  private calculateFriendsModeScore(currentUser: UserProfile, targetUser: UserProfile): MatchScore {
    const factors = {
      distance: this.calculateDistanceScore(currentUser.location, targetUser.location),
      interests: this.calculateInterestsScore(currentUser.interests, targetUser.interests, true), // Higher weight on exact matches
      activity: this.calculateActivityScore(targetUser),
      preferences: 0.8, // Less strict on preferences in friends mode
    };

    // Friends mode weights: Interests and proximity are most important
    const weights = {
      distance: 0.35, // Higher weight - want friends nearby
      interests: 0.4, // Highest weight - shared activities matter most
      activity: 0.15,
      preferences: 0.1, // Lower weight - less strict filtering
    };

    const score = this.calculateWeightedScore(factors, weights);

    return {
      userId: targetUser.userId,
      score,
      factors,
    };
  }

  /**
   * Network Mode Scoring
   * Focus: Professional compatibility, industry match, career goals
   * Skills, experience, and professional interests
   */
  private calculateNetworkModeScore(currentUser: UserProfile, targetUser: UserProfile): MatchScore {
    const factors = {
      distance: this.calculateDistanceScore(currentUser.location, targetUser.location, 100), // Wider radius for networking
      interests: this.calculateProfessionalInterestsScore(
        currentUser.interests,
        targetUser.interests
      ),
      activity: this.calculateActivityScore(targetUser),
      preferences: this.calculateNetworkPreferencesScore(currentUser, targetUser),
    };

    // Network mode weights: Professional alignment and preferences matter most
    const weights = {
      distance: 0.15, // Lower weight - willing to network remotely
      interests: 0.35, // Professional/industry overlap
      activity: 0.15,
      preferences: 0.35, // Connection type (mentor/mentee/peer/etc)
    };

    const score = this.calculateWeightedScore(factors, weights);

    return {
      userId: targetUser.userId,
      score,
      factors,
    };
  }

  /**
   * Calculate distance score (normalized 0-1)
   */
  private calculateDistanceScore(
    location1: { latitude: number; longitude: number },
    location2: { latitude: number; longitude: number },
    maxDistance: number = 50
  ): number {
    const distance = this.calculateDistance(location1, location2);

    if (distance > maxDistance) {
      return 0;
    }

    // Linear decay: closer = higher score
    return 1 - distance / maxDistance;
  }

  /**
   * Calculate Haversine distance between two points
   */
  private calculateDistance(
    loc1: { latitude: number; longitude: number },
    loc2: { latitude: number; longitude: number }
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(loc2.latitude - loc1.latitude);
    const dLon = this.toRad(loc2.longitude - loc1.longitude);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(loc1.latitude)) *
        Math.cos(this.toRad(loc2.latitude)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }

  /**
   * Calculate interests overlap score
   */
  private calculateInterestsScore(
    interests1: string[],
    interests2: string[],
    strictMatch: boolean = false
  ): number {
    if (interests1.length === 0 || interests2.length === 0) {
      return 0.5; // Neutral score if no interests
    }

    const common = interests1.filter((i) =>
      interests2.some((j) => j.toLowerCase() === i.toLowerCase())
    );

    const totalUnique = new Set([...interests1, ...interests2]).size;
    const overlapRatio = common.length / Math.max(interests1.length, interests2.length);

    // In friends mode, reward exact matches more heavily
    if (strictMatch) {
      return Math.min(overlapRatio * 1.5, 1.0);
    }

    return overlapRatio;
  }

  /**
   * Calculate professional interests score (for network mode)
   */
  private calculateProfessionalInterestsScore(interests1: string[], interests2: string[]): number {
    // In network mode, we want some overlap but also complementary skills
    const overlapScore = this.calculateInterestsScore(interests1, interests2);

    // Bonus for diversity (complementary skills)
    const uniqueCount = new Set([...interests1, ...interests2]).size;
    const totalCount = interests1.length + interests2.length;
    const diversityBonus = (uniqueCount / totalCount) * 0.3;

    return Math.min(overlapScore + diversityBonus, 1.0);
  }

  /**
   * Calculate activity score based on user's last activity
   */
  private calculateActivityScore(user: UserProfile): number {
    // This would typically check last_active_at from the database
    // For now, return a default score based on verification status
    return user.verified ? 0.8 : 0.5;
  }

  /**
   * Calculate preferences score
   */
  private calculatePreferencesScore(currentUser: UserProfile, targetUser: UserProfile): number {
    // This would check if the target user meets current user's preferences
    // (age, gender, etc.)
    return 0.8; // Placeholder
  }

  /**
   * Calculate network-specific preferences (mentor/mentee/peer matching)
   */
  private calculateNetworkPreferencesScore(
    currentUser: UserProfile,
    targetUser: UserProfile
  ): number {
    // This would check professional compatibility:
    // - Are they in complementary roles? (mentor/mentee)
    // - Same industry/field?
    // - Similar experience level? (for peer connections)
    return 0.7; // Placeholder
  }

  /**
   * Calculate final weighted score
   */
  private calculateWeightedScore(
    factors: { [key: string]: number },
    weights: { [key: string]: number }
  ): number {
    let totalScore = 0;
    let totalWeight = 0;

    for (const key in factors) {
      if (weights[key] !== undefined) {
        totalScore += factors[key] * weights[key];
        totalWeight += weights[key];
      }
    }

    // Normalize to 0-100
    return totalWeight > 0 ? (totalScore / totalWeight) * 100 : 0;
  }

  /**
   * Get mode-specific matching criteria description
   */
  getModeMatchingCriteria(mode: UserMode): string {
    switch (mode) {
      case UserMode.DATE:
        return 'Romantic compatibility based on mutual attraction, relationship goals, and preferences';
      case UserMode.FRIENDS:
        return 'Platonic connections based on shared activities, hobbies, and interests';
      case UserMode.NETWORK:
        return 'Professional networking based on industry, skills, and career goals';
      default:
        return 'General compatibility';
    }
  }

  /**
   * Get recommended filters for each mode
   */
  getRecommendedFilters(mode: UserMode): string[] {
    switch (mode) {
      case UserMode.DATE:
        return ['age', 'distance', 'gender', 'relationship_goals', 'lifestyle'];
      case UserMode.FRIENDS:
        return ['distance', 'activities', 'interests', 'availability', 'group_size'];
      case UserMode.NETWORK:
        return ['industry', 'profession', 'experience_level', 'connection_type', 'skills'];
      default:
        return [];
    }
  }
}
