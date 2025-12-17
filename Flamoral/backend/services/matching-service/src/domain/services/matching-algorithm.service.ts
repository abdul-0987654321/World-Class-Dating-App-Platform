/**
 * Matching Algorithm Service
 * Implements compatibility scoring based on multiple factors
 */

import { UserProfile, UserPreferences, MatchScore } from '../../types';
import { createLogger } from '@flamoral/shared';

const logger = createLogger('matching-algorithm');

export class MatchingAlgorithmService {
  /**
   * Calculate compatibility score between two users
   * Score ranges from 0-100
   */
  calculateCompatibility(
    user: UserProfile,
    candidate: UserProfile,
    userPreferences: UserPreferences,
    candidatePreferences: UserPreferences
  ): MatchScore {
    try {
      // Validate inputs
      if (!user || !candidate || !userPreferences || !candidatePreferences) {
        throw new Error('Invalid input: missing user, candidate, or preferences data');
      }

      if (!candidate.userId) {
        throw new Error('Invalid candidate: missing userId');
      }

      const scores = {
        distance: this.calculateDistanceScore(user.location, candidate.location, userPreferences.maxDistance),
        interests: this.calculateInterestScore(user.interests, candidate.interests),
        activity: this.calculateActivityScore(user, candidate),
        preferences: this.calculatePreferenceScore(user, candidate, userPreferences, candidatePreferences),
      };

      // If preferences score is 0, this is a hard filter violation
      if (scores.preferences === 0) {
        return {
          userId: candidate.userId,
          score: 0,
          factors: scores,
        };
      }

      // Weighted average (distance and preferences are more important)
      const totalScore =
        scores.distance * 0.30 +
        scores.interests * 0.25 +
        scores.activity * 0.15 +
        scores.preferences * 0.30;

      // Apply premium boost (max 10% increase)
      const premiumMultiplier = user.premium || candidate.premium ? 1.1 : 1.0;
      const finalScore = totalScore * premiumMultiplier;

      return {
        userId: candidate.userId,
        score: Math.min(100, Math.max(0, Math.round(finalScore))),
        factors: scores,
      };
    } catch (error) {
      logger.error('Failed to calculate compatibility', error);
      throw error;
    }
  }

  /**
   * Calculate distance score (0-100)
   * Closer is better
   */
  private calculateDistanceScore(
    userLocation: { latitude: number; longitude: number },
    candidateLocation: { latitude: number; longitude: number },
    maxDistance: number
  ): number {
    const distance = this.calculateDistance(userLocation, candidateLocation);

    if (distance > maxDistance) {
      return 0;
    }

    // Score decreases linearly with distance
    const score = 100 - (distance / maxDistance) * 100;
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   * Returns distance in kilometers
   */
  private calculateDistance(
    loc1: { latitude: number; longitude: number },
    loc2: { latitude: number; longitude: number }
  ): number {
    // Validate coordinates
    if (!loc1 || !loc2 ||
        typeof loc1.latitude !== 'number' || typeof loc1.longitude !== 'number' ||
        typeof loc2.latitude !== 'number' || typeof loc2.longitude !== 'number') {
      logger.warn('Invalid location coordinates provided');
      return Infinity; // Return max distance if invalid
    }

    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(loc2.latitude - loc1.latitude);
    const dLon = this.toRadians(loc2.longitude - loc1.longitude);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(loc1.latitude)) *
        Math.cos(this.toRadians(loc2.latitude)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return distance;
  }

  /**
   * Calculate interest compatibility score (0-100)
   * More shared interests = higher score
   * Uses Jaccard similarity coefficient
   */
  private calculateInterestScore(userInterests: string[], candidateInterests: string[]): number {
    // Handle null/undefined arrays
    const safeUserInterests = Array.isArray(userInterests) ? userInterests : [];
    const safeCandidateInterests = Array.isArray(candidateInterests) ? candidateInterests : [];

    if (safeUserInterests.length === 0 || safeCandidateInterests.length === 0) {
      return 50; // Neutral score if no interests
    }

    // Case-insensitive comparison
    const normalizedUserInterests = safeUserInterests.map(i => i.toLowerCase());
    const normalizedCandidateInterests = safeCandidateInterests.map(i => i.toLowerCase());

    const sharedInterests = normalizedUserInterests.filter((interest) =>
      normalizedCandidateInterests.includes(interest)
    );

    const totalUniqueInterests = new Set([...normalizedUserInterests, ...normalizedCandidateInterests]).size;

    // Prevent division by zero
    if (totalUniqueInterests === 0) {
      return 50;
    }

    // Jaccard similarity coefficient
    const jaccardSimilarity = sharedInterests.length / totalUniqueInterests;

    // Convert to 0-100 scale with amplification for better matching
    const score = jaccardSimilarity * 100 * 1.5;

    return Math.min(100, Math.round(score));
  }

  /**
   * Calculate activity score (0-100)
   * Verified and premium users get higher scores
   */
  private calculateActivityScore(user: UserProfile, candidate: UserProfile): number {
    let score = 50; // Base score

    // Verified users get boost
    if (candidate.verified) score += 25;
    if (user.verified && candidate.verified) score += 10;

    // Photo count matters (handle null/undefined)
    const photoCount = Array.isArray(candidate.photos) ? candidate.photos.length : 0;
    const photoScore = Math.min(20, photoCount * 4);
    score += photoScore;

    // Bio completeness (handle null/undefined)
    if (candidate.bio && typeof candidate.bio === 'string' && candidate.bio.length > 50) {
      score += 15;
    }

    return Math.min(100, score);
  }

  /**
   * Calculate preference compatibility (0-100)
   * Checks if users meet each other's preferences
   */
  private calculatePreferenceScore(
    user: UserProfile,
    candidate: UserProfile,
    userPreferences: UserPreferences,
    candidatePreferences: UserPreferences
  ): number {
    let score = 100;

    // Validate inputs
    if (!user || !candidate || !userPreferences || !candidatePreferences) {
      return 0;
    }

    // Age preference check - must have valid ages
    if (typeof candidate.age !== 'number' || typeof user.age !== 'number') {
      return 0;
    }

    if (candidate.age < userPreferences.ageMin || candidate.age > userPreferences.ageMax) {
      score -= 50;
    }

    if (user.age < candidatePreferences.ageMin || user.age > candidatePreferences.ageMax) {
      score -= 50;
    }

    // Gender preference check - handle null/undefined arrays
    const userGenderPref = Array.isArray(userPreferences.genderPreference) ? userPreferences.genderPreference : [];
    const candidateGenderPref = Array.isArray(candidatePreferences.genderPreference) ? candidatePreferences.genderPreference : [];

    if (
      userGenderPref.length > 0 &&
      !userGenderPref.includes('any') &&
      !userGenderPref.includes(candidate.gender)
    ) {
      return 0; // Hard filter
    }

    if (
      candidateGenderPref.length > 0 &&
      !candidateGenderPref.includes('any') &&
      !candidateGenderPref.includes(user.gender)
    ) {
      return 0; // Hard filter
    }

    return Math.max(0, score);
  }

  /**
   * Convert degrees to radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Batch calculate scores for multiple candidates
   */
  async calculateBatchScores(
    user: UserProfile,
    candidates: UserProfile[],
    userPreferences: UserPreferences,
    candidatePreferences: Map<string, UserPreferences>
  ): Promise<MatchScore[]> {
    try {
      // Validate inputs
      if (!user || !Array.isArray(candidates) || !userPreferences) {
        logger.error('Invalid inputs for batch scoring');
        return [];
      }

      const scores: MatchScore[] = [];

      for (const candidate of candidates) {
        try {
          // Skip invalid candidates
          if (!candidate || !candidate.userId) {
            continue;
          }

          const candPrefs = candidatePreferences.get(candidate.userId) || {
            ageMin: 18,
            ageMax: 99,
            maxDistance: 50,
            genderPreference: ['any'],
          };

          const score = this.calculateCompatibility(user, candidate, userPreferences, candPrefs);
          scores.push(score);
        } catch (error) {
          logger.warn(`Failed to calculate compatibility for candidate ${candidate.userId}`, error);
          // Continue with other candidates
        }
      }

      // Sort by score descending, then filter out zero scores
      return scores
        .filter(s => s.score > 0)
        .sort((a, b) => b.score - a.score);
    } catch (error) {
      logger.error('Failed to calculate batch scores', error);
      throw error;
    }
  }
}

export default new MatchingAlgorithmService();
