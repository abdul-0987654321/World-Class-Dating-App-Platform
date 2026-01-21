/**
 * Emotional Availability Indicator Service
 * Mood-based matching optimization feature
 *
 * This feature allows users to optionally indicate their emotional availability/mood,
 * which influences matching and conversation suggestions.
 *
 * Key Features:
 * - Users can set their current emotional state
 * - States can auto-expire after a duration
 * - Compatibility scoring between emotional states
 * - Match suggestions based on emotional compatibility
 * - Privacy controls for state visibility
 *
 * Feature flag: 0% rollout (Tier 3)
 */

import { Injectable, Logger } from '@nestjs/common';

// =============================================================================
// Types and Interfaces
// =============================================================================

/**
 * Emotional states a user can indicate
 */
export type EmotionalState =
  | 'open_to_connect'
  | 'casual_chat'
  | 'deep_conversations'
  | 'need_space'
  | 'feeling_adventurous'
  | 'seeking_comfort';

/**
 * Availability window for an emotional state
 */
export interface AvailabilityWindow {
  state: EmotionalState;
  startTime: Date;
  endTime: Date | null; // null means indefinite
  autoExpire: boolean;
}

/**
 * Emotional compatibility result between two users
 */
export interface EmotionalCompatibility {
  score: number; // 0-100
  complementaryStates: boolean;
  suggestions: string[];
  compatibilityLevel: 'high' | 'medium' | 'low' | 'incompatible';
}

/**
 * User's emotional profile containing current state and history
 */
export interface UserEmotionalProfile {
  userId: string;
  currentState: AvailabilityWindow | null;
  stateHistory: EmotionalStateHistoryEntry[];
  preferences: EmotionalPreferences;
  privacySettings: EmotionalPrivacySettings;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Historical entry for emotional state
 */
export interface EmotionalStateHistoryEntry {
  state: EmotionalState;
  startTime: Date;
  endTime: Date;
  duration: number; // in minutes
}

/**
 * User preferences for emotional availability feature
 */
export interface EmotionalPreferences {
  defaultDuration: number; // default duration in minutes
  preferredStates: EmotionalState[];
  notifyOnCompatibleMatch: boolean;
  showInDiscovery: boolean;
}

/**
 * Privacy settings for emotional state visibility
 */
export interface EmotionalPrivacySettings {
  visibility: 'public' | 'matches_only' | 'hidden';
  anonymousMode: boolean;
  historyRetentionDays: number;
  shareWithMatches: boolean;
}

/**
 * DTO for setting emotional state
 */
export interface SetEmotionalStateDto {
  state: EmotionalState;
  duration?: number; // in minutes, optional
  autoExpire?: boolean;
}

/**
 * Match suggestion based on emotional compatibility
 */
export interface EmotionalMatchSuggestion {
  userId: string;
  emotionalState: EmotionalState | null;
  compatibilityScore: number;
  suggestions: string[];
  reason: string;
}

/**
 * Emotional state patterns analysis
 */
export interface EmotionalPatterns {
  mostFrequentState: EmotionalState | null;
  averageDuration: number;
  totalStateChanges: number;
  stateDistribution: Map<EmotionalState, number>;
  peakActivityTimes: string[];
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Feature flag check for emotional availability (0% rollout - Tier 3)
 */
function isFeatureEnabled(userId: string): boolean {
  // In production: return featureFlags.isEnabled('innovativeFeatures', 'emotionalAvailability', { userId });
  // 0% rollout means feature is disabled for all users by default
  // Can be overridden for testing with specific user IDs
  const testUserPrefix = 'emotional-test-';
  if (userId.startsWith(testUserPrefix)) {
    return true;
  }

  // Hash-based check for 0% rollout
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash) % 100 < 0; // 0% rollout
}

/**
 * Compatibility matrix defining how emotional states complement each other
 * Scores range from 0-100
 */
const COMPATIBILITY_MATRIX: Record<EmotionalState, Record<EmotionalState, number>> = {
  open_to_connect: {
    open_to_connect: 95,
    casual_chat: 80,
    deep_conversations: 85,
    need_space: 10,
    feeling_adventurous: 90,
    seeking_comfort: 70,
  },
  casual_chat: {
    open_to_connect: 80,
    casual_chat: 90,
    deep_conversations: 50,
    need_space: 15,
    feeling_adventurous: 75,
    seeking_comfort: 60,
  },
  deep_conversations: {
    open_to_connect: 85,
    casual_chat: 50,
    deep_conversations: 95,
    need_space: 20,
    feeling_adventurous: 55,
    seeking_comfort: 80,
  },
  need_space: {
    open_to_connect: 10,
    casual_chat: 15,
    deep_conversations: 20,
    need_space: 25,
    feeling_adventurous: 5,
    seeking_comfort: 30,
  },
  feeling_adventurous: {
    open_to_connect: 90,
    casual_chat: 75,
    deep_conversations: 55,
    need_space: 5,
    feeling_adventurous: 95,
    seeking_comfort: 40,
  },
  seeking_comfort: {
    open_to_connect: 70,
    casual_chat: 60,
    deep_conversations: 80,
    need_space: 30,
    feeling_adventurous: 40,
    seeking_comfort: 85,
  },
};

/**
 * Conversation suggestions based on emotional state combinations
 */
const CONVERSATION_SUGGESTIONS: Record<string, string[]> = {
  'open_to_connect:open_to_connect': [
    'Start with a genuine compliment about something in their profile',
    'Ask about their current interests or hobbies',
    'Share something interesting about your day',
  ],
  'open_to_connect:casual_chat': [
    'Keep the conversation light and fun',
    'Share a funny story or observation',
    'Ask about their weekend plans',
  ],
  'open_to_connect:deep_conversations': [
    'Ask thoughtful questions about their passions',
    'Share your views on something meaningful',
    'Discuss shared interests in depth',
  ],
  'casual_chat:casual_chat': [
    'Share memes or funny content',
    'Talk about trending topics',
    'Plan a casual activity together',
  ],
  'casual_chat:deep_conversations': [
    'Gradually transition from light topics to deeper ones',
    'Show genuine interest in their perspective',
    'Balance humor with meaningful exchanges',
  ],
  'deep_conversations:deep_conversations': [
    'Explore life goals and aspirations',
    'Discuss books, philosophy, or personal growth',
    'Share vulnerably about experiences',
  ],
  'feeling_adventurous:feeling_adventurous': [
    'Suggest spontaneous activities',
    'Plan an adventure together',
    'Share travel stories and bucket list items',
  ],
  'feeling_adventurous:open_to_connect': [
    'Propose exciting date ideas',
    'Share recent adventures',
    'Ask about their dream experiences',
  ],
  'seeking_comfort:seeking_comfort': [
    'Offer support and understanding',
    'Share comforting stories',
    'Suggest cozy activities',
  ],
  'seeking_comfort:deep_conversations': [
    'Create a safe space for sharing',
    'Listen actively and empathetically',
    'Share meaningful experiences',
  ],
  'need_space:any': [
    'Respect their need for space',
    'Send a simple check-in message later',
    'Let them initiate when ready',
  ],
};

/**
 * Default privacy settings
 */
const DEFAULT_PRIVACY_SETTINGS: EmotionalPrivacySettings = {
  visibility: 'matches_only',
  anonymousMode: false,
  historyRetentionDays: 30,
  shareWithMatches: true,
};

/**
 * Default preferences
 */
const DEFAULT_PREFERENCES: EmotionalPreferences = {
  defaultDuration: 120, // 2 hours
  preferredStates: [],
  notifyOnCompatibleMatch: true,
  showInDiscovery: true,
};

// =============================================================================
// Service Implementation
// =============================================================================

@Injectable()
export class EmotionalAvailabilityService {
  private readonly logger = new Logger(EmotionalAvailabilityService.name);

  // In-memory storage (replace with database in production)
  private profiles: Map<string, UserEmotionalProfile> = new Map();
  private expirationTimers: Map<string, NodeJS.Timeout> = new Map();

  // ==========================================================================
  // Feature Flag
  // ==========================================================================

  /**
   * Check if the emotional availability feature is available for a user
   */
  isFeatureAvailable(userId: string): boolean {
    return isFeatureEnabled(userId);
  }

  // ==========================================================================
  // State Management
  // ==========================================================================

  /**
   * Set the user's current emotional state
   * @param userId - The user's ID
   * @param state - The emotional state to set
   * @param duration - Optional duration in minutes (auto-expires after this time)
   * @returns The updated user profile or null if feature is disabled
   */
  setEmotionalState(
    userId: string,
    state: EmotionalState,
    duration?: number
  ): UserEmotionalProfile | null {
    if (!isFeatureEnabled(userId)) {
      this.logger.debug(
        `Emotional availability not available for user ${userId} (feature flag disabled)`
      );
      return null;
    }

    let profile = this.profiles.get(userId);

    if (!profile) {
      profile = this.createDefaultProfile(userId);
    }

    // Archive current state to history if exists
    if (profile.currentState) {
      this.archiveCurrentState(profile);
    }

    // Clear any existing expiration timer
    this.clearExpirationTimer(userId);

    // Calculate end time if duration is provided
    const startTime = new Date();
    let endTime: Date | null = null;
    const autoExpire = duration !== undefined && duration > 0;

    if (autoExpire && duration) {
      endTime = new Date(startTime.getTime() + duration * 60 * 1000);
      this.scheduleExpiration(userId, duration);
    }

    // Set new state
    profile.currentState = {
      state,
      startTime,
      endTime,
      autoExpire,
    };
    profile.updatedAt = new Date();

    this.profiles.set(userId, profile);
    this.logger.log(`Emotional state set for user ${userId}: ${state}`);

    return profile;
  }

  /**
   * Get the user's current emotional state
   * @param userId - The user's ID
   * @returns The current emotional state or null
   */
  getEmotionalState(userId: string): AvailabilityWindow | null {
    if (!isFeatureEnabled(userId)) {
      return null;
    }

    const profile = this.profiles.get(userId);

    if (!profile?.currentState) {
      return null;
    }

    // Check if state has expired
    if (
      profile.currentState.autoExpire &&
      profile.currentState.endTime &&
      new Date() > profile.currentState.endTime
    ) {
      this.expireState(userId);
      return null;
    }

    return profile.currentState;
  }

  /**
   * Get the full emotional profile for a user
   * @param userId - The user's ID
   * @returns The user's emotional profile or null
   */
  getEmotionalProfile(userId: string): UserEmotionalProfile | null {
    if (!isFeatureEnabled(userId)) {
      return null;
    }

    let profile = this.profiles.get(userId);

    if (!profile) {
      profile = this.createDefaultProfile(userId);
      this.profiles.set(userId, profile);
    }

    return profile;
  }

  /**
   * Clear the user's current emotional state
   * @param userId - The user's ID
   */
  clearEmotionalState(userId: string): void {
    if (!isFeatureEnabled(userId)) {
      return;
    }

    const profile = this.profiles.get(userId);

    if (profile?.currentState) {
      this.archiveCurrentState(profile);
      profile.currentState = null;
      profile.updatedAt = new Date();
      this.profiles.set(userId, profile);
      this.clearExpirationTimer(userId);
      this.logger.log(`Emotional state cleared for user ${userId}`);
    }
  }

  // ==========================================================================
  // Compatibility Calculations
  // ==========================================================================

  /**
   * Calculate emotional compatibility between two users' states
   * @param user1State - First user's emotional state
   * @param user2State - Second user's emotional state
   * @returns Compatibility analysis
   */
  calculateEmotionalCompatibility(
    user1State: EmotionalState | null,
    user2State: EmotionalState | null
  ): EmotionalCompatibility {
    // If either user hasn't set a state, return neutral compatibility
    if (!user1State || !user2State) {
      return {
        score: 50,
        complementaryStates: false,
        suggestions: ['Both users should set their emotional availability for better matching'],
        compatibilityLevel: 'medium',
      };
    }

    // Get base compatibility score from matrix
    const score = COMPATIBILITY_MATRIX[user1State][user2State];

    // Determine compatibility level
    let compatibilityLevel: 'high' | 'medium' | 'low' | 'incompatible';
    if (score >= 80) {
      compatibilityLevel = 'high';
    } else if (score >= 50) {
      compatibilityLevel = 'medium';
    } else if (score >= 25) {
      compatibilityLevel = 'low';
    } else {
      compatibilityLevel = 'incompatible';
    }

    // Get conversation suggestions
    const suggestions = this.getConversationSuggestions(user1State, user2State);

    // Determine if states are complementary
    const complementaryStates = this.areStatesComplementary(user1State, user2State);

    return {
      score,
      complementaryStates,
      suggestions,
      compatibilityLevel,
    };
  }

  /**
   * Suggest matches based on current emotional state
   * @param userId - The user's ID
   * @param state - Optional state to use (defaults to current state)
   * @param potentialMatches - List of potential match user IDs
   * @returns Sorted list of match suggestions
   */
  suggestMatchesForMood(
    userId: string,
    state?: EmotionalState,
    potentialMatches: string[] = []
  ): EmotionalMatchSuggestion[] {
    if (!isFeatureEnabled(userId)) {
      return [];
    }

    // Get the state to use for matching
    const userState = state || this.getEmotionalState(userId)?.state;

    if (!userState) {
      return potentialMatches.map((matchId) => ({
        userId: matchId,
        emotionalState: this.getEmotionalState(matchId)?.state || null,
        compatibilityScore: 50,
        suggestions: ['Set your emotional state for better match suggestions'],
        reason: 'No emotional state set',
      }));
    }

    // Calculate compatibility for each potential match
    const suggestions: EmotionalMatchSuggestion[] = potentialMatches.map((matchId) => {
      const matchState = this.getEmotionalState(matchId)?.state || null;
      const compatibility = this.calculateEmotionalCompatibility(userState, matchState);

      return {
        userId: matchId,
        emotionalState: matchState,
        compatibilityScore: compatibility.score,
        suggestions: compatibility.suggestions,
        reason: this.getMatchReason(userState, matchState, compatibility),
      };
    });

    // Sort by compatibility score (highest first)
    return suggestions.sort((a, b) => b.compatibilityScore - a.compatibilityScore);
  }

  // ==========================================================================
  // History and Patterns
  // ==========================================================================

  /**
   * Get the user's emotional state history
   * @param userId - The user's ID
   * @param days - Number of days to look back
   * @returns State history entries within the time period
   */
  getStateHistory(userId: string, days: number): EmotionalStateHistoryEntry[] {
    if (!isFeatureEnabled(userId)) {
      return [];
    }

    const profile = this.profiles.get(userId);

    if (!profile) {
      return [];
    }

    // Apply privacy retention setting
    const retentionDays = profile.privacySettings.historyRetentionDays;
    const effectiveDays = Math.min(days, retentionDays);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - effectiveDays);

    return profile.stateHistory.filter((entry) => entry.startTime >= cutoffDate);
  }

  /**
   * Analyze emotional state patterns
   * @param userId - The user's ID
   * @param days - Number of days to analyze
   * @returns Pattern analysis
   */
  analyzeEmotionalPatterns(userId: string, days: number = 30): EmotionalPatterns | null {
    if (!isFeatureEnabled(userId)) {
      return null;
    }

    const history = this.getStateHistory(userId, days);

    if (history.length === 0) {
      return {
        mostFrequentState: null,
        averageDuration: 0,
        totalStateChanges: 0,
        stateDistribution: new Map(),
        peakActivityTimes: [],
      };
    }

    // Calculate state distribution
    const stateDistribution = new Map<EmotionalState, number>();
    let totalDuration = 0;
    const hourCounts: number[] = new Array(24).fill(0);

    for (const entry of history) {
      const count = stateDistribution.get(entry.state) || 0;
      stateDistribution.set(entry.state, count + 1);
      totalDuration += entry.duration;

      // Track activity by hour
      const hour = entry.startTime.getHours();
      hourCounts[hour]++;
    }

    // Find most frequent state
    let mostFrequentState: EmotionalState | null = null;
    let maxCount = 0;
    stateDistribution.forEach((count, state) => {
      if (count > maxCount) {
        maxCount = count;
        mostFrequentState = state;
      }
    });

    // Find peak activity times
    const peakActivityTimes: string[] = [];
    const avgHourCount = history.length / 24;
    hourCounts.forEach((count, hour) => {
      if (count > avgHourCount * 1.5) {
        peakActivityTimes.push(`${hour.toString().padStart(2, '0')}:00`);
      }
    });

    return {
      mostFrequentState,
      averageDuration: history.length > 0 ? totalDuration / history.length : 0,
      totalStateChanges: history.length,
      stateDistribution,
      peakActivityTimes,
    };
  }

  // ==========================================================================
  // Privacy Controls
  // ==========================================================================

  /**
   * Update privacy settings for emotional state
   * @param userId - The user's ID
   * @param settings - Partial privacy settings to update
   */
  updatePrivacySettings(
    userId: string,
    settings: Partial<EmotionalPrivacySettings>
  ): EmotionalPrivacySettings | null {
    if (!isFeatureEnabled(userId)) {
      return null;
    }

    let profile = this.profiles.get(userId);

    if (!profile) {
      profile = this.createDefaultProfile(userId);
    }

    profile.privacySettings = {
      ...profile.privacySettings,
      ...settings,
    };
    profile.updatedAt = new Date();

    this.profiles.set(userId, profile);
    this.logger.log(`Privacy settings updated for user ${userId}`);

    return profile.privacySettings;
  }

  /**
   * Check if a user can view another user's emotional state
   * @param viewerId - The viewing user's ID
   * @param profileOwnerId - The profile owner's ID
   * @param isMatch - Whether the users are matched
   */
  canViewEmotionalState(
    viewerId: string,
    profileOwnerId: string,
    isMatch: boolean
  ): boolean {
    const profile = this.profiles.get(profileOwnerId);

    if (!profile?.currentState) {
      return false;
    }

    const { visibility, anonymousMode } = profile.privacySettings;

    // Anonymous mode hides from everyone
    if (anonymousMode) {
      return false;
    }

    switch (visibility) {
      case 'public':
        return true;
      case 'matches_only':
        return isMatch;
      case 'hidden':
        return viewerId === profileOwnerId;
      default:
        return false;
    }
  }

  /**
   * Get emotional state for viewing (respects privacy)
   * @param viewerId - The viewing user's ID
   * @param profileOwnerId - The profile owner's ID
   * @param isMatch - Whether the users are matched
   */
  getEmotionalStateForViewer(
    viewerId: string,
    profileOwnerId: string,
    isMatch: boolean
  ): AvailabilityWindow | null {
    if (!this.canViewEmotionalState(viewerId, profileOwnerId, isMatch)) {
      return null;
    }

    return this.getEmotionalState(profileOwnerId);
  }

  /**
   * Enable anonymous mode (hide emotional state from all)
   * @param userId - The user's ID
   */
  enableAnonymousMode(userId: string): void {
    this.updatePrivacySettings(userId, { anonymousMode: true });
    this.logger.log(`Anonymous mode enabled for user ${userId}`);
  }

  /**
   * Disable anonymous mode
   * @param userId - The user's ID
   */
  disableAnonymousMode(userId: string): void {
    this.updatePrivacySettings(userId, { anonymousMode: false });
    this.logger.log(`Anonymous mode disabled for user ${userId}`);
  }

  // ==========================================================================
  // Preferences
  // ==========================================================================

  /**
   * Update user preferences for emotional availability
   * @param userId - The user's ID
   * @param preferences - Partial preferences to update
   */
  updatePreferences(
    userId: string,
    preferences: Partial<EmotionalPreferences>
  ): EmotionalPreferences | null {
    if (!isFeatureEnabled(userId)) {
      return null;
    }

    let profile = this.profiles.get(userId);

    if (!profile) {
      profile = this.createDefaultProfile(userId);
    }

    profile.preferences = {
      ...profile.preferences,
      ...preferences,
    };
    profile.updatedAt = new Date();

    this.profiles.set(userId, profile);
    this.logger.log(`Preferences updated for user ${userId}`);

    return profile.preferences;
  }

  // ==========================================================================
  // Auto-expiration
  // ==========================================================================

  /**
   * Auto-expire states that have passed their end time
   * Should be called periodically (e.g., by a cron job)
   */
  autoExpireStates(): number {
    let expiredCount = 0;
    const now = new Date();

    this.profiles.forEach((profile, userId) => {
      if (
        profile.currentState?.autoExpire &&
        profile.currentState.endTime &&
        now > profile.currentState.endTime
      ) {
        this.expireState(userId);
        expiredCount++;
      }
    });

    if (expiredCount > 0) {
      this.logger.log(`Auto-expired ${expiredCount} emotional states`);
    }

    return expiredCount;
  }

  /**
   * Clean up old history entries based on retention settings
   */
  cleanupHistory(): void {
    const now = new Date();

    this.profiles.forEach((profile, userId) => {
      const cutoffDate = new Date(
        now.getTime() - profile.privacySettings.historyRetentionDays * 24 * 60 * 60 * 1000
      );

      const originalLength = profile.stateHistory.length;
      profile.stateHistory = profile.stateHistory.filter(
        (entry) => entry.startTime >= cutoffDate
      );

      if (profile.stateHistory.length < originalLength) {
        this.logger.debug(
          `Cleaned up ${originalLength - profile.stateHistory.length} history entries for user ${userId}`
        );
      }
    });
  }

  // ==========================================================================
  // Private Helper Methods
  // ==========================================================================

  /**
   * Create a default emotional profile
   */
  private createDefaultProfile(userId: string): UserEmotionalProfile {
    return {
      userId,
      currentState: null,
      stateHistory: [],
      preferences: { ...DEFAULT_PREFERENCES },
      privacySettings: { ...DEFAULT_PRIVACY_SETTINGS },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Archive the current state to history
   */
  private archiveCurrentState(profile: UserEmotionalProfile): void {
    if (!profile.currentState) {
      return;
    }

    const endTime = new Date();
    const duration = Math.round(
      (endTime.getTime() - profile.currentState.startTime.getTime()) / 60000
    );

    profile.stateHistory.push({
      state: profile.currentState.state,
      startTime: profile.currentState.startTime,
      endTime,
      duration,
    });
  }

  /**
   * Expire a user's current state
   */
  private expireState(userId: string): void {
    const profile = this.profiles.get(userId);

    if (profile?.currentState) {
      this.archiveCurrentState(profile);
      profile.currentState = null;
      profile.updatedAt = new Date();
      this.logger.log(`Emotional state expired for user ${userId}`);
    }

    this.clearExpirationTimer(userId);
  }

  /**
   * Schedule automatic expiration of a state
   */
  private scheduleExpiration(userId: string, durationMinutes: number): void {
    const timeout = setTimeout(() => {
      this.expireState(userId);
    }, durationMinutes * 60 * 1000);

    this.expirationTimers.set(userId, timeout);
  }

  /**
   * Clear an existing expiration timer
   */
  private clearExpirationTimer(userId: string): void {
    const timer = this.expirationTimers.get(userId);
    if (timer) {
      clearTimeout(timer);
      this.expirationTimers.delete(userId);
    }
  }

  /**
   * Get conversation suggestions for two emotional states
   */
  private getConversationSuggestions(
    state1: EmotionalState,
    state2: EmotionalState
  ): string[] {
    // Handle 'need_space' specially
    if (state1 === 'need_space' || state2 === 'need_space') {
      return CONVERSATION_SUGGESTIONS['need_space:any'] || [];
    }

    // Try both orderings
    const key1 = `${state1}:${state2}`;
    const key2 = `${state2}:${state1}`;

    if (CONVERSATION_SUGGESTIONS[key1]) {
      return CONVERSATION_SUGGESTIONS[key1];
    }

    if (CONVERSATION_SUGGESTIONS[key2]) {
      return CONVERSATION_SUGGESTIONS[key2];
    }

    // Default suggestions
    return [
      'Be genuine and authentic in your conversation',
      'Show interest in their experiences',
      'Share something about yourself',
    ];
  }

  /**
   * Check if two states are complementary
   */
  private areStatesComplementary(state1: EmotionalState, state2: EmotionalState): boolean {
    // Define complementary pairs
    const complementaryPairs: [EmotionalState, EmotionalState][] = [
      ['open_to_connect', 'open_to_connect'],
      ['open_to_connect', 'feeling_adventurous'],
      ['casual_chat', 'casual_chat'],
      ['deep_conversations', 'deep_conversations'],
      ['deep_conversations', 'seeking_comfort'],
      ['feeling_adventurous', 'feeling_adventurous'],
      ['seeking_comfort', 'seeking_comfort'],
    ];

    return complementaryPairs.some(
      ([a, b]) => (state1 === a && state2 === b) || (state1 === b && state2 === a)
    );
  }

  /**
   * Get a human-readable reason for match compatibility
   */
  private getMatchReason(
    userState: EmotionalState,
    matchState: EmotionalState | null,
    compatibility: EmotionalCompatibility
  ): string {
    if (!matchState) {
      return 'This user has not set their emotional availability';
    }

    const stateDescriptions: Record<EmotionalState, string> = {
      open_to_connect: 'open to connecting',
      casual_chat: 'looking for casual chat',
      deep_conversations: 'interested in deep conversations',
      need_space: 'needing some space',
      feeling_adventurous: 'feeling adventurous',
      seeking_comfort: 'seeking comfort',
    };

    const matchDescription = stateDescriptions[matchState];

    switch (compatibility.compatibilityLevel) {
      case 'high':
        return `Great match! They're ${matchDescription}, which complements your mood perfectly`;
      case 'medium':
        return `Good potential! They're ${matchDescription}`;
      case 'low':
        return `They're ${matchDescription}, which may not align well right now`;
      case 'incompatible':
        return `They're ${matchDescription} - consider reaching out later`;
      default:
        return `They're ${matchDescription}`;
    }
  }
}

// Export singleton for use outside NestJS DI
export const emotionalAvailabilityService = new EmotionalAvailabilityService();
export default emotionalAvailabilityService;
