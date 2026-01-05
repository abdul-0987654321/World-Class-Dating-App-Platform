import logger from '../../utils/logger';

export interface ProfileScore {
  userId: string;
  overall: number; // 0-100
  breakdown: {
    photos: number;
    bio: number;
    interests: number;
    preferences: number;
    verification: number;
    activity: number;
  };
  completionPercentage: number;
  suggestions: string[];
  tier: 'incomplete' | 'basic' | 'good' | 'excellent';
}

export interface ProfileData {
  userId: string;
  photos?: any[];
  bio?: string;
  interests?: string[];
  preferences?: any;
  isVerified?: boolean;
  lastActive?: Date;
  dateOfBirth?: Date;
  location?: any;
  work?: string;
  education?: string;
  height?: number;
  religion?: string;
  smoking?: string;
  drinking?: string;
  languages?: string[];
}

class ProfileScoringService {
  /**
   * Calculate profile completeness score
   */
  calculateScore(profile: ProfileData): ProfileScore {
    const breakdown = {
      photos: this.scorePhotos(profile),
      bio: this.scoreBio(profile),
      interests: this.scoreInterests(profile),
      preferences: this.scorePreferences(profile),
      verification: this.scoreVerification(profile),
      activity: this.scoreActivity(profile),
    };

    // Calculate weighted overall score
    const weights = {
      photos: 0.3, // 30% - Most important
      bio: 0.2, // 20%
      interests: 0.15, // 15%
      preferences: 0.1, // 10%
      verification: 0.15, // 15%
      activity: 0.1, // 10%
    };

    const overall = Math.round(
      breakdown.photos * weights.photos +
        breakdown.bio * weights.bio +
        breakdown.interests * weights.interests +
        breakdown.preferences * weights.preferences +
        breakdown.verification * weights.verification +
        breakdown.activity * weights.activity
    );

    const completionPercentage = this.calculateCompletionPercentage(profile);
    const suggestions = this.generateSuggestions(profile, breakdown);
    const tier = this.determineTier(overall);

    return {
      userId: profile.userId,
      overall,
      breakdown,
      completionPercentage,
      suggestions,
      tier,
    };
  }

  /**
   * Score photos section
   */
  private scorePhotos(profile: ProfileData): number {
    const photos = profile.photos || [];
    const photoCount = photos.length;

    if (photoCount === 0) return 0;
    if (photoCount === 1) return 30;
    if (photoCount === 2) return 50;
    if (photoCount === 3) return 70;
    if (photoCount === 4) return 85;
    if (photoCount >= 5) return 100;

    return 0;
  }

  /**
   * Score bio section
   */
  private scoreBio(profile: ProfileData): number {
    const bio = profile.bio || '';

    if (!bio || bio.trim().length === 0) return 0;
    if (bio.length < 50) return 30;
    if (bio.length < 100) return 60;
    if (bio.length < 200) return 85;
    return 100;
  }

  /**
   * Score interests section
   */
  private scoreInterests(profile: ProfileData): number {
    const interests = profile.interests || [];

    if (interests.length === 0) return 0;
    if (interests.length < 3) return 40;
    if (interests.length < 5) return 70;
    return 100;
  }

  /**
   * Score preferences section
   */
  private scorePreferences(profile: ProfileData): number {
    const preferences = profile.preferences || {};
    let score = 0;

    const fields = ['ageRange', 'distance', 'gender', 'relationshipType'];
    const filledFields = fields.filter((field) => preferences[field] !== undefined).length;

    score = (filledFields / fields.length) * 100;

    return Math.round(score);
  }

  /**
   * Score verification
   */
  private scoreVerification(profile: ProfileData): number {
    return profile.isVerified ? 100 : 0;
  }

  /**
   * Score activity
   */
  private scoreActivity(profile: ProfileData): number {
    if (!profile.lastActive) return 0;

    const now = new Date();
    const lastActive = new Date(profile.lastActive);
    const daysSinceActive = (now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceActive <= 1) return 100;
    if (daysSinceActive <= 3) return 80;
    if (daysSinceActive <= 7) return 60;
    if (daysSinceActive <= 14) return 40;
    if (daysSinceActive <= 30) return 20;
    return 0;
  }

  /**
   * Calculate overall completion percentage
   */
  private calculateCompletionPercentage(profile: ProfileData): number {
    const fields = [
      { key: 'photos', weight: 2 },
      { key: 'bio', weight: 2 },
      { key: 'interests', weight: 1 },
      { key: 'dateOfBirth', weight: 1 },
      { key: 'location', weight: 1 },
      { key: 'work', weight: 1 },
      { key: 'education', weight: 1 },
      { key: 'height', weight: 0.5 },
      { key: 'religion', weight: 0.5 },
      { key: 'smoking', weight: 0.5 },
      { key: 'drinking', weight: 0.5 },
      { key: 'languages', weight: 0.5 },
    ];

    let totalWeight = 0;
    let filledWeight = 0;

    for (const field of fields) {
      totalWeight += field.weight;

      const value = (profile as any)[field.key];

      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          if (value.length > 0) filledWeight += field.weight;
        } else if (typeof value === 'string') {
          if (value.trim().length > 0) filledWeight += field.weight;
        } else {
          filledWeight += field.weight;
        }
      }
    }

    return Math.round((filledWeight / totalWeight) * 100);
  }

  /**
   * Generate improvement suggestions
   */
  private generateSuggestions(profile: ProfileData, breakdown: any): string[] {
    const suggestions: string[] = [];

    // Photos
    const photoCount = profile.photos?.length || 0;
    if (photoCount === 0) {
      suggestions.push('Add at least one photo to your profile');
    } else if (photoCount < 3) {
      suggestions.push(`Add ${3 - photoCount} more photo(s) to make your profile stand out`);
    } else if (photoCount < 5) {
      suggestions.push('Add more photos to showcase different aspects of your life');
    }

    // Bio
    const bioLength = profile.bio?.length || 0;
    if (bioLength === 0) {
      suggestions.push('Write a bio to tell others about yourself');
    } else if (bioLength < 100) {
      suggestions.push('Expand your bio to give potential matches more insight into who you are');
    }

    // Interests
    const interestCount = profile.interests?.length || 0;
    if (interestCount === 0) {
      suggestions.push('Add interests to help find compatible matches');
    } else if (interestCount < 5) {
      suggestions.push('Add more interests to improve match quality');
    }

    // Verification
    if (!profile.isVerified) {
      suggestions.push('Verify your profile to increase trust and visibility');
    }

    // Additional fields
    if (!profile.work) {
      suggestions.push('Add your occupation to your profile');
    }

    if (!profile.education) {
      suggestions.push('Add your education to your profile');
    }

    if (!profile.languages || profile.languages.length === 0) {
      suggestions.push('Add languages you speak');
    }

    // Preferences
    if (!profile.preferences || Object.keys(profile.preferences).length === 0) {
      suggestions.push('Set your dating preferences to improve match recommendations');
    }

    return suggestions.slice(0, 5); // Return top 5 suggestions
  }

  /**
   * Determine profile tier
   */
  private determineTier(score: number): 'incomplete' | 'basic' | 'good' | 'excellent' {
    if (score < 40) return 'incomplete';
    if (score < 60) return 'basic';
    if (score < 80) return 'good';
    return 'excellent';
  }

  /**
   * Check if profile meets minimum requirements
   */
  meetsMinimumRequirements(profile: ProfileData): boolean {
    const hasPhotos = (profile.photos?.length || 0) > 0;
    const hasBio = (profile.bio?.length || 0) > 0;
    const hasBasicInfo = profile.dateOfBirth && profile.location;

    return hasPhotos && hasBio && !!hasBasicInfo;
  }

  /**
   * Get profile visibility score (affects search ranking)
   */
  getVisibilityScore(profileScore: ProfileScore): number {
    // Visibility score is based on overall score with multipliers
    let score = profileScore.overall;

    // Bonus for excellent profiles
    if (profileScore.tier === 'excellent') {
      score *= 1.2;
    }

    // Bonus for verified profiles
    if (profileScore.breakdown.verification === 100) {
      score *= 1.15;
    }

    // Penalty for inactive profiles
    if (profileScore.breakdown.activity < 50) {
      score *= 0.8;
    }

    return Math.min(Math.round(score), 100);
  }

  /**
   * Log profile score
   */
  logScore(profileScore: ProfileScore): void {
    logger.info('Profile score calculated', {
      userId: profileScore.userId,
      overall: profileScore.overall,
      tier: profileScore.tier,
      completionPercentage: profileScore.completionPercentage,
    });
  }
}

export const profileScoringService = new ProfileScoringService();
export default profileScoringService;
