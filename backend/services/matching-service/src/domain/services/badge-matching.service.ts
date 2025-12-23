/**
 * Badge Matching Service
 * Enhances matching algorithm with interest and intention badge compatibility
 */

import { createLogger } from '@flamoral/backend-shared';

const logger = createLogger('badge-matching');

export interface BadgeProfile {
  interestBadges: string[]; // Array of badge IDs
  intentionBadges: Array<{
    badge_id: string;
    priority: 1 | 2;
  }>;
}

export interface BadgeMatchScore {
  interestScore: number; // 0-100
  intentionScore: number; // 0-100
  sharedInterests: number; // Count of shared interest badges
  hasCompatibleIntention: boolean; // True if any intention badges match
}

export class BadgeMatchingService {
  /**
   * Calculate badge compatibility score between two users
   * Returns scores from 0-100 for both interests and intentions
   */
  calculateBadgeCompatibility(
    userBadges: BadgeProfile,
    candidateBadges: BadgeProfile
  ): BadgeMatchScore {
    try {
      const interestScore = this.calculateInterestBadgeScore(
        userBadges.interestBadges,
        candidateBadges.interestBadges
      );

      const intentionScore = this.calculateIntentionBadgeScore(
        userBadges.intentionBadges,
        candidateBadges.intentionBadges
      );

      const sharedInterests = this.countSharedInterestBadges(
        userBadges.interestBadges,
        candidateBadges.interestBadges
      );

      const hasCompatibleIntention = this.checkIntentionCompatibility(
        userBadges.intentionBadges,
        candidateBadges.intentionBadges
      );

      return {
        interestScore,
        intentionScore,
        sharedInterests,
        hasCompatibleIntention,
      };
    } catch (error) {
      logger.error('Failed to calculate badge compatibility', error);
      throw error;
    }
  }

  /**
   * Calculate interest badge compatibility score (0-100)
   * Higher score = more shared interests
   */
  private calculateInterestBadgeScore(
    userBadges: string[],
    candidateBadges: string[]
  ): number {
    if (userBadges.length === 0 || candidateBadges.length === 0) {
      return 50; // Neutral score if no badges selected
    }

    const sharedBadges = this.countSharedInterestBadges(userBadges, candidateBadges);

    // Calculate Jaccard similarity (intersection over union)
    const union = new Set([...userBadges, ...candidateBadges]).size;
    const jaccardScore = (sharedBadges / union) * 100;

    // Weight by number of shared badges (more shared = better)
    const sharedBonus = Math.min(30, sharedBadges * 10);

    const totalScore = jaccardScore * 0.7 + sharedBonus;
    return Math.min(100, Math.round(totalScore));
  }

  /**
   * Calculate intention badge compatibility score (0-100)
   * Checks if users have matching relationship intentions
   */
  private calculateIntentionBadgeScore(
    userBadges: Array<{ badge_id: string; priority: 1 | 2 }>,
    candidateBadges: Array<{ badge_id: string; priority: 1 | 2 }>
  ): number {
    if (userBadges.length === 0 || candidateBadges.length === 0) {
      return 50; // Neutral score if no intentions set
    }

    // Check for exact matches
    const userBadgeIds = userBadges.map(b => b.badge_id);
    const candidateBadgeIds = candidateBadges.map(b => b.badge_id);

    const hasSharedIntention = userBadgeIds.some(id => candidateBadgeIds.includes(id));

    if (!hasSharedIntention) {
      return 20; // Low score if no matching intentions
    }

    // Calculate score based on priority matching
    let score = 60; // Base score for any match

    // Primary intention match (both have same primary intention)
    const userPrimary = userBadges.find(b => b.priority === 1);
    const candidatePrimary = candidateBadges.find(b => b.priority === 1);

    if (userPrimary && candidatePrimary && userPrimary.badge_id === candidatePrimary.badge_id) {
      score += 40; // High bonus for matching primary intentions
    } else {
      // Check if either user's primary matches the other's secondary
      const userSecondary = userBadges.find(b => b.priority === 2);
      const candidateSecondary = candidateBadges.find(b => b.priority === 2);

      if (
        (userPrimary && (candidatePrimary?.badge_id === userPrimary.badge_id ||
                         candidateSecondary?.badge_id === userPrimary.badge_id)) ||
        (candidatePrimary && (userPrimary?.badge_id === candidatePrimary.badge_id ||
                              userSecondary?.badge_id === candidatePrimary.badge_id))
      ) {
        score += 20; // Moderate bonus for partial match
      }
    }

    return Math.min(100, score);
  }

  /**
   * Count number of shared interest badges
   */
  private countSharedInterestBadges(
    userBadges: string[],
    candidateBadges: string[]
  ): number {
    return userBadges.filter(badge => candidateBadges.includes(badge)).length;
  }

  /**
   * Check if users have at least one compatible intention
   */
  private checkIntentionCompatibility(
    userBadges: Array<{ badge_id: string; priority: 1 | 2 }>,
    candidateBadges: Array<{ badge_id: string; priority: 1 | 2 }>
  ): boolean {
    if (userBadges.length === 0 || candidateBadges.length === 0) {
      return true; // No restrictions if no intentions set
    }

    const userBadgeIds = userBadges.map(b => b.badge_id);
    const candidateBadgeIds = candidateBadges.map(b => b.badge_id);

    return userBadgeIds.some(id => candidateBadgeIds.includes(id));
  }

  /**
   * Filter candidates by intention compatibility
   * Returns only candidates with matching intentions (if set)
   */
  filterByIntentionCompatibility(
    userBadges: BadgeProfile,
    candidates: Array<{ userId: string; badges: BadgeProfile }>
  ): string[] {
    // If user has no intentions set, don't filter
    if (userBadges.intentionBadges.length === 0) {
      return candidates.map(c => c.userId);
    }

    return candidates
      .filter(candidate =>
        this.checkIntentionCompatibility(
          userBadges.intentionBadges,
          candidate.badges.intentionBadges
        )
      )
      .map(c => c.userId);
  }

  /**
   * Filter candidates by minimum shared interests
   */
  filterBySharedInterests(
    userBadges: BadgeProfile,
    candidates: Array<{ userId: string; badges: BadgeProfile }>,
    minSharedInterests: number = 1
  ): string[] {
    return candidates
      .filter(candidate => {
        const shared = this.countSharedInterestBadges(
          userBadges.interestBadges,
          candidate.badges.interestBadges
        );
        return shared >= minSharedInterests;
      })
      .map(c => c.userId);
  }

  /**
   * Boost match score based on badge compatibility
   * Adds up to +20 points to the base match score
   */
  calculateBadgeBoost(badgeScore: BadgeMatchScore): number {
    let boost = 0;

    // Interest badge boost (0-10 points)
    if (badgeScore.interestScore >= 80) {
      boost += 10;
    } else if (badgeScore.interestScore >= 60) {
      boost += 7;
    } else if (badgeScore.interestScore >= 40) {
      boost += 4;
    }

    // Intention badge boost (0-10 points)
    if (badgeScore.hasCompatibleIntention) {
      if (badgeScore.intentionScore >= 90) {
        boost += 10;
      } else if (badgeScore.intentionScore >= 70) {
        boost += 7;
      } else if (badgeScore.intentionScore >= 50) {
        boost += 4;
      }
    }

    return Math.min(20, boost);
  }

  /**
   * Get filter query for interest badges
   * Used by discovery/recommendation services
   */
  buildInterestBadgeFilter(badgeIds: string[]): any {
    if (badgeIds.length === 0) {
      return null;
    }

    return {
      user_interest_badges: {
        badge_id: {
          $in: badgeIds,
        },
      },
    };
  }

  /**
   * Get filter query for intention badges
   * Used by discovery/recommendation services
   */
  buildIntentionBadgeFilter(badgeIds: string[]): any {
    if (badgeIds.length === 0) {
      return null;
    }

    return {
      user_intention_badges: {
        badge_id: {
          $in: badgeIds,
        },
      },
    };
  }
}

export default new BadgeMatchingService();
