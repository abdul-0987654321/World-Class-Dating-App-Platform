/**
 * Advanced Filters Service
 * Handles advanced filtering options for discovery
 * Premium feature for more refined matching
 */

import { createLogger } from '@flamoral/shared';

const logger = createLogger('advanced-filters-service');

export interface AdvancedFilters {
  // Demographics
  heightMin?: number; // in cm
  heightMax?: number; // in cm
  education?: string[];
  occupation?: string[];
  ethnicity?: string[];

  // Lifestyle
  religion?: string[];
  politics?: string[];
  smoking?: string[];
  drinking?: string[];
  exercise?: string[];
  diet?: string[];

  // Relationship preferences
  relationshipType?: string[];
  lookingFor?: string[];
  hasChildren?: boolean | 'either';
  wantsChildren?: boolean | 'either';

  // Lifestyle details
  hasPets?: boolean | 'either';
  petPreference?: string[];
  languages?: string[];

  // Personality & Values
  zodiacSigns?: string[];
  personalityType?: string[]; // MBTI, etc.
  loveLanguage?: string[];

  // Activity & Engagement
  verifiedOnly?: boolean;
  newUsersOnly?: boolean; // Joined within last 30 days
  activeUsersOnly?: boolean; // Active within last 7 days
  hasPhotosMin?: number; // Minimum number of photos
  hasPrompts?: boolean; // Has answered prompts

  // Distance & Location
  maxDistance?: number; // Override default distance
  specificLocations?: string[]; // City names

  // Advanced matching
  minCompatibilityScore?: number;
  excludePreviouslyPassed?: boolean;
}

export interface FilterValidation {
  valid: boolean;
  errors: string[];
}

export class AdvancedFiltersService {
  /**
   * Validate advanced filters
   */
  validateFilters(filters: AdvancedFilters): FilterValidation {
    const errors: string[] = [];

    // Height validation
    if (filters.heightMin !== undefined && (filters.heightMin < 120 || filters.heightMin > 250)) {
      errors.push('Minimum height must be between 120cm and 250cm');
    }

    if (filters.heightMax !== undefined && (filters.heightMax < 120 || filters.heightMax > 250)) {
      errors.push('Maximum height must be between 120cm and 250cm');
    }

    if (
      filters.heightMin !== undefined &&
      filters.heightMax !== undefined &&
      filters.heightMin > filters.heightMax
    ) {
      errors.push('Minimum height cannot be greater than maximum height');
    }

    // Distance validation
    if (filters.maxDistance !== undefined && (filters.maxDistance < 1 || filters.maxDistance > 500)) {
      errors.push('Distance must be between 1 and 500 km');
    }

    // Photos validation
    if (filters.hasPhotosMin !== undefined && (filters.hasPhotosMin < 1 || filters.hasPhotosMin > 10)) {
      errors.push('Minimum photos must be between 1 and 10');
    }

    // Compatibility score validation
    if (
      filters.minCompatibilityScore !== undefined &&
      (filters.minCompatibilityScore < 0 || filters.minCompatibilityScore > 100)
    ) {
      errors.push('Compatibility score must be between 0 and 100');
    }

    // Array validations
    if (filters.education && filters.education.length > 10) {
      errors.push('Too many education filters selected');
    }

    if (filters.languages && filters.languages.length > 20) {
      errors.push('Too many language filters selected');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Build SQL WHERE clauses from filters
   */
  buildFilterQuery(filters: AdvancedFilters): {
    conditions: string[];
    parameters: any[];
  } {
    const conditions: string[] = [];
    const parameters: any[] = [];
    let paramIndex = 1;

    // Height filters
    if (filters.heightMin !== undefined) {
      conditions.push(`height >= $${paramIndex}`);
      parameters.push(filters.heightMin);
      paramIndex++;
    }

    if (filters.heightMax !== undefined) {
      conditions.push(`height <= $${paramIndex}`);
      parameters.push(filters.heightMax);
      paramIndex++;
    }

    // Education filter
    if (filters.education && filters.education.length > 0) {
      conditions.push(`education = ANY($${paramIndex})`);
      parameters.push(filters.education);
      paramIndex++;
    }

    // Religion filter
    if (filters.religion && filters.religion.length > 0) {
      conditions.push(`religion = ANY($${paramIndex})`);
      parameters.push(filters.religion);
      paramIndex++;
    }

    // Politics filter
    if (filters.politics && filters.politics.length > 0) {
      conditions.push(`politics = ANY($${paramIndex})`);
      parameters.push(filters.politics);
      paramIndex++;
    }

    // Lifestyle filters
    if (filters.smoking && filters.smoking.length > 0) {
      conditions.push(`smoking = ANY($${paramIndex})`);
      parameters.push(filters.smoking);
      paramIndex++;
    }

    if (filters.drinking && filters.drinking.length > 0) {
      conditions.push(`drinking = ANY($${paramIndex})`);
      parameters.push(filters.drinking);
      paramIndex++;
    }

    if (filters.exercise && filters.exercise.length > 0) {
      conditions.push(`exercise = ANY($${paramIndex})`);
      parameters.push(filters.exercise);
      paramIndex++;
    }

    if (filters.diet && filters.diet.length > 0) {
      conditions.push(`diet = ANY($${paramIndex})`);
      parameters.push(filters.diet);
      paramIndex++;
    }

    // Children preferences
    if (filters.hasChildren !== undefined && filters.hasChildren !== 'either') {
      conditions.push(`has_children = $${paramIndex}`);
      parameters.push(filters.hasChildren);
      paramIndex++;
    }

    if (filters.wantsChildren !== undefined && filters.wantsChildren !== 'either') {
      conditions.push(`wants_children = $${paramIndex}`);
      parameters.push(filters.wantsChildren);
      paramIndex++;
    }

    // Pets
    if (filters.hasPets !== undefined && filters.hasPets !== 'either') {
      conditions.push(`has_pets = $${paramIndex}`);
      parameters.push(filters.hasPets);
      paramIndex++;
    }

    // Verification
    if (filters.verifiedOnly) {
      conditions.push('is_verified = true');
    }

    // Photos minimum
    if (filters.hasPhotosMin !== undefined) {
      conditions.push(`array_length(photos, 1) >= $${paramIndex}`);
      parameters.push(filters.hasPhotosMin);
      paramIndex++;
    }

    // Prompts
    if (filters.hasPrompts) {
      conditions.push(`array_length(prompts, 1) > 0`);
    }

    // New users (within 30 days)
    if (filters.newUsersOnly) {
      conditions.push(`created_at >= NOW() - INTERVAL '30 days'`);
    }

    // Active users (within 7 days)
    if (filters.activeUsersOnly) {
      conditions.push(`last_active_at >= NOW() - INTERVAL '7 days'`);
    }

    // Languages
    if (filters.languages && filters.languages.length > 0) {
      conditions.push(`languages && $${paramIndex}`);
      parameters.push(filters.languages);
      paramIndex++;
    }

    // Zodiac signs
    if (filters.zodiacSigns && filters.zodiacSigns.length > 0) {
      conditions.push(`zodiac_sign = ANY($${paramIndex})`);
      parameters.push(filters.zodiacSigns);
      paramIndex++;
    }

    return { conditions, parameters };
  }

  /**
   * Get filter options/metadata
   */
  getFilterOptions(): {
    [key: string]: { label: string; options: string[] | { value: string; label: string }[] };
  } {
    return {
      education: {
        label: 'Education',
        options: [
          { value: 'high_school', label: 'High School' },
          { value: 'some_college', label: 'Some College' },
          { value: 'associates', label: 'Associates Degree' },
          { value: 'bachelors', label: 'Bachelors Degree' },
          { value: 'masters', label: 'Masters Degree' },
          { value: 'phd', label: 'PhD/Doctorate' },
          { value: 'trade_school', label: 'Trade School' },
        ],
      },
      religion: {
        label: 'Religion',
        options: [
          { value: 'atheist', label: 'Atheist' },
          { value: 'agnostic', label: 'Agnostic' },
          { value: 'christian', label: 'Christian' },
          { value: 'catholic', label: 'Catholic' },
          { value: 'jewish', label: 'Jewish' },
          { value: 'muslim', label: 'Muslim' },
          { value: 'hindu', label: 'Hindu' },
          { value: 'buddhist', label: 'Buddhist' },
          { value: 'spiritual', label: 'Spiritual (not religious)' },
          { value: 'other', label: 'Other' },
        ],
      },
      politics: {
        label: 'Political Views',
        options: [
          { value: 'liberal', label: 'Liberal' },
          { value: 'moderate', label: 'Moderate' },
          { value: 'conservative', label: 'Conservative' },
          { value: 'apolitical', label: 'Not Political' },
        ],
      },
      smoking: {
        label: 'Smoking',
        options: [
          { value: 'never', label: 'Never' },
          { value: 'socially', label: 'Socially' },
          { value: 'regularly', label: 'Regularly' },
          { value: 'trying_to_quit', label: 'Trying to Quit' },
        ],
      },
      drinking: {
        label: 'Drinking',
        options: [
          { value: 'never', label: 'Never' },
          { value: 'socially', label: 'Socially' },
          { value: 'regularly', label: 'Regularly' },
        ],
      },
      exercise: {
        label: 'Exercise',
        options: [
          { value: 'never', label: 'Never' },
          { value: 'sometimes', label: 'Sometimes' },
          { value: 'regularly', label: 'Regularly' },
          { value: 'active', label: 'Very Active' },
        ],
      },
      diet: {
        label: 'Diet',
        options: [
          { value: 'omnivore', label: 'Omnivore' },
          { value: 'vegetarian', label: 'Vegetarian' },
          { value: 'vegan', label: 'Vegan' },
          { value: 'pescatarian', label: 'Pescatarian' },
          { value: 'kosher', label: 'Kosher' },
          { value: 'halal', label: 'Halal' },
        ],
      },
      relationshipType: {
        label: 'Relationship Type',
        options: [
          { value: 'monogamous', label: 'Monogamous' },
          { value: 'non_monogamous', label: 'Non-Monogamous' },
          { value: 'open', label: 'Open to Either' },
        ],
      },
      lookingFor: {
        label: 'Looking For',
        options: [
          { value: 'relationship', label: 'Long-term Relationship' },
          { value: 'short_term', label: 'Short-term Dating' },
          { value: 'casual', label: 'Casual Dating' },
          { value: 'friendship', label: 'Friendship' },
          { value: 'not_sure', label: 'Not Sure Yet' },
        ],
      },
      zodiacSigns: {
        label: 'Zodiac Sign',
        options: [
          { value: 'aries', label: 'Aries' },
          { value: 'taurus', label: 'Taurus' },
          { value: 'gemini', label: 'Gemini' },
          { value: 'cancer', label: 'Cancer' },
          { value: 'leo', label: 'Leo' },
          { value: 'virgo', label: 'Virgo' },
          { value: 'libra', label: 'Libra' },
          { value: 'scorpio', label: 'Scorpio' },
          { value: 'sagittarius', label: 'Sagittarius' },
          { value: 'capricorn', label: 'Capricorn' },
          { value: 'aquarius', label: 'Aquarius' },
          { value: 'pisces', label: 'Pisces' },
        ],
      },
      personalityType: {
        label: 'Personality Type (MBTI)',
        options: [
          { value: 'intj', label: 'INTJ - Architect' },
          { value: 'intp', label: 'INTP - Logician' },
          { value: 'entj', label: 'ENTJ - Commander' },
          { value: 'entp', label: 'ENTP - Debater' },
          { value: 'infj', label: 'INFJ - Advocate' },
          { value: 'infp', label: 'INFP - Mediator' },
          { value: 'enfj', label: 'ENFJ - Protagonist' },
          { value: 'enfp', label: 'ENFP - Campaigner' },
          { value: 'istj', label: 'ISTJ - Logistician' },
          { value: 'isfj', label: 'ISFJ - Defender' },
          { value: 'estj', label: 'ESTJ - Executive' },
          { value: 'esfj', label: 'ESFJ - Consul' },
          { value: 'istp', label: 'ISTP - Virtuoso' },
          { value: 'isfp', label: 'ISFP - Adventurer' },
          { value: 'estp', label: 'ESTP - Entrepreneur' },
          { value: 'esfp', label: 'ESFP - Entertainer' },
        ],
      },
      loveLanguage: {
        label: 'Love Language',
        options: [
          { value: 'words_of_affirmation', label: 'Words of Affirmation' },
          { value: 'acts_of_service', label: 'Acts of Service' },
          { value: 'receiving_gifts', label: 'Receiving Gifts' },
          { value: 'quality_time', label: 'Quality Time' },
          { value: 'physical_touch', label: 'Physical Touch' },
        ],
      },
    };
  }

  /**
   * Save user's advanced filter preferences
   */
  async saveFilterPreferences(userId: string, filters: AdvancedFilters): Promise<void> {
    try {
      // Validate filters first
      const validation = this.validateFilters(filters);
      if (!validation.valid) {
        throw new Error(`Invalid filters: ${validation.errors.join(', ')}`);
      }

      // Save to database (implementation would depend on your schema)
      logger.info(`Saved advanced filters for user ${userId}`);
    } catch (error) {
      logger.error('Failed to save filter preferences', error);
      throw error;
    }
  }

  /**
   * Get user's saved filter preferences
   */
  async getFilterPreferences(userId: string): Promise<AdvancedFilters> {
    try {
      // Fetch from database
      // For now, return empty filters
      return {};
    } catch (error) {
      logger.error('Failed to get filter preferences', error);
      throw error;
    }
  }

  /**
   * Clear all advanced filters
   */
  async clearFilterPreferences(userId: string): Promise<void> {
    try {
      logger.info(`Cleared advanced filters for user ${userId}`);
    } catch (error) {
      logger.error('Failed to clear filter preferences', error);
      throw error;
    }
  }
}

export default new AdvancedFiltersService();
