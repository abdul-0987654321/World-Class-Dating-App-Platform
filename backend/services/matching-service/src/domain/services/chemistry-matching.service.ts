/**
 * Chemistry Matching Service
 * Pheromone-Inspired Matching Algorithm
 *
 * A novel matching algorithm inspired by biological attraction signals,
 * using behavioral proxies for "chemistry" - complementary personality traits,
 * communication rhythm sync, and mutual engagement patterns.
 *
 * This is an EXPERIMENTAL/RESEARCH feature (Tier 4).
 * Feature flag: innovative_chemistry_matching (0% rollout)
 *
 * Key Concepts:
 * 1. Rhythm Sync - Activity patterns, response timing, online schedule overlap
 * 2. Engagement Style - How users show interest, conversation patterns
 * 3. Personality Complement - Opposites attract vs similarity theory
 * 4. Mystery Factor - Unpredictability score that keeps interest alive
 * 5. Energy Match - Message enthusiasm, emoji patterns, expressiveness
 */

import { createLogger } from '@flamoral/backend-shared';

import {
  // Core types
  ChemistryProfile,
  ChemistryScore,
  ChemistryDimensions,
  ChemistryMatch,
  ChemistryFactor,
  ChemistryExplanation,
  ChemistryPrediction,

  // Behavioral types
  BehavioralSignal,
  BehavioralSignalType,
  RhythmPattern,
  EngagementStyle,
  PersonalityComplement,
  PersonalityType,

  // Anti-patterns
  ChemistryAntiPattern,
  ChemistryAntiPatternType,

  // Request/Response types
  BuildChemistryProfileRequest,
  FindHighChemistryMatchesRequest,
  FindHighChemistryMatchesResponse,
  ConversationData,
  ChemistryFeedback,

  // Configuration
  ChemistryConfig,
  DEFAULT_CHEMISTRY_CONFIG,
} from '../../types/chemistry-matching.types';

const logger = createLogger('chemistry-matching-service');

// ============================================================================
// FEATURE FLAG
// ============================================================================

/**
 * Check if chemistry matching feature is enabled for a user
 * Currently at 0% rollout (research/experimental)
 */
function isFeatureEnabled(userId: string, config: ChemistryConfig = DEFAULT_CHEMISTRY_CONFIG): boolean {
  if (!config.enabled) {
    return false;
  }

  // Hash-based rollout for consistent user experience
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash) % 100 < config.rolloutPercentage;
}

// ============================================================================
// CHEMISTRY MATCHING SERVICE
// ============================================================================

export class ChemistryMatchingService {
  private config: ChemistryConfig;

  // In-memory storage for profiles (replace with database in production)
  private profiles: Map<string, ChemistryProfile> = new Map();
  private feedbackHistory: Map<string, ChemistryFeedback[]> = new Map();

  constructor(config?: Partial<ChemistryConfig>) {
    this.config = {
      ...DEFAULT_CHEMISTRY_CONFIG,
      ...config,
    };

    logger.info('Chemistry Matching Service initialized', {
      enabled: this.config.enabled,
      rolloutPercentage: this.config.rolloutPercentage,
    });
  }

  // ==========================================================================
  // PUBLIC API
  // ==========================================================================

  /**
   * Check if the feature is available for a user
   */
  isAvailable(userId: string): boolean {
    return isFeatureEnabled(userId, this.config);
  }

  /**
   * Build or update a chemistry profile from behavioral data
   *
   * Extracts chemistry signals from:
   * - Activity logs (timing patterns)
   * - Message history (communication style)
   * - Swipe history (preference patterns)
   * - Profile interactions (engagement depth)
   */
  async buildChemistryProfile(request: BuildChemistryProfileRequest): Promise<ChemistryProfile> {
    const { userId, behaviorData, forceRebuild } = request;
    const startTime = Date.now();

    logger.info('Building chemistry profile', { userId, forceRebuild });

    // Check if we have an existing profile and sufficient new data
    const existingProfile = this.profiles.get(userId);
    if (existingProfile && !forceRebuild) {
      const hoursSinceLastUpdate =
        (Date.now() - existingProfile.lastCalculated.getTime()) / (1000 * 60 * 60);

      if (hoursSinceLastUpdate < this.config.profileUpdateInterval) {
        logger.debug('Using cached chemistry profile', { userId, hoursSinceLastUpdate });
        return existingProfile;
      }
    }

    // Extract behavioral signals
    const behavioralSignals = this.extractBehavioralSignals(behaviorData);

    // Build rhythm patterns
    const rhythmPatterns = this.buildRhythmPatterns(behaviorData.activityLogs);

    // Analyze engagement style
    const engagementStyle = this.analyzeEngagementStyle(behaviorData.messageHistory);

    // Infer personality profile
    const personalityProfile = this.inferPersonalityProfile(behaviorData);

    // Determine primary personality type
    const primaryPersonalityType = this.classifyPersonalityType(personalityProfile);

    // Calculate energy and mystery factors
    const energyLevel = this.calculateEnergyLevel(engagementStyle, behaviorData);
    const mysteryFactor = this.calculateMysteryFactor(behaviorData);
    const warmthFactor = this.calculateWarmthFactor(engagementStyle, behaviorData.messageHistory);

    // Assess data quality
    const totalInteractions =
      behaviorData.activityLogs.length +
      behaviorData.messageHistory.length +
      behaviorData.swipeHistory.length;

    const dataQuality = this.assessDataQuality(totalInteractions);

    const profile: ChemistryProfile = {
      userId,
      behavioralSignals,
      rhythmPatterns,
      engagementStyle,
      personalityProfile,
      primaryPersonalityType,
      energyLevel,
      mysteryFactor,
      warmthFactor,
      dataQuality,
      totalInteractions,
      profileAge: existingProfile
        ? existingProfile.profileAge
        : 0, // Would be calculated from user creation date
      lastCalculated: new Date(),
      version: 1,
    };

    // Store the profile
    this.profiles.set(userId, profile);

    logger.info('Chemistry profile built', {
      userId,
      dataQuality,
      totalInteractions,
      processingTimeMs: Date.now() - startTime,
    });

    return profile;
  }

  /**
   * Calculate chemistry score between two profiles
   *
   * Combines multiple dimensions:
   * - Rhythm synchronization
   * - Engagement style compatibility
   * - Personality complementarity
   * - Mystery balance
   * - Energy match
   */
  calculateChemistryScore(profile1: ChemistryProfile, profile2: ChemistryProfile): ChemistryScore {
    const weights = this.config.defaultWeights;

    // Calculate individual dimension scores
    const rhythmSync = this.calculateRhythmSyncScore(profile1, profile2);
    const engagementMatch = this.calculateEngagementMatchScore(profile1, profile2);
    const personalityComplement = this.calculatePersonalityComplementScore(profile1, profile2);
    const mysteryBalance = this.calculateMysteryBalanceScore(profile1, profile2);
    const energyMatch = this.calculateEnergyMatchScore(profile1, profile2);

    // Calculate sub-dimensions
    const timingCompatibility = this.calculateTimingCompatibility(profile1, profile2);
    const conversationFlow = this.calculateConversationFlowScore(profile1, profile2);
    const emotionalResonance = this.calculateEmotionalResonanceScore(profile1, profile2);

    const dimensions: ChemistryDimensions = {
      rhythmSync,
      engagementMatch,
      personalityComplement,
      mysteryBalance,
      energyMatch,
      timingCompatibility,
      conversationFlow,
      emotionalResonance,
    };

    // Calculate weighted overall score
    const overall = Math.round(
      rhythmSync * weights.rhythmSync +
      engagementMatch * weights.engagementMatch +
      personalityComplement * weights.personalityComplement +
      mysteryBalance * weights.mysteryBalance +
      energyMatch * weights.energyMatch
    );

    // Calculate confidence based on data quality
    const confidence = this.calculateScoreConfidence(profile1, profile2);

    // Detect anti-patterns
    const antiPatterns = this.detectAntiPatterns(profile1, profile2, dimensions);

    // Determine spark potential
    const sparkPotential = this.determineSparkPotential(overall, antiPatterns, dimensions);

    return {
      overall,
      confidence,
      dimensions,
      weights,
      sparkPotential,
      antiPatterns,
    };
  }

  /**
   * Find high chemistry matches from a list of candidates
   */
  async findHighChemistryMatches(
    request: FindHighChemistryMatchesRequest
  ): Promise<FindHighChemistryMatchesResponse> {
    const {
      userId,
      candidateIds,
      limit = 20,
      minimumScore = this.config.highChemistryThreshold,
      includeExplanations = true,
    } = request;

    const startTime = Date.now();
    logger.info('Finding high chemistry matches', { userId, candidateCount: candidateIds.length });

    // Get user's profile
    const userProfile = this.profiles.get(userId);
    if (!userProfile) {
      logger.warn('User profile not found for chemistry matching', { userId });
      return {
        matches: [],
        totalCandidates: candidateIds.length,
        profilesWithInsufficientData: [userId],
        calculationTime: Date.now() - startTime,
      };
    }

    const matches: ChemistryMatch[] = [];
    const insufficientData: string[] = [];

    for (const candidateId of candidateIds) {
      const candidateProfile = this.profiles.get(candidateId);

      if (!candidateProfile) {
        insufficientData.push(candidateId);
        continue;
      }

      if (candidateProfile.dataQuality === 'insufficient') {
        insufficientData.push(candidateId);
        continue;
      }

      // Calculate chemistry score
      const score = this.calculateChemistryScore(userProfile, candidateProfile);

      if (score.overall >= minimumScore) {
        const match: ChemistryMatch = {
          userId,
          matchId: candidateId,
          score,
          chemistryFactors: this.extractChemistryFactors(userProfile, candidateProfile, score),
          explanation: includeExplanations
            ? this.explainChemistry(score, userProfile, candidateProfile)
            : this.getMinimalExplanation(score),
          predictedOutcome: this.predictOutcome(score),
          calculatedAt: new Date(),
          algorithmVersion: '1.0.0',
        };

        matches.push(match);
      }
    }

    // Sort by overall score descending
    matches.sort((a, b) => b.score.overall - a.score.overall);

    // Limit results
    const limitedMatches = matches.slice(0, limit);

    logger.info('High chemistry matches found', {
      userId,
      matchesFound: limitedMatches.length,
      totalCandidates: candidateIds.length,
      insufficientDataCount: insufficientData.length,
      calculationTimeMs: Date.now() - startTime,
    });

    return {
      matches: limitedMatches,
      totalCandidates: candidateIds.length,
      profilesWithInsufficientData: insufficientData,
      calculationTime: Date.now() - startTime,
    };
  }

  /**
   * Generate human-readable explanation of chemistry score
   */
  explainChemistry(
    score: ChemistryScore,
    profile1: ChemistryProfile,
    profile2: ChemistryProfile
  ): ChemistryExplanation {
    const highlights: string[] = [];
    const concerns: string[] = [];
    const tips: string[] = [];
    const iceBreakers: string[] = [];

    // Analyze rhythm sync
    if (score.dimensions.rhythmSync >= 75) {
      highlights.push('Your online schedules align well - you\'re both active around the same times.');
    } else if (score.dimensions.rhythmSync < 40) {
      concerns.push('You have different activity patterns, which might mean delayed responses.');
      tips.push('Be patient with response times and communicate your preferred times to chat.');
    }

    // Analyze engagement match
    if (score.dimensions.engagementMatch >= 75) {
      highlights.push('You have compatible communication styles.');
      if (profile1.engagementStyle.questionAsking > 0.6 && profile2.engagementStyle.questionAsking > 0.6) {
        highlights.push('You both enjoy asking questions - conversations could flow naturally!');
      }
    } else if (score.dimensions.engagementMatch < 40) {
      concerns.push('Your messaging styles differ - one of you might prefer longer conversations.');
      tips.push('Try to match each other\'s energy in messages.');
    }

    // Analyze personality complement
    if (score.dimensions.personalityComplement >= 75) {
      if (this.areOppositeTypes(profile1.primaryPersonalityType, profile2.primaryPersonalityType)) {
        highlights.push('You\'re different in complementary ways - opposites that could attract!');
      } else {
        highlights.push('You share similar personality traits - you\'ll likely understand each other well.');
      }
    }

    // Analyze energy match
    if (score.dimensions.energyMatch >= 70) {
      highlights.push('Your conversation energy levels are well-matched.');
    } else if (Math.abs(profile1.energyLevel - profile2.energyLevel) > 0.4) {
      concerns.push('There\'s an energy gap - one person might seem more enthusiastic than the other.');
    }

    // Analyze mystery factor
    if (score.dimensions.mysteryBalance >= 70) {
      highlights.push('There\'s just the right amount of intrigue to keep things interesting.');
    }

    // Generate ice breakers based on profiles
    iceBreakers.push(...this.generateIceBreakers(profile1, profile2));

    // Add anti-pattern concerns
    for (const antiPattern of score.antiPatterns) {
      if (antiPattern.severity === 'major') {
        concerns.push(antiPattern.description);
        if (antiPattern.recommendation) {
          tips.push(antiPattern.recommendation);
        }
      }
    }

    // Generate summary
    let summary: string;
    if (score.sparkPotential === 'exceptional') {
      summary = 'Exceptional chemistry potential! Your behavioral patterns suggest a strong natural connection.';
    } else if (score.sparkPotential === 'high') {
      summary = 'High chemistry signals detected. You have complementary communication styles and compatible rhythms.';
    } else if (score.sparkPotential === 'medium') {
      summary = 'Moderate chemistry indicators. With some effort, you could have engaging conversations.';
    } else {
      summary = 'Different behavioral patterns detected. Chemistry might take more time to develop.';
    }

    return {
      summary,
      highlights: highlights.slice(0, 4),
      concerns: concerns.slice(0, 3),
      tips: tips.slice(0, 3),
      iceBreakers: iceBreakers.slice(0, 3),
    };
  }

  /**
   * Update chemistry model from actual interaction data
   * This is how the algorithm learns and improves
   */
  async updateChemistryFromInteraction(conversationData: ConversationData): Promise<ChemistryFeedback> {
    const { matchId, userId, partnerId } = conversationData;

    logger.info('Updating chemistry from interaction', { matchId, userId, partnerId });

    // Get the profiles
    const userProfile = this.profiles.get(userId);
    const partnerProfile = this.profiles.get(partnerId);

    if (!userProfile || !partnerProfile) {
      logger.warn('Profiles not found for chemistry update', { userId, partnerId });
      throw new Error('Profiles not found');
    }

    // Calculate what we predicted
    const predictedScore = this.calculateChemistryScore(userProfile, partnerProfile);

    // Calculate actual engagement from conversation data
    const actualEngagement = this.calculateActualEngagement(conversationData);

    // Calculate prediction error
    const predictionError = actualEngagement - (predictedScore.overall / 100);

    // Determine adjustment factors based on what we got wrong
    const adjustmentFactors = this.calculateAdjustmentFactors(
      predictedScore,
      conversationData,
      predictionError
    );

    const feedback: ChemistryFeedback = {
      matchId,
      userId,
      predictedScore: predictedScore.overall,
      actualEngagement: Math.round(actualEngagement * 100),
      predictionError,
      adjustmentFactors,
      createdAt: new Date(),
    };

    // Store feedback for learning
    const userFeedback = this.feedbackHistory.get(userId) || [];
    userFeedback.push(feedback);
    this.feedbackHistory.set(userId, userFeedback);

    // Update profiles based on new interaction data
    await this.updateProfileFromConversation(userId, conversationData);

    logger.info('Chemistry update completed', {
      matchId,
      predictedScore: predictedScore.overall,
      actualEngagement: Math.round(actualEngagement * 100),
      predictionError: predictionError.toFixed(2),
    });

    return feedback;
  }

  /**
   * Get a user's chemistry profile
   */
  getProfile(userId: string): ChemistryProfile | null {
    return this.profiles.get(userId) || null;
  }

  // ==========================================================================
  // BEHAVIORAL SIGNAL EXTRACTION
  // ==========================================================================

  private extractBehavioralSignals(
    behaviorData: BuildChemistryProfileRequest['behaviorData']
  ): BehavioralSignal[] {
    const signals: BehavioralSignal[] = [];
    const now = new Date();

    // Extract activity timing signal
    if (behaviorData.activityLogs.length > 0) {
      const hourDistribution = new Array(24).fill(0);
      for (const log of behaviorData.activityLogs) {
        const hour = new Date(log.timestamp).getHours();
        hourDistribution[hour]++;
      }
      const maxActivity = Math.max(...hourDistribution);
      const normalizedValue = maxActivity > 0 ? hourDistribution.reduce((a, b) => a + b, 0) / (24 * maxActivity) : 0.5;

      signals.push({
        type: BehavioralSignalType.ACTIVITY_TIMING,
        value: normalizedValue,
        confidence: Math.min(behaviorData.activityLogs.length / 100, 1),
        sampleSize: behaviorData.activityLogs.length,
        lastUpdated: now,
      });
    }

    // Extract response latency signal
    const responseTimes = behaviorData.messageHistory
      .filter((m) => m.responseLatency !== undefined)
      .map((m) => m.responseLatency!);

    if (responseTimes.length > 0) {
      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      // Normalize: < 5 min = 1.0, > 60 min = 0.0
      const normalizedValue = Math.max(0, Math.min(1, 1 - (avgResponseTime - 5) / 55));

      signals.push({
        type: BehavioralSignalType.RESPONSE_LATENCY,
        value: normalizedValue,
        confidence: Math.min(responseTimes.length / 50, 1),
        sampleSize: responseTimes.length,
        lastUpdated: now,
      });
    }

    // Extract message length signal
    if (behaviorData.messageHistory.length > 0) {
      const avgLength =
        behaviorData.messageHistory.reduce((a, b) => a + b.messageLength, 0) /
        behaviorData.messageHistory.length;
      // Normalize: 0-500 chars
      const normalizedValue = Math.min(1, avgLength / 500);

      signals.push({
        type: BehavioralSignalType.MESSAGE_LENGTH,
        value: normalizedValue,
        confidence: Math.min(behaviorData.messageHistory.length / 50, 1),
        sampleSize: behaviorData.messageHistory.length,
        lastUpdated: now,
      });
    }

    // Extract question frequency signal
    if (behaviorData.messageHistory.length > 0) {
      const questionCount = behaviorData.messageHistory.filter((m) => m.hasQuestion).length;
      const questionRatio = questionCount / behaviorData.messageHistory.length;

      signals.push({
        type: BehavioralSignalType.QUESTION_FREQUENCY,
        value: questionRatio,
        confidence: Math.min(behaviorData.messageHistory.length / 50, 1),
        sampleSize: behaviorData.messageHistory.length,
        lastUpdated: now,
      });
    }

    // Extract emoji usage signal
    if (behaviorData.messageHistory.length > 0) {
      const emojiCount = behaviorData.messageHistory.filter((m) => m.hasEmoji).length;
      const emojiRatio = emojiCount / behaviorData.messageHistory.length;

      signals.push({
        type: BehavioralSignalType.EMOJI_USAGE,
        value: emojiRatio,
        confidence: Math.min(behaviorData.messageHistory.length / 50, 1),
        sampleSize: behaviorData.messageHistory.length,
        lastUpdated: now,
      });
    }

    // Extract swipe velocity signal
    if (behaviorData.swipeHistory.length > 0) {
      const avgViewTime =
        behaviorData.swipeHistory.reduce((a, b) => a + b.viewDuration, 0) /
        behaviorData.swipeHistory.length;
      // Normalize: 1-30 seconds (quick = low, thoughtful = high)
      const normalizedValue = Math.min(1, avgViewTime / 30);

      signals.push({
        type: BehavioralSignalType.SWIPE_VELOCITY,
        value: normalizedValue,
        confidence: Math.min(behaviorData.swipeHistory.length / 100, 1),
        sampleSize: behaviorData.swipeHistory.length,
        lastUpdated: now,
      });
    }

    // Extract profile view depth signal
    if (behaviorData.profileInteractions.length > 0) {
      const avgSections =
        behaviorData.profileInteractions.reduce((a, b) => a + b.sectionsViewed.length, 0) /
        behaviorData.profileInteractions.length;
      // Normalize: 1-5 sections
      const normalizedValue = Math.min(1, avgSections / 5);

      signals.push({
        type: BehavioralSignalType.PROFILE_VIEW_DEPTH,
        value: normalizedValue,
        confidence: Math.min(behaviorData.profileInteractions.length / 50, 1),
        sampleSize: behaviorData.profileInteractions.length,
        lastUpdated: now,
      });
    }

    return signals;
  }

  // ==========================================================================
  // RHYTHM PATTERN ANALYSIS
  // ==========================================================================

  private buildRhythmPatterns(
    activityLogs: BuildChemistryProfileRequest['behaviorData']['activityLogs']
  ): RhythmPattern {
    // Calculate hourly distribution
    const hourlyDistribution = new Array(24).fill(0);
    const weeklyDistribution = new Array(7).fill(0);
    let totalSessionDuration = 0;
    let sessionCount = 0;

    for (const log of activityLogs) {
      const date = new Date(log.timestamp);
      hourlyDistribution[date.getHours()]++;
      weeklyDistribution[date.getDay()]++;
      totalSessionDuration += log.sessionDuration;
      sessionCount++;
    }

    // Normalize distributions
    const maxHourly = Math.max(...hourlyDistribution, 1);
    const maxWeekly = Math.max(...weeklyDistribution, 1);

    const normalizedHourly = hourlyDistribution.map((v) => v / maxHourly);
    const normalizedWeekly = weeklyDistribution.map((v) => v / maxWeekly);

    // Determine chronotype
    const morningActivity = normalizedHourly.slice(5, 12).reduce((a, b) => a + b, 0);
    const eveningActivity = normalizedHourly.slice(18, 24).reduce((a, b) => a + b, 0);
    const nightActivity = normalizedHourly.slice(0, 5).reduce((a, b) => a + b, 0) +
      normalizedHourly.slice(22, 24).reduce((a, b) => a + b, 0);

    let chronotype: RhythmPattern['chronotype'] = 'balanced';
    let chronotypeStrength = 0;

    if (morningActivity > eveningActivity * 1.5 && morningActivity > nightActivity * 1.5) {
      chronotype = 'early_bird';
      chronotypeStrength = morningActivity / (morningActivity + eveningActivity + nightActivity);
    } else if (eveningActivity > morningActivity * 1.5 || nightActivity > morningActivity * 1.5) {
      chronotype = 'night_owl';
      chronotypeStrength = (eveningActivity + nightActivity) / (morningActivity + eveningActivity + nightActivity);
    }

    // Calculate response time metrics (placeholder - would come from message data)
    const avgResponseTime = 15; // minutes
    const responseTimeVariance = 10;

    return {
      hourlyDistribution: normalizedHourly,
      weeklyDistribution: normalizedWeekly,
      averageResponseTime: avgResponseTime,
      responseTimeVariance,
      averageSessionDuration: sessionCount > 0 ? totalSessionDuration / sessionCount : 0,
      sessionsPerDay: sessionCount / Math.max(1, activityLogs.length / 24),
      chronotype,
      chronotypeStrength,
    };
  }

  // ==========================================================================
  // ENGAGEMENT STYLE ANALYSIS
  // ==========================================================================

  private analyzeEngagementStyle(
    messageHistory: BuildChemistryProfileRequest['behaviorData']['messageHistory']
  ): EngagementStyle {
    if (messageHistory.length === 0) {
      return this.getDefaultEngagementStyle();
    }

    // Calculate initiation tendency
    const initiations = messageHistory.filter((m) => !m.responseToPartner).length;
    const initiationTendency = initiations / messageHistory.length;

    // Calculate question asking
    const questionCount = messageHistory.filter((m) => m.hasQuestion).length;
    const questionAsking = questionCount / messageHistory.length;

    // Calculate emotional expressiveness (emoji usage as proxy)
    const emojiCount = messageHistory.filter((m) => m.hasEmoji).length;
    const emotionalExpressiveness = emojiCount / messageHistory.length;

    // Calculate message length stats
    const avgMessageLength =
      messageHistory.reduce((a, b) => a + b.messageLength, 0) / messageHistory.length;

    // Calculate message frequency
    const messagesByMatch = new Map<string, number>();
    for (const msg of messageHistory) {
      messagesByMatch.set(msg.matchId, (messagesByMatch.get(msg.matchId) || 0) + 1);
    }
    const avgMessagesPerMatch =
      Array.from(messagesByMatch.values()).reduce((a, b) => a + b, 0) /
      Math.max(1, messagesByMatch.size);

    return {
      initiationTendency,
      questionAsking,
      emotionalExpressiveness,
      averageMessageLength: avgMessageLength,
      messageFrequencyInConvo: avgMessagesPerMatch / 24, // Rough estimate
      useOfMedia: 0.3, // Placeholder - would need media message data
      humorIndex: 0.5, // Placeholder - would need NLP analysis
      complimentFrequency: 0.3, // Placeholder
      topicExpansion: 0.5, // Placeholder
      activeListeningIndicators: questionAsking * 0.8, // Proxy
    };
  }

  private getDefaultEngagementStyle(): EngagementStyle {
    return {
      initiationTendency: 0.5,
      questionAsking: 0.5,
      emotionalExpressiveness: 0.5,
      averageMessageLength: 100,
      messageFrequencyInConvo: 5,
      useOfMedia: 0.3,
      humorIndex: 0.5,
      complimentFrequency: 0.3,
      topicExpansion: 0.5,
      activeListeningIndicators: 0.5,
    };
  }

  // ==========================================================================
  // PERSONALITY INFERENCE
  // ==========================================================================

  private inferPersonalityProfile(
    behaviorData: BuildChemistryProfileRequest['behaviorData']
  ): PersonalityComplement {
    // Infer Big Five traits from behavioral data
    // These are approximations based on observable behavior

    const engagementStyle = this.analyzeEngagementStyle(behaviorData.messageHistory);

    // Openness - inferred from variety of interests and profile exploration
    const profileViewVariety = new Set(behaviorData.profileInteractions.map((p) => p.targetUserId)).size;
    const openness = Math.min(1, profileViewVariety / 50);

    // Conscientiousness - inferred from response consistency
    const conscientiousness = this.inferConscientiousness(behaviorData);

    // Extraversion - inferred from initiation and expressiveness
    const extraversion = (engagementStyle.initiationTendency + engagementStyle.emotionalExpressiveness) / 2;

    // Agreeableness - inferred from compliment frequency and active listening
    const agreeableness = (engagementStyle.complimentFrequency + engagementStyle.activeListeningIndicators) / 2;

    // Emotional stability - inferred from message consistency
    const emotionalStability = this.inferEmotionalStability(behaviorData);

    // Dating-specific traits
    const adventurousness = openness * 0.7 + extraversion * 0.3;
    const romanticIntensity = engagementStyle.emotionalExpressiveness * 0.6 + engagementStyle.complimentFrequency * 0.4;
    const independenceNeed = 1 - (engagementStyle.messageFrequencyInConvo / 20);
    const socialBatterySize = extraversion * 0.8 + 0.2;

    // Determine if attracted to opposites (placeholder logic)
    const attractedToOpposites = extraversion < 0.4 || extraversion > 0.6;

    // Compatible types based on personality
    const compatibleTypes = this.determineCompatibleTypes({
      openness,
      conscientiousness,
      extraversion,
      agreeableness,
      emotionalStability,
      adventurousness,
      romanticIntensity,
      independenceNeed,
      socialBatterySize,
      attractedToOpposites,
      compatibleTypes: [],
    });

    return {
      openness,
      conscientiousness,
      extraversion,
      agreeableness,
      emotionalStability,
      adventurousness,
      romanticIntensity,
      independenceNeed,
      socialBatterySize,
      attractedToOpposites,
      compatibleTypes,
    };
  }

  private inferConscientiousness(
    behaviorData: BuildChemistryProfileRequest['behaviorData']
  ): number {
    // Based on response time consistency
    const responseTimes = behaviorData.messageHistory
      .filter((m) => m.responseLatency !== undefined)
      .map((m) => m.responseLatency!);

    if (responseTimes.length < 5) return 0.5;

    const mean = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const variance =
      responseTimes.reduce((sum, time) => sum + Math.pow(time - mean, 2), 0) / responseTimes.length;
    const stdDev = Math.sqrt(variance);

    // Low variance = high conscientiousness
    return Math.max(0, Math.min(1, 1 - stdDev / mean));
  }

  private inferEmotionalStability(
    behaviorData: BuildChemistryProfileRequest['behaviorData']
  ): number {
    // Based on activity consistency
    if (behaviorData.activityLogs.length < 10) return 0.5;

    const sessionsPerDay = behaviorData.activityLogs.map((log) => {
      return new Date(log.timestamp).toDateString();
    });

    const uniqueDays = new Set(sessionsPerDay).size;
    const totalSessions = behaviorData.activityLogs.length;

    // More consistent daily activity = higher emotional stability
    return Math.min(1, uniqueDays / (totalSessions / 3));
  }

  private determineCompatibleTypes(profile: PersonalityComplement): PersonalityType[] {
    const types: PersonalityType[] = [];

    // Explorers are compatible with nurturers and other explorers
    if (profile.openness > 0.6) {
      types.push('explorer', 'nurturer');
    }

    // Nurturers are compatible with most types
    if (profile.agreeableness > 0.6) {
      types.push('nurturer', 'achiever', 'connector');
    }

    // Achievers appreciate other achievers and thinkers
    if (profile.conscientiousness > 0.6) {
      types.push('achiever', 'thinker');
    }

    // Connectors work well with romantics and other connectors
    if (profile.extraversion > 0.6) {
      types.push('connector', 'romantic');
    }

    // Add balanced as a fallback
    if (types.length === 0) {
      types.push('balanced');
    }

    return [...new Set(types)];
  }

  private classifyPersonalityType(profile: PersonalityComplement): PersonalityType {
    const traits = [
      { type: 'explorer' as PersonalityType, value: profile.openness },
      { type: 'nurturer' as PersonalityType, value: profile.agreeableness },
      { type: 'achiever' as PersonalityType, value: profile.conscientiousness },
      { type: 'connector' as PersonalityType, value: profile.extraversion },
      { type: 'romantic' as PersonalityType, value: profile.romanticIntensity },
    ];

    traits.sort((a, b) => b.value - a.value);

    // Return dominant type if it's significantly higher, otherwise balanced
    if (traits[0].value > 0.65 && traits[0].value - traits[1].value > 0.15) {
      return traits[0].type;
    }

    return 'balanced';
  }

  // ==========================================================================
  // CHEMISTRY FACTOR CALCULATIONS
  // ==========================================================================

  private calculateEnergyLevel(
    engagementStyle: EngagementStyle,
    behaviorData: BuildChemistryProfileRequest['behaviorData']
  ): number {
    // Energy is a combination of expressiveness, message frequency, and session intensity
    const expressiveness = engagementStyle.emotionalExpressiveness;
    const messageIntensity = Math.min(1, engagementStyle.messageFrequencyInConvo / 10);

    const avgSessionActions =
      behaviorData.activityLogs.length > 0
        ? behaviorData.activityLogs.reduce((a, b) => a + b.actionsCount, 0) /
          behaviorData.activityLogs.length
        : 10;
    const activityIntensity = Math.min(1, avgSessionActions / 50);

    return (expressiveness * 0.4 + messageIntensity * 0.3 + activityIntensity * 0.3);
  }

  private calculateMysteryFactor(
    behaviorData: BuildChemistryProfileRequest['behaviorData']
  ): number {
    // Mystery is inversely related to predictability
    // High variance in behavior = more mysterious

    const activityVariance = this.calculateActivityVariance(behaviorData.activityLogs);
    const responseVariance = this.calculateResponseVariance(behaviorData.messageHistory);

    // Also consider how much they reveal (inverse of profile view depth)
    const profileDepth =
      behaviorData.profileInteractions.length > 0
        ? behaviorData.profileInteractions.reduce((a, b) => a + b.sectionsViewed.length, 0) /
          behaviorData.profileInteractions.length / 5
        : 0.5;

    const unpredictability = (activityVariance + responseVariance) / 2;

    // Some mystery is good, too much can be off-putting
    // Optimal range is 0.3-0.7
    return Math.min(1, Math.max(0, unpredictability * 0.6 + (1 - profileDepth) * 0.4));
  }

  private calculateActivityVariance(
    activityLogs: BuildChemistryProfileRequest['behaviorData']['activityLogs']
  ): number {
    if (activityLogs.length < 5) return 0.5;

    const hours = activityLogs.map((log) => new Date(log.timestamp).getHours());
    const mean = hours.reduce((a, b) => a + b, 0) / hours.length;
    const variance = hours.reduce((sum, h) => sum + Math.pow(h - mean, 2), 0) / hours.length;

    // Normalize variance (0-144 range for hours)
    return Math.min(1, Math.sqrt(variance) / 12);
  }

  private calculateResponseVariance(
    messageHistory: BuildChemistryProfileRequest['behaviorData']['messageHistory']
  ): number {
    const responseTimes = messageHistory
      .filter((m) => m.responseLatency !== undefined)
      .map((m) => m.responseLatency!);

    if (responseTimes.length < 5) return 0.5;

    const mean = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const variance =
      responseTimes.reduce((sum, time) => sum + Math.pow(time - mean, 2), 0) / responseTimes.length;

    // Normalize (coefficient of variation)
    return Math.min(1, Math.sqrt(variance) / Math.max(1, mean));
  }

  private calculateWarmthFactor(
    engagementStyle: EngagementStyle,
    messageHistory: BuildChemistryProfileRequest['behaviorData']['messageHistory']
  ): number {
    // Warmth combines expressiveness, compliments, and active listening
    const expressiveness = engagementStyle.emotionalExpressiveness;
    const compliments = engagementStyle.complimentFrequency;
    const activeListening = engagementStyle.activeListeningIndicators;

    // Also consider emoji usage patterns
    const positiveEmojiUsage = messageHistory.filter((m) => m.hasEmoji).length / Math.max(1, messageHistory.length);

    return (expressiveness * 0.3 + compliments * 0.25 + activeListening * 0.25 + positiveEmojiUsage * 0.2);
  }

  // ==========================================================================
  // DIMENSION SCORE CALCULATIONS
  // ==========================================================================

  private calculateRhythmSyncScore(profile1: ChemistryProfile, profile2: ChemistryProfile): number {
    const rhythm1 = profile1.rhythmPatterns;
    const rhythm2 = profile2.rhythmPatterns;

    // Calculate hourly overlap (cosine similarity)
    const hourlyOverlap = this.cosineSimilarity(rhythm1.hourlyDistribution, rhythm2.hourlyDistribution);

    // Calculate weekly overlap
    const weeklyOverlap = this.cosineSimilarity(rhythm1.weeklyDistribution, rhythm2.weeklyDistribution);

    // Consider chronotype compatibility
    let chronotypeScore = 0.5;
    if (rhythm1.chronotype === rhythm2.chronotype) {
      chronotypeScore = 0.8;
    } else if (
      (rhythm1.chronotype === 'early_bird' && rhythm2.chronotype === 'night_owl') ||
      (rhythm1.chronotype === 'night_owl' && rhythm2.chronotype === 'early_bird')
    ) {
      // Opposite chronotypes can work if both are flexible (low strength)
      chronotypeScore = 0.3 + (1 - rhythm1.chronotypeStrength) * 0.2 + (1 - rhythm2.chronotypeStrength) * 0.2;
    }

    // Response time compatibility
    const responseTimeDiff = Math.abs(rhythm1.averageResponseTime - rhythm2.averageResponseTime);
    const responseTimeScore = Math.max(0, 1 - responseTimeDiff / 60);

    return Math.round(
      (hourlyOverlap * 0.35 + weeklyOverlap * 0.15 + chronotypeScore * 0.25 + responseTimeScore * 0.25) * 100
    );
  }

  private calculateEngagementMatchScore(profile1: ChemistryProfile, profile2: ChemistryProfile): number {
    const eng1 = profile1.engagementStyle;
    const eng2 = profile2.engagementStyle;

    // Message length compatibility (similar lengths work well)
    const lengthRatio = Math.min(eng1.averageMessageLength, eng2.averageMessageLength) /
      Math.max(eng1.averageMessageLength, eng2.averageMessageLength, 1);

    // Question asking balance (one should ask, one should answer, or both ask)
    const questionBalance = eng1.questionAsking + eng2.questionAsking > 0.5 ? 0.8 : 0.5;

    // Initiation balance (someone needs to initiate, but not always the same person)
    const initiationBalance = Math.min(eng1.initiationTendency, eng2.initiationTendency) > 0.3 ? 0.7 : 0.4;

    // Expressiveness compatibility
    const expressivenessDiff = Math.abs(eng1.emotionalExpressiveness - eng2.emotionalExpressiveness);
    const expressivenessScore = Math.max(0, 1 - expressivenessDiff);

    // Humor compatibility (both using humor is good)
    const humorScore = (eng1.humorIndex + eng2.humorIndex) / 2;

    return Math.round(
      (lengthRatio * 0.2 + questionBalance * 0.25 + initiationBalance * 0.2 +
       expressivenessScore * 0.2 + humorScore * 0.15) * 100
    );
  }

  private calculatePersonalityComplementScore(profile1: ChemistryProfile, profile2: ChemistryProfile): number {
    const pers1 = profile1.personalityProfile;
    const pers2 = profile2.personalityProfile;

    // Check if types are compatible
    const type1 = profile1.primaryPersonalityType;
    const type2 = profile2.primaryPersonalityType;

    let typeCompatibility = 0.5;
    if (pers1.compatibleTypes.includes(type2) || pers2.compatibleTypes.includes(type1)) {
      typeCompatibility = 0.8;
    }
    if (pers1.attractedToOpposites && this.areOppositeTypes(type1, type2)) {
      typeCompatibility = 0.9;
    }

    // Big Five compatibility (moderate differences often work best)
    const traitScores = [
      this.traitCompatibility(pers1.openness, pers2.openness),
      this.traitCompatibility(pers1.conscientiousness, pers2.conscientiousness),
      this.traitCompatibility(pers1.extraversion, pers2.extraversion),
      this.traitCompatibility(pers1.agreeableness, pers2.agreeableness),
      this.traitCompatibility(pers1.emotionalStability, pers2.emotionalStability),
    ];

    const traitScore = traitScores.reduce((a, b) => a + b, 0) / traitScores.length;

    // Independence compatibility (both very independent or both very interdependent works)
    const independenceGap = Math.abs(pers1.independenceNeed - pers2.independenceNeed);
    const independenceScore = Math.max(0, 1 - independenceGap);

    // Social battery compatibility
    const socialGap = Math.abs(pers1.socialBatterySize - pers2.socialBatterySize);
    const socialScore = Math.max(0, 1 - socialGap);

    return Math.round(
      (typeCompatibility * 0.3 + traitScore * 0.3 + independenceScore * 0.2 + socialScore * 0.2) * 100
    );
  }

  private traitCompatibility(trait1: number, trait2: number): number {
    // Moderate differences are often attractive
    const diff = Math.abs(trait1 - trait2);
    if (diff < 0.2) return 0.9; // Very similar
    if (diff < 0.4) return 1.0; // Optimal complementary
    if (diff < 0.6) return 0.7; // Still workable
    return 0.4; // Might clash
  }

  private areOppositeTypes(type1: PersonalityType, type2: PersonalityType): boolean {
    const opposites: Record<PersonalityType, PersonalityType[]> = {
      explorer: ['achiever', 'thinker'],
      nurturer: ['thinker'],
      achiever: ['explorer', 'romantic'],
      connector: ['thinker'],
      thinker: ['connector', 'nurturer', 'romantic'],
      romantic: ['achiever', 'thinker'],
      balanced: [],
    };

    return opposites[type1]?.includes(type2) || opposites[type2]?.includes(type1);
  }

  private calculateMysteryBalanceScore(profile1: ChemistryProfile, profile2: ChemistryProfile): number {
    // Both having some mystery is good
    // One being very mysterious and one being very open can be interesting
    const mystery1 = profile1.mysteryFactor;
    const mystery2 = profile2.mysteryFactor;

    // Average mystery should be in the sweet spot (0.3-0.6)
    const avgMystery = (mystery1 + mystery2) / 2;
    let mysteryQuality = 0.5;

    if (avgMystery >= 0.3 && avgMystery <= 0.6) {
      mysteryQuality = 1.0;
    } else if (avgMystery >= 0.2 && avgMystery <= 0.7) {
      mysteryQuality = 0.8;
    } else {
      mysteryQuality = 0.5;
    }

    // Complementary mystery (one mysterious, one open) can be exciting
    const mysteryDiff = Math.abs(mystery1 - mystery2);
    const complementaryBonus = mysteryDiff > 0.3 ? 0.1 : 0;

    return Math.round((mysteryQuality + complementaryBonus) * 100);
  }

  private calculateEnergyMatchScore(profile1: ChemistryProfile, profile2: ChemistryProfile): number {
    const energy1 = profile1.energyLevel;
    const energy2 = profile2.energyLevel;

    // Similar energy levels work best
    const energyDiff = Math.abs(energy1 - energy2);
    const matchScore = Math.max(0, 1 - energyDiff * 1.5);

    // But if both have high energy, that's extra good
    const highEnergyBonus = energy1 > 0.6 && energy2 > 0.6 ? 0.1 : 0;

    // Warmth also contributes to energy match
    const warmthMatch = 1 - Math.abs(profile1.warmthFactor - profile2.warmthFactor);

    return Math.round((matchScore * 0.6 + warmthMatch * 0.3 + highEnergyBonus) * 100);
  }

  private calculateTimingCompatibility(profile1: ChemistryProfile, profile2: ChemistryProfile): number {
    // Sub-dimension of rhythm sync focusing on immediate availability
    const rhythm1 = profile1.rhythmPatterns;
    const rhythm2 = profile2.rhythmPatterns;

    // Peak hours overlap
    const peakHours1 = rhythm1.hourlyDistribution
      .map((v, i) => ({ hour: i, value: v }))
      .filter((h) => h.value > 0.7)
      .map((h) => h.hour);

    const peakHours2 = rhythm2.hourlyDistribution
      .map((v, i) => ({ hour: i, value: v }))
      .filter((h) => h.value > 0.7)
      .map((h) => h.hour);

    const overlap = peakHours1.filter((h) => peakHours2.includes(h)).length;
    const maxPeak = Math.max(peakHours1.length, peakHours2.length, 1);

    return Math.round((overlap / maxPeak) * 100);
  }

  private calculateConversationFlowScore(profile1: ChemistryProfile, profile2: ChemistryProfile): number {
    const eng1 = profile1.engagementStyle;
    const eng2 = profile2.engagementStyle;

    // Good conversation flow: one asks, one expands; both engage
    const questionExpansionBalance =
      (eng1.questionAsking * eng2.topicExpansion + eng2.questionAsking * eng1.topicExpansion) / 2;

    // Active listening indicators
    const listeningScore = (eng1.activeListeningIndicators + eng2.activeListeningIndicators) / 2;

    return Math.round((questionExpansionBalance * 0.5 + listeningScore * 0.5) * 100);
  }

  private calculateEmotionalResonanceScore(profile1: ChemistryProfile, profile2: ChemistryProfile): number {
    // How well emotional expressions are likely to be received
    const warmth1 = profile1.warmthFactor;
    const warmth2 = profile2.warmthFactor;

    const eng1 = profile1.engagementStyle;
    const eng2 = profile2.engagementStyle;

    // Similar warmth levels create resonance
    const warmthMatch = 1 - Math.abs(warmth1 - warmth2);

    // Expressiveness alignment
    const expressivenessMatch = 1 - Math.abs(eng1.emotionalExpressiveness - eng2.emotionalExpressiveness);

    // Romantic intensity alignment
    const pers1 = profile1.personalityProfile;
    const pers2 = profile2.personalityProfile;
    const romanticMatch = 1 - Math.abs(pers1.romanticIntensity - pers2.romanticIntensity);

    return Math.round((warmthMatch * 0.4 + expressivenessMatch * 0.3 + romanticMatch * 0.3) * 100);
  }

  // ==========================================================================
  // ANTI-PATTERN DETECTION
  // ==========================================================================

  private detectAntiPatterns(
    profile1: ChemistryProfile,
    profile2: ChemistryProfile,
    dimensions: ChemistryDimensions
  ): ChemistryAntiPattern[] {
    const antiPatterns: ChemistryAntiPattern[] = [];

    // Completely opposite schedules
    if (dimensions.timingCompatibility < 20) {
      antiPatterns.push({
        type: ChemistryAntiPatternType.COMPLETELY_OPPOSITE_SCHEDULES,
        severity: 'major',
        description: 'You have very different online schedules, which may lead to delayed responses.',
        recommendation: 'Consider setting expectations about response times early on.',
      });
    }

    // Response time mismatch
    const responseTimeDiff = Math.abs(
      profile1.rhythmPatterns.averageResponseTime - profile2.rhythmPatterns.averageResponseTime
    );
    if (responseTimeDiff > 30) {
      antiPatterns.push({
        type: ChemistryAntiPatternType.RESPONSE_TIME_MISMATCH,
        severity: 'moderate',
        description: 'One of you typically responds much faster than the other.',
        recommendation: 'The faster responder should try not to read into slower responses.',
      });
    }

    // Energy level mismatch
    if (Math.abs(profile1.energyLevel - profile2.energyLevel) > 0.4) {
      antiPatterns.push({
        type: ChemistryAntiPatternType.ENERGY_LEVEL_MISMATCH,
        severity: 'moderate',
        description: 'Significant difference in communication energy levels.',
        recommendation: 'Try to match each other\'s energy gradually.',
      });
    }

    // Communication style clash
    const eng1 = profile1.engagementStyle;
    const eng2 = profile2.engagementStyle;
    const lengthRatio = Math.min(eng1.averageMessageLength, eng2.averageMessageLength) /
      Math.max(eng1.averageMessageLength, eng2.averageMessageLength, 1);

    if (lengthRatio < 0.3) {
      antiPatterns.push({
        type: ChemistryAntiPatternType.COMMUNICATION_STYLE_CLASH,
        severity: 'minor',
        description: 'Very different message length preferences.',
      });
    }

    // One-sided effort
    if (Math.abs(eng1.initiationTendency - eng2.initiationTendency) > 0.5) {
      antiPatterns.push({
        type: ChemistryAntiPatternType.ONE_SIDED_EFFORT,
        severity: 'moderate',
        description: 'One person may end up doing most of the initiating.',
        recommendation: 'The less frequent initiator should make extra effort to reach out.',
      });
    }

    // Independence conflict
    const pers1 = profile1.personalityProfile;
    const pers2 = profile2.personalityProfile;
    if (Math.abs(pers1.independenceNeed - pers2.independenceNeed) > 0.5) {
      antiPatterns.push({
        type: ChemistryAntiPatternType.INDEPENDENCE_CONFLICT,
        severity: 'moderate',
        description: 'Different needs for independence vs. togetherness.',
        recommendation: 'Have an early conversation about communication expectations.',
      });
    }

    return antiPatterns;
  }

  // ==========================================================================
  // SPARK AND PREDICTION
  // ==========================================================================

  private determineSparkPotential(
    overallScore: number,
    antiPatterns: ChemistryAntiPattern[],
    dimensions: ChemistryDimensions
  ): ChemistryScore['sparkPotential'] {
    const majorIssues = antiPatterns.filter((p) => p.severity === 'major').length;

    if (overallScore >= this.config.sparkThreshold && majorIssues === 0) {
      return 'exceptional';
    }
    if (overallScore >= this.config.highChemistryThreshold && majorIssues <= 1) {
      return 'high';
    }
    if (overallScore >= 50 && majorIssues <= 2) {
      return 'medium';
    }
    return 'low';
  }

  private predictOutcome(score: ChemistryScore): ChemistryPrediction {
    const baseProb = score.overall / 100;

    return {
      likelyToMatch: Math.min(0.95, baseProb * 1.2),
      likelyToMessage: Math.min(0.95, baseProb * 1.1),
      likelyToHaveLongConversation: baseProb * (score.dimensions.conversationFlow / 100),
      likelyToMeetUp: baseProb * 0.7 * (score.dimensions.emotionalResonance / 100),
      estimatedConversationDepth:
        score.dimensions.conversationFlow > 70 ? 'deep' :
        score.dimensions.conversationFlow > 40 ? 'moderate' : 'surface',
      estimatedResponseRate:
        score.dimensions.rhythmSync > 70 ? 'high' :
        score.dimensions.rhythmSync > 40 ? 'medium' : 'low',
    };
  }

  // ==========================================================================
  // EXPLANATION GENERATION
  // ==========================================================================

  private extractChemistryFactors(
    profile1: ChemistryProfile,
    profile2: ChemistryProfile,
    score: ChemistryScore
  ): ChemistryFactor[] {
    const factors: ChemistryFactor[] = [];

    // Rhythm factor
    factors.push({
      factor: 'Schedule Alignment',
      score: score.dimensions.rhythmSync,
      weight: this.config.defaultWeights.rhythmSync,
      positive: score.dimensions.rhythmSync >= 60,
      explanation: score.dimensions.rhythmSync >= 70
        ? 'Your online times overlap well'
        : score.dimensions.rhythmSync >= 40
        ? 'Some overlap in your schedules'
        : 'Different schedules may slow responses',
    });

    // Engagement factor
    factors.push({
      factor: 'Communication Style',
      score: score.dimensions.engagementMatch,
      weight: this.config.defaultWeights.engagementMatch,
      positive: score.dimensions.engagementMatch >= 60,
      explanation: score.dimensions.engagementMatch >= 70
        ? 'Compatible messaging styles'
        : 'Different but potentially complementary styles',
    });

    // Personality factor
    factors.push({
      factor: 'Personality Match',
      score: score.dimensions.personalityComplement,
      weight: this.config.defaultWeights.personalityComplement,
      positive: score.dimensions.personalityComplement >= 60,
      explanation: this.getPersonalityExplanation(profile1, profile2, score.dimensions.personalityComplement),
    });

    // Energy factor
    factors.push({
      factor: 'Energy Level',
      score: score.dimensions.energyMatch,
      weight: this.config.defaultWeights.energyMatch,
      positive: score.dimensions.energyMatch >= 60,
      explanation: score.dimensions.energyMatch >= 70
        ? 'Well-matched conversation energy'
        : 'Different energy levels',
    });

    return factors;
  }

  private getPersonalityExplanation(
    profile1: ChemistryProfile,
    profile2: ChemistryProfile,
    score: number
  ): string {
    if (score >= 80) {
      if (this.areOppositeTypes(profile1.primaryPersonalityType, profile2.primaryPersonalityType)) {
        return 'Complementary personalities that could balance each other';
      }
      return 'Similar personalities that likely understand each other';
    }
    if (score >= 60) {
      return 'Compatible personality traits';
    }
    return 'Different personalities may need adjustment';
  }

  private getMinimalExplanation(score: ChemistryScore): ChemistryExplanation {
    return {
      summary: `Chemistry score: ${score.overall}%`,
      highlights: [],
      concerns: [],
      tips: [],
      iceBreakers: [],
    };
  }

  private generateIceBreakers(profile1: ChemistryProfile, profile2: ChemistryProfile): string[] {
    const iceBreakers: string[] = [];

    // Based on engagement styles
    if (profile1.engagementStyle.questionAsking > 0.6 || profile2.engagementStyle.questionAsking > 0.6) {
      iceBreakers.push('Ask about their weekend plans - they seem to enjoy questions!');
    }

    // Based on personality types
    if (profile2.primaryPersonalityType === 'explorer') {
      iceBreakers.push('Ask about their most recent adventure or something new they tried.');
    } else if (profile2.primaryPersonalityType === 'nurturer') {
      iceBreakers.push('Share something you\'re excited about and ask for their thoughts.');
    } else if (profile2.primaryPersonalityType === 'achiever') {
      iceBreakers.push('Ask about a project or goal they\'re working on.');
    } else if (profile2.primaryPersonalityType === 'connector') {
      iceBreakers.push('Suggest a fun activity or ask about their social circle.');
    }

    // Generic good openers
    iceBreakers.push('Start with something specific from their profile rather than a generic greeting.');

    return iceBreakers;
  }

  // ==========================================================================
  // LEARNING FROM INTERACTIONS
  // ==========================================================================

  private calculateActualEngagement(conversationData: ConversationData): number {
    // Score actual conversation quality
    let score = 0;

    // Message exchange (balanced is better)
    const messageRatio = Math.min(
      conversationData.messagesByUser,
      conversationData.messagesByPartner
    ) / Math.max(conversationData.messagesByUser, conversationData.messagesByPartner, 1);
    score += messageRatio * 0.2;

    // Total messages (more = better engagement)
    score += Math.min(1, conversationData.totalMessages / 50) * 0.2;

    // Response times (faster = better)
    const avgResponseTime = (conversationData.averageResponseTimeUser + conversationData.averageResponseTimePartner) / 2;
    score += Math.max(0, 1 - avgResponseTime / 60) * 0.2;

    // Conversation duration
    score += Math.min(1, conversationData.conversationSpanHours / 24) * 0.1;

    // Topic diversity
    score += Math.min(1, conversationData.topicCount / 5) * 0.1;

    // Outcome weighting
    const outcomeScores: Record<ConversationData['outcome'], number> = {
      ongoing: 0.6,
      exchanged_contact: 0.8,
      scheduled_date: 0.9,
      met_in_person: 1.0,
      faded: 0.3,
      unmatched_user: 0.2,
      unmatched_partner: 0.2,
      blocked: 0.0,
    };
    score += outcomeScores[conversationData.outcome] * 0.2;

    return score;
  }

  private calculateAdjustmentFactors(
    predictedScore: ChemistryScore,
    conversationData: ConversationData,
    predictionError: number
  ): Record<string, number> {
    const adjustments: Record<string, number> = {};
    const learningRate = this.config.feedbackLearningRate;

    // If we over-predicted, decrease weights that were high
    // If we under-predicted, increase weights that were low
    if (predictionError < -0.2) {
      // We over-predicted - conversation was worse than expected
      if (predictedScore.dimensions.rhythmSync > 70) {
        adjustments.rhythmSync = -learningRate;
      }
      if (predictedScore.dimensions.engagementMatch > 70) {
        adjustments.engagementMatch = -learningRate;
      }
    } else if (predictionError > 0.2) {
      // We under-predicted - conversation was better than expected
      if (predictedScore.dimensions.rhythmSync < 50) {
        adjustments.rhythmSync = learningRate;
      }
      if (predictedScore.dimensions.engagementMatch < 50) {
        adjustments.engagementMatch = learningRate;
      }
    }

    return adjustments;
  }

  private async updateProfileFromConversation(
    userId: string,
    conversationData: ConversationData
  ): Promise<void> {
    const profile = this.profiles.get(userId);
    if (!profile) return;

    // Update engagement style based on conversation
    const isUser = conversationData.userId === userId;
    const userMessageLength = isUser
      ? conversationData.averageMessageLengthUser
      : conversationData.averageMessageLengthPartner;

    // Weighted update of message length
    profile.engagementStyle.averageMessageLength =
      profile.engagementStyle.averageMessageLength * 0.9 + userMessageLength * 0.1;

    // Update response time in rhythm patterns
    const userResponseTime = isUser
      ? conversationData.averageResponseTimeUser
      : conversationData.averageResponseTimePartner;

    profile.rhythmPatterns.averageResponseTime =
      profile.rhythmPatterns.averageResponseTime * 0.9 + userResponseTime * 0.1;

    profile.lastCalculated = new Date();
    profile.totalInteractions++;

    this.profiles.set(userId, profile);
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  private cosineSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) return 0;

    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      magnitude1 += vec1[i] * vec1[i];
      magnitude2 += vec2[i] * vec2[i];
    }

    magnitude1 = Math.sqrt(magnitude1);
    magnitude2 = Math.sqrt(magnitude2);

    if (magnitude1 === 0 || magnitude2 === 0) return 0;

    return dotProduct / (magnitude1 * magnitude2);
  }

  private calculateScoreConfidence(profile1: ChemistryProfile, profile2: ChemistryProfile): number {
    // Confidence based on data quality
    const qualityScores: Record<ChemistryProfile['dataQuality'], number> = {
      insufficient: 0.2,
      low: 0.5,
      medium: 0.75,
      high: 0.95,
    };

    const quality1 = qualityScores[profile1.dataQuality];
    const quality2 = qualityScores[profile2.dataQuality];

    return (quality1 + quality2) / 2;
  }

  private assessDataQuality(totalInteractions: number): ChemistryProfile['dataQuality'] {
    if (totalInteractions < this.config.minimumInteractionsRequired) {
      return 'insufficient';
    }
    if (totalInteractions < 25) {
      return 'low';
    }
    if (totalInteractions < 100) {
      return 'medium';
    }
    return 'high';
  }
}

// Export singleton instance
export const chemistryMatchingService = new ChemistryMatchingService();
export default chemistryMatchingService;
