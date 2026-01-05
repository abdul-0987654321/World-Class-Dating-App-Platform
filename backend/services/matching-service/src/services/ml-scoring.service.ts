import logger from '../utils/logger';

export interface MLScoringInput {
  userId: string;
  targetUserId: string;
  userProfile: any;
  targetProfile: any;
  userPreferences: any;
  targetPreferences: any;
  interactionHistory?: any;
  contextualData?: any;
}

export interface MLScore {
  overallScore: number; // 0-100
  breakdown: {
    profileCompatibility: number;
    interestAlignment: number;
    behavioralMatch: number;
    locationFit: number;
    activityPattern: number;
    conversationLikelihood: number;
  };
  confidence: number; // 0-1
  reasons: string[];
  mlModelVersion: string;
}

export interface MLModelHooks {
  preProcessing?: (input: MLScoringInput) => Promise<any>;
  postProcessing?: (score: MLScore) => Promise<MLScore>;
  featureExtraction?: (input: MLScoringInput) => Promise<any>;
}

class MLScoringService {
  private modelVersion = '1.0.0';
  private hooks: MLModelHooks = {};

  /**
   * Calculate ML-based compatibility score
   */
  async calculateMLScore(input: MLScoringInput): Promise<MLScore> {
    try {
      // Pre-processing hook
      let processedInput = input;
      if (this.hooks.preProcessing) {
        processedInput = await this.hooks.preProcessing(input);
      }

      // Extract features
      const features = await this.extractFeatures(processedInput);

      // Calculate individual scores
      const breakdown = {
        profileCompatibility: this.calculateProfileCompatibility(features),
        interestAlignment: this.calculateInterestAlignment(features),
        behavioralMatch: this.calculateBehavioralMatch(features),
        locationFit: this.calculateLocationFit(features),
        activityPattern: this.calculateActivityPattern(features),
        conversationLikelihood: this.calculateConversationLikelihood(features),
      };

      // Calculate weighted overall score
      const weights = {
        profileCompatibility: 0.25,
        interestAlignment: 0.2,
        behavioralMatch: 0.2,
        locationFit: 0.15,
        activityPattern: 0.1,
        conversationLikelihood: 0.1,
      };

      const overallScore = Math.round(
        breakdown.profileCompatibility * weights.profileCompatibility +
          breakdown.interestAlignment * weights.interestAlignment +
          breakdown.behavioralMatch * weights.behavioralMatch +
          breakdown.locationFit * weights.locationFit +
          breakdown.activityPattern * weights.activityPattern +
          breakdown.conversationLikelihood * weights.conversationLikelihood
      );

      // Generate reasons
      const reasons = this.generateReasons(breakdown);

      // Calculate confidence
      const confidence = this.calculateConfidence(features, breakdown);

      let score: MLScore = {
        overallScore,
        breakdown,
        confidence,
        reasons,
        mlModelVersion: this.modelVersion,
      };

      // Post-processing hook
      if (this.hooks.postProcessing) {
        score = await this.hooks.postProcessing(score);
      }

      logger.debug('ML score calculated', {
        userId: input.userId,
        targetUserId: input.targetUserId,
        overallScore,
        confidence,
      });

      return score;
    } catch (error: any) {
      logger.error('ML scoring failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Batch calculate scores
   */
  async batchCalculateScores(
    userId: string,
    targetUserIds: string[],
    userProfile: any,
    userPreferences: any
  ): Promise<Map<string, MLScore>> {
    const scores = new Map<string, MLScore>();

    // Process in parallel batches
    const batchSize = 10;
    for (let i = 0; i < targetUserIds.length; i += batchSize) {
      const batch = targetUserIds.slice(i, i + batchSize);

      const batchScores = await Promise.all(
        batch.map(async (targetUserId) => {
          try {
            const score = await this.calculateMLScore({
              userId,
              targetUserId,
              userProfile,
              targetProfile: await this.fetchProfile(targetUserId),
              userPreferences,
              targetPreferences: await this.fetchPreferences(targetUserId),
            });

            return { targetUserId, score };
          } catch (error) {
            logger.error('Failed to score user', { targetUserId, error });
            return null;
          }
        })
      );

      batchScores.forEach((result) => {
        if (result) {
          scores.set(result.targetUserId, result.score);
        }
      });
    }

    return scores;
  }

  /**
   * Register ML model hooks
   */
  registerHooks(hooks: MLModelHooks): void {
    this.hooks = { ...this.hooks, ...hooks };
    logger.info('ML model hooks registered');
  }

  /**
   * Extract features for ML model
   */
  private async extractFeatures(input: MLScoringInput): Promise<any> {
    if (this.hooks.featureExtraction) {
      return await this.hooks.featureExtraction(input);
    }

    // Default feature extraction
    return {
      user: this.extractUserFeatures(input.userProfile, input.userPreferences),
      target: this.extractUserFeatures(input.targetProfile, input.targetPreferences),
      interaction: input.interactionHistory || {},
      context: input.contextualData || {},
    };
  }

  /**
   * Extract user features
   */
  private extractUserFeatures(profile: any, preferences: any): any {
    return {
      age: profile.age,
      location: profile.location,
      interests: profile.interests || [],
      education: profile.education,
      occupation: profile.occupation,
      relationshipType: preferences.relationshipType,
      dealBreakers: preferences.dealBreakers || [],
      lifestyle: {
        smoking: profile.smoking,
        drinking: profile.drinking,
        exercise: profile.exercise,
        diet: profile.diet,
      },
    };
  }

  /**
   * Calculate profile compatibility
   */
  private calculateProfileCompatibility(features: any): number {
    let score = 0;
    const { user, target } = features;

    // Age compatibility
    if (user.age && target.age) {
      const ageDiff = Math.abs(user.age - target.age);
      if (ageDiff <= 3) score += 30;
      else if (ageDiff <= 5) score += 25;
      else if (ageDiff <= 10) score += 15;
      else score += 5;
    }

    // Education level
    if (user.education === target.education) {
      score += 20;
    } else {
      score += 10;
    }

    // Relationship type alignment
    if (user.relationshipType === target.relationshipType) {
      score += 30;
    }

    // Lifestyle compatibility
    const lifestyleScore = this.calculateLifestyleCompatibility(user.lifestyle, target.lifestyle);
    score += lifestyleScore * 0.2;

    return Math.min(score, 100);
  }

  /**
   * Calculate interest alignment
   */
  private calculateInterestAlignment(features: any): number {
    const { user, target } = features;
    const userInterests = new Set(user.interests);
    const targetInterests = new Set(target.interests);

    if (userInterests.size === 0 || targetInterests.size === 0) {
      return 50; // Neutral score
    }

    // Calculate Jaccard similarity
    const intersection = new Set([...userInterests].filter((x) => targetInterests.has(x)));
    const union = new Set([...userInterests, ...targetInterests]);

    const similarity = intersection.size / union.size;

    return Math.round(similarity * 100);
  }

  /**
   * Calculate behavioral match
   */
  private calculateBehavioralMatch(features: any): number {
    const { interaction } = features;

    if (!interaction || Object.keys(interaction).length === 0) {
      return 50; // No data, neutral score
    }

    let score = 50;

    // Response rate
    if (interaction.responseRate) {
      score += interaction.responseRate * 0.3;
    }

    // Engagement level
    if (interaction.engagementLevel) {
      score += interaction.engagementLevel * 0.2;
    }

    return Math.min(Math.round(score), 100);
  }

  /**
   * Calculate location fit
   */
  private calculateLocationFit(features: any): number {
    const { user, target } = features;

    if (!user.location || !target.location) {
      return 50;
    }

    const distance = this.calculateDistance(user.location, target.location);

    // Score based on distance (in km)
    if (distance <= 5) return 100;
    if (distance <= 10) return 90;
    if (distance <= 25) return 75;
    if (distance <= 50) return 60;
    if (distance <= 100) return 40;
    if (distance <= 200) return 20;
    return 10;
  }

  /**
   * Calculate activity pattern
   */
  private calculateActivityPattern(features: any): number {
    const { context } = features;

    if (!context.userActivity || !context.targetActivity) {
      return 50;
    }

    // Compare activity times
    const overlap = this.calculateTimeOverlap(
      context.userActivity.activeTimes,
      context.targetActivity.activeTimes
    );

    return Math.round(overlap * 100);
  }

  /**
   * Calculate conversation likelihood
   */
  private calculateConversationLikelihood(features: any): number {
    const { user, target, interaction } = features;

    let score = 50;

    // Profile completeness increases likelihood
    const userCompleteness = this.getProfileCompleteness(user);
    const targetCompleteness = this.getProfileCompleteness(target);
    score += (userCompleteness + targetCompleteness) * 0.15;

    // Past interaction success
    if (interaction?.conversationSuccess) {
      score += interaction.conversationSuccess * 0.3;
    }

    return Math.min(Math.round(score), 100);
  }

  /**
   * Calculate lifestyle compatibility
   */
  private calculateLifestyleCompatibility(lifestyle1: any, lifestyle2: any): number {
    let score = 0;
    let factors = 0;

    const compareFactors = ['smoking', 'drinking', 'exercise', 'diet'];

    for (const factor of compareFactors) {
      if (lifestyle1[factor] && lifestyle2[factor]) {
        factors++;
        if (lifestyle1[factor] === lifestyle2[factor]) {
          score += 25;
        } else {
          // Partial match
          score += 10;
        }
      }
    }

    return factors > 0 ? score / factors : 50;
  }

  /**
   * Calculate distance between locations
   */
  private calculateDistance(loc1: any, loc2: any): number {
    // Haversine formula
    const R = 6371; // Earth's radius in km

    const lat1 = (loc1.latitude * Math.PI) / 180;
    const lat2 = (loc2.latitude * Math.PI) / 180;
    const deltaLat = ((loc2.latitude - loc1.latitude) * Math.PI) / 180;
    const deltaLon = ((loc2.longitude - loc1.longitude) * Math.PI) / 180;

    const a =
      Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Calculate time overlap
   */
  private calculateTimeOverlap(times1: any[], times2: any[]): number {
    // Simplified - in production use proper time range overlap calculation
    return 0.5;
  }

  /**
   * Get profile completeness score
   */
  private getProfileCompleteness(profile: any): number {
    const requiredFields = ['age', 'location', 'interests', 'education', 'occupation'];
    const filledFields = requiredFields.filter((field) => profile[field]).length;
    return filledFields / requiredFields.length;
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(features: any, breakdown: any): number {
    // Confidence based on data availability
    let confidence = 0.5;

    // More data = higher confidence
    if (features.user.interests?.length > 5) confidence += 0.1;
    if (features.target.interests?.length > 5) confidence += 0.1;
    if (features.interaction && Object.keys(features.interaction).length > 0) confidence += 0.2;

    // Consistent scores = higher confidence
    const scores = Object.values(breakdown) as number[];
    const variance = this.calculateVariance(scores);
    if (variance < 200) confidence += 0.1;

    return Math.min(confidence, 1);
  }

  /**
   * Calculate variance
   */
  private calculateVariance(values: number[]): number {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    return values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  }

  /**
   * Generate human-readable reasons
   */
  private generateReasons(breakdown: any): string[] {
    const reasons: string[] = [];

    if (breakdown.profileCompatibility > 70) {
      reasons.push('Highly compatible profiles');
    }

    if (breakdown.interestAlignment > 60) {
      reasons.push('Many shared interests');
    }

    if (breakdown.locationFit > 80) {
      reasons.push('Lives nearby');
    }

    if (breakdown.conversationLikelihood > 70) {
      reasons.push('High chance of engaging conversation');
    }

    if (reasons.length === 0) {
      reasons.push('Potential match based on preferences');
    }

    return reasons;
  }

  /**
   * Fetch user profile (placeholder)
   */
  private async fetchProfile(userId: string): Promise<any> {
    // In production, fetch from database/cache
    return {};
  }

  /**
   * Fetch user preferences (placeholder)
   */
  private async fetchPreferences(userId: string): Promise<any> {
    // In production, fetch from database/cache
    return {};
  }

  /**
   * Update model version
   */
  setModelVersion(version: string): void {
    this.modelVersion = version;
    logger.info('ML model version updated', { version });
  }
}

export const mlScoringService = new MLScoringService();
export default mlScoringService;
