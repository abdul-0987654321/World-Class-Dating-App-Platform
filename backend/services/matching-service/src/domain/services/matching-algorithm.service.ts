/**
 * Matching Algorithm Service
 * Implements compatibility scoring based on multiple factors
 */

import { UserProfile, UserPreferences, MatchScore } from '../../types';
import { createLogger } from '@flamoral/backend-shared';

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
      const scores = {
        distance: this.calculateDistanceScore(user.location, candidate.location, userPreferences.maxDistance),
        interests: this.calculateInterestScore(user.interests, candidate.interests),
        activity: this.calculateActivityScore(user, candidate),
        preferences: this.calculatePreferenceScore(user, candidate, userPreferences, candidatePreferences),
      };

      // Weighted average (distance and preferences are more important)
      const totalScore =
        scores.distance * 0.30 +
        scores.interests * 0.25 +
        scores.activity * 0.15 +
        scores.preferences * 0.30;

      // Apply premium boost
      const finalScore = user.premium || candidate.premium ? totalScore * 1.1 : totalScore;

      return {
        userId: candidate.userId,
        score: Math.min(100, Math.round(finalScore)),
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
   */
  private calculateInterestScore(userInterests: string[], candidateInterests: string[]): number {
    if (userInterests.length === 0 || candidateInterests.length === 0) {
      return 50; // Neutral score if no interests
    }

    const sharedInterests = userInterests.filter((interest) =>
      candidateInterests.includes(interest)
    );

    const totalUniqueInterests = new Set([...userInterests, ...candidateInterests]).size;
    const score = (sharedInterests.length / totalUniqueInterests) * 100;

    return Math.min(100, Math.round(score * 2)); // Amplify importance
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

    // Photo count matters
    const photoScore = Math.min(20, candidate.photos.length * 4);
    score += photoScore;

    // Bio completeness
    if (candidate.bio && candidate.bio.length > 50) score += 15;

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

    // Age preference check
    if (candidate.age < userPreferences.ageMin || candidate.age > userPreferences.ageMax) {
      score -= 50;
    }

    if (user.age < candidatePreferences.ageMin || user.age > candidatePreferences.ageMax) {
      score -= 50;
    }

    // Gender preference check
    if (
      !userPreferences.genderPreference.includes('any') &&
      !userPreferences.genderPreference.includes(candidate.gender)
    ) {
      return 0; // Hard filter
    }

    if (
      !candidatePreferences.genderPreference.includes('any') &&
      !candidatePreferences.genderPreference.includes(user.gender)
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
      const scores = candidates.map((candidate) => {
        const candPrefs = candidatePreferences.get(candidate.userId) || {
          ageMin: 18,
          ageMax: 99,
          maxDistance: 50,
          genderPreference: ['any'],
        };

        return this.calculateCompatibility(user, candidate, userPreferences, candPrefs);
      });

      // Sort by score descending
      return scores.sort((a, b) => b.score - a.score);
    } catch (error) {
      logger.error('Failed to calculate batch scores', error);
      throw error;
    }
  }
}

export default new MatchingAlgorithmService();
