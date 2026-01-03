import { Knex } from 'knex';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import {
  CheckIn,
  CheckInWithReflection,
  CheckInType,
  MoodTrend,
  MoodTrendDirection,
  WellnessScore,
  BreakSuggestion,
  DistressIndicators,
  Resource,
  ResourceCategory,
  Affirmation,
  AffirmationCategory,
  ReflectionPrompt,
  ReflectionPromptType,
  WellnessSettings,
  WellnessBreak,
  BreakType,
  BreakTrigger,
  DetectionType,
  DistressActionTaken,
  CreateCheckInRequest,
  UpdateWellnessSettingsRequest,
  GetCheckInHistoryOptions,
  DateRange,
  DEFAULT_DISTRESS_CONFIG,
  calculateWellnessScore,
  generateWellnessRecommendations,
  generateMoodInsights,
  UsageWellnessMetrics,
} from '../types/mental-health.types';
import logger from '../../utils/logger';

/**
 * Mental Health Service
 *
 * Handles all mental health check-in functionality with privacy-first design.
 * All sensitive data is encrypted at rest with user-controlled retention.
 */
export class MentalHealthService {
  private db: Knex;
  private encryptionKey: Buffer;

  constructor(db: Knex) {
    this.db = db;
    // Derive encryption key from master key
    const masterKey = process.env.MENTAL_HEALTH_ENCRYPTION_KEY || process.env.TOTP_ENCRYPTION_MASTER_KEY || '';
    const salt = process.env.MENTAL_HEALTH_ENCRYPTION_SALT || process.env.TOTP_ENCRYPTION_KEY_SALT || '';
    this.encryptionKey = crypto.scryptSync(masterKey, salt, 32);
  }

  // ==================== Check-in Management ====================

  /**
   * Create a new mental health check-in
   */
  async createCheckIn(userId: string, request: CreateCheckInRequest): Promise<CheckIn> {
    const settings = await this.getOrCreateSettings(userId);

    // Calculate auto-delete date based on retention settings
    const autoDeleteAt = new Date();
    autoDeleteAt.setDate(autoDeleteAt.getDate() + settings.dataRetentionDays);

    // Encrypt reflection notes if provided
    let encryptedNotes: string | null = null;
    let keyId: string | null = null;

    if (request.reflectionNotes) {
      const encrypted = this.encryptData(request.reflectionNotes);
      encryptedNotes = JSON.stringify(encrypted);
      keyId = encrypted.keyId;
    }

    const checkInId = uuidv4();

    const [result] = await this.db('mental_health_checkins')
      .insert({
        id: checkInId,
        user_id: userId,
        mood_score: request.moodScore,
        energy_level: request.energyLevel,
        anxiety_level: request.anxietyLevel,
        stress_level: request.stressLevel,
        dating_confidence: request.datingConfidence,
        social_satisfaction: request.socialSatisfaction,
        feelings: request.feelings || [],
        dating_experiences: request.datingExperiences || [],
        reflection_notes_encrypted: encryptedNotes,
        encryption_key_id: keyId,
        check_in_type: request.checkInType || CheckInType.MANUAL,
        trigger_context: request.triggerContext,
        auto_delete_at: autoDeleteAt,
      })
      .returning('*');

    // Check for distress signals
    if (settings.crisisDetectionEnabled) {
      await this.analyzeAndLogDistress(userId, result);
    }

    logger.info('Mental health check-in created', {
      userId,
      checkInId,
      moodScore: request.moodScore,
      checkInType: request.checkInType || CheckInType.MANUAL,
    });

    return this.mapCheckInFromDb(result);
  }

  /**
   * Get check-in history for a user
   */
  async getCheckInHistory(
    userId: string,
    options: GetCheckInHistoryOptions = {}
  ): Promise<CheckIn[] | CheckInWithReflection[]> {
    let query = this.db('mental_health_checkins')
      .where({ user_id: userId })
      .orderBy('created_at', 'desc');

    if (options.dateRange) {
      query = query
        .where('created_at', '>=', options.dateRange.start)
        .where('created_at', '<=', options.dateRange.end);
    }

    if (options.checkInType) {
      query = query.where('check_in_type', options.checkInType);
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    if (options.offset) {
      query = query.offset(options.offset);
    }

    const results = await query;

    if (options.includeReflections) {
      return results.map((r: any) => this.mapCheckInWithReflectionFromDb(r));
    }

    return results.map((r: any) => this.mapCheckInFromDb(r));
  }

  /**
   * Get mood trend analysis
   */
  async getMoodTrend(userId: string, days: number = 30): Promise<MoodTrend> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const checkIns = await this.db('mental_health_checkins')
      .where({ user_id: userId })
      .where('created_at', '>=', startDate)
      .orderBy('created_at', 'asc');

    if (checkIns.length === 0) {
      return {
        userId,
        period: { start: startDate, end: endDate },
        direction: MoodTrendDirection.STABLE,
        averageMood: 5,
        averageAnxiety: 5,
        averageEnergy: 5,
        averageDatingConfidence: 5,
        moodHistory: [],
        insights: ['Start logging check-ins to see mood trends.'],
      };
    }

    // Calculate averages
    const avgMood = checkIns.reduce((sum: number, c: any) => sum + c.mood_score, 0) / checkIns.length;

    const anxietyCheckIns = checkIns.filter((c: any) => c.anxiety_level !== null);
    const avgAnxiety = anxietyCheckIns.length > 0
      ? anxietyCheckIns.reduce((sum: number, c: any) => sum + c.anxiety_level, 0) / anxietyCheckIns.length
      : 5;

    const energyCheckIns = checkIns.filter((c: any) => c.energy_level !== null);
    const avgEnergy = energyCheckIns.length > 0
      ? energyCheckIns.reduce((sum: number, c: any) => sum + c.energy_level, 0) / energyCheckIns.length
      : 5;

    const confidenceCheckIns = checkIns.filter((c: any) => c.dating_confidence !== null);
    const avgConfidence = confidenceCheckIns.length > 0
      ? confidenceCheckIns.reduce((sum: number, c: any) => sum + c.dating_confidence, 0) / confidenceCheckIns.length
      : 5;

    // Determine trend direction
    let direction = MoodTrendDirection.STABLE;
    if (checkIns.length >= 3) {
      const recent = checkIns.slice(-3);
      const older = checkIns.slice(0, Math.min(3, checkIns.length - 3));

      if (older.length > 0) {
        const recentAvg = recent.reduce((sum: number, c: any) => sum + c.mood_score, 0) / recent.length;
        const olderAvg = older.reduce((sum: number, c: any) => sum + c.mood_score, 0) / older.length;

        if (recentAvg > olderAvg + 0.5) direction = MoodTrendDirection.IMPROVING;
        else if (recentAvg < olderAvg - 0.5) direction = MoodTrendDirection.DECLINING;
      }
    }

    // Build mood history
    const moodHistory = checkIns.map((c: any) => ({
      date: new Date(c.created_at),
      moodScore: c.mood_score,
      anxietyLevel: c.anxiety_level,
    }));

    // Generate insights
    const insights = generateMoodInsights(moodHistory);

    return {
      userId,
      period: { start: startDate, end: endDate },
      direction,
      averageMood: Math.round(avgMood * 10) / 10,
      averageAnxiety: Math.round(avgAnxiety * 10) / 10,
      averageEnergy: Math.round(avgEnergy * 10) / 10,
      averageDatingConfidence: Math.round(avgConfidence * 10) / 10,
      moodHistory,
      insights,
    };
  }

  /**
   * Get wellness score for user
   */
  async getWellnessScore(userId: string): Promise<WellnessScore> {
    // Get recent check-ins (last 14 days)
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const recentCheckIns = await this.db('mental_health_checkins')
      .where({ user_id: userId })
      .where('created_at', '>=', twoWeeksAgo)
      .orderBy('created_at', 'desc');

    // Get mood trend
    const moodTrend = await this.getMoodTrend(userId, 14);

    // Calculate streak (consecutive days with check-ins)
    const streakDays = await this.calculateCheckInStreak(userId);

    // Get last check-in
    const lastCheckIn = recentCheckIns.length > 0 ? new Date(recentCheckIns[0].created_at) : undefined;

    // Calculate overall score
    const checkInsForScore: CheckIn[] = recentCheckIns.map((r: any) => this.mapCheckInFromDb(r));
    const overallScore = calculateWellnessScore(checkInsForScore, moodTrend, streakDays);

    // Calculate component scores
    const components = this.calculateComponentScores(checkInsForScore);

    // Generate recommendations
    const score: WellnessScore = {
      userId,
      overallScore,
      components,
      streakDays,
      lastCheckIn,
      trend: moodTrend.direction,
      recommendations: [],
    };

    score.recommendations = generateWellnessRecommendations(score);

    return score;
  }

  /**
   * Suggest a mental health break based on user's state
   */
  async suggestBreak(userId: string): Promise<BreakSuggestion> {
    const settings = await this.getOrCreateSettings(userId);

    if (!settings.suggestBreaks) {
      return {
        suggested: false,
        urgency: 'low',
        reasons: [],
        recommendedDuration: 0,
        resources: [],
      };
    }

    const wellnessScore = await this.getWellnessScore(userId);
    const moodTrend = await this.getMoodTrend(userId, 7);
    const distressIndicators = await this.detectDistressSignals(userId);

    const reasons: string[] = [];
    let urgency: 'low' | 'medium' | 'high' = 'low';
    let recommendedDuration = 3; // Default 3 days

    // Check various factors
    if (wellnessScore.overallScore < 30) {
      reasons.push('Your wellness score has been low recently.');
      urgency = 'high';
      recommendedDuration = 7;
    }

    if (moodTrend.direction === MoodTrendDirection.DECLINING && moodTrend.averageMood < 4) {
      reasons.push('Your mood has been trending downward.');
      if (urgency === 'low') urgency = 'medium';
      recommendedDuration = Math.max(recommendedDuration, 5);
    }

    if (distressIndicators.hasIndicators) {
      reasons.push('We noticed some patterns that suggest you might benefit from a break.');
      urgency = 'high';
      recommendedDuration = Math.max(recommendedDuration, 7);
    }

    // Check rejection pattern
    const metrics = await this.getRecentUsageMetrics(userId, 7);
    if (metrics && metrics.rejectionRatio && metrics.rejectionRatio > 0.8) {
      reasons.push('Recent interactions have been challenging.');
      if (urgency === 'low') urgency = 'medium';
    }

    // Get relevant resources
    const resources = reasons.length > 0
      ? await this.getResources(ResourceCategory.DATING_STRESS)
      : [];

    return {
      suggested: reasons.length > 0,
      urgency,
      reasons,
      recommendedDuration,
      resources: resources.slice(0, 3),
    };
  }

  /**
   * Enable a mental health pause for the user
   */
  async enableMentalHealthPause(
    userId: string,
    durationDays: number,
    breakType: BreakType = BreakType.MENTAL_HEALTH,
    reason?: string,
    trigger: BreakTrigger = BreakTrigger.USER_INITIATED
  ): Promise<WellnessBreak> {
    const settings = await this.getOrCreateSettings(userId);

    // Get pre-break mood score
    const lastCheckIn = await this.db('mental_health_checkins')
      .where({ user_id: userId })
      .orderBy('created_at', 'desc')
      .first();

    const preBreakMoodScore = lastCheckIn?.mood_score || undefined;

    const startedAt = new Date();
    const intendedEndAt = new Date();
    intendedEndAt.setDate(intendedEndAt.getDate() + durationDays);

    // Encrypt reason if provided
    let encryptedReason: string | null = null;
    if (reason) {
      const encrypted = this.encryptData(reason);
      encryptedReason = JSON.stringify(encrypted);
    }

    // Create break record
    const breakId = uuidv4();
    const [breakRecord] = await this.db('wellness_breaks')
      .insert({
        id: breakId,
        user_id: userId,
        started_at: startedAt,
        intended_end_at: intendedEndAt,
        break_type: breakType,
        reason_encrypted: encryptedReason,
        trigger,
        pre_break_mood_score: preBreakMoodScore,
      })
      .returning('*');

    // Update settings
    await this.db('wellness_settings')
      .where({ user_id: userId })
      .update({
        is_on_break: true,
        break_started_at: startedAt,
        break_ends_at: intendedEndAt,
        break_reason: reason,
        updated_at: new Date(),
      });

    // Hide user from discovery (call user service)
    await this.setUserDiscoveryStatus(userId, false);

    logger.info('Mental health break enabled', {
      userId,
      breakId,
      durationDays,
      breakType,
      trigger,
    });

    return this.mapBreakFromDb(breakRecord);
  }

  /**
   * End a mental health break early
   */
  async endMentalHealthPause(userId: string): Promise<void> {
    const settings = await this.getOrCreateSettings(userId);

    if (!settings.isOnBreak) {
      throw new Error('User is not currently on a break');
    }

    const now = new Date();

    // Update active break
    await this.db('wellness_breaks')
      .where({ user_id: userId })
      .whereNull('actual_end_at')
      .update({
        actual_end_at: now,
        ended_early: true,
        updated_at: now,
      });

    // Update settings
    await this.db('wellness_settings')
      .where({ user_id: userId })
      .update({
        is_on_break: false,
        break_started_at: null,
        break_ends_at: null,
        break_reason: null,
        updated_at: now,
      });

    // Show user in discovery again
    await this.setUserDiscoveryStatus(userId, true);

    logger.info('Mental health break ended', { userId });
  }

  /**
   * Extend an existing break
   */
  async extendBreak(userId: string, additionalDays: number): Promise<WellnessBreak> {
    const settings = await this.getOrCreateSettings(userId);

    if (!settings.isOnBreak || !settings.breakEndsAt) {
      throw new Error('User is not currently on a break');
    }

    const newEndDate = new Date(settings.breakEndsAt);
    newEndDate.setDate(newEndDate.getDate() + additionalDays);

    // Update break record
    const [updatedBreak] = await this.db('wellness_breaks')
      .where({ user_id: userId })
      .whereNull('actual_end_at')
      .update({
        intended_end_at: newEndDate,
        was_extended: true,
        updated_at: new Date(),
      })
      .returning('*');

    // Update settings
    await this.db('wellness_settings')
      .where({ user_id: userId })
      .update({
        break_ends_at: newEndDate,
        updated_at: new Date(),
      });

    logger.info('Mental health break extended', {
      userId,
      additionalDays,
      newEndDate,
    });

    return this.mapBreakFromDb(updatedBreak);
  }

  // ==================== Resources ====================

  /**
   * Get wellness resources by category
   */
  async getResources(
    category?: ResourceCategory,
    includeCountry?: string,
    isCrisis?: boolean
  ): Promise<Resource[]> {
    let query = this.db('wellness_resources').where({ is_active: true });

    if (category) {
      query = query.where('category', category);
    }

    if (isCrisis !== undefined) {
      query = query.where('is_crisis_resource', isCrisis);
    }

    if (includeCountry) {
      query = query.where(function() {
        this.whereRaw("available_countries = '{}' OR available_countries IS NULL")
          .orWhereRaw('? = ANY(available_countries)', [includeCountry]);
      });
    }

    const results = await query.orderBy('priority', 'asc');
    return results.map((r: any) => this.mapResourceFromDb(r));
  }

  /**
   * Get crisis resources
   */
  async getCrisisResources(country?: string): Promise<Resource[]> {
    return this.getResources(undefined, country, true);
  }

  // ==================== Affirmations ====================

  /**
   * Get affirmations, optionally filtered by category or mood
   */
  async getAffirmations(
    category?: AffirmationCategory,
    moodTag?: string,
    limit: number = 5
  ): Promise<Affirmation[]> {
    let query = this.db('affirmations').where({ is_active: true });

    if (category) {
      query = query.where('category', category);
    }

    if (moodTag) {
      query = query.whereRaw('? = ANY(mood_tags)', [moodTag]);
    }

    // Random selection weighted by the weight field
    const results = await query.orderByRaw('RANDOM() * weight DESC').limit(limit);

    return results.map((r: any) => ({
      id: r.id,
      message: r.message,
      author: r.author,
      category: r.category,
      moodTags: r.mood_tags,
    }));
  }

  /**
   * Get a personalized affirmation based on user's recent mood
   */
  async getPersonalizedAffirmation(userId: string): Promise<Affirmation | null> {
    // Get last check-in
    const lastCheckIn = await this.db('mental_health_checkins')
      .where({ user_id: userId })
      .orderBy('created_at', 'desc')
      .first();

    let moodTag = 'neutral';
    let category: AffirmationCategory | undefined;

    if (lastCheckIn) {
      // Determine mood tag based on mood score
      if (lastCheckIn.mood_score <= 3) moodTag = 'low';
      else if (lastCheckIn.mood_score >= 8) moodTag = 'hopeful';

      // Check for specific feelings
      if (lastCheckIn.anxiety_level && lastCheckIn.anxiety_level >= 7) moodTag = 'anxious';

      // Check feelings array
      const feelings = lastCheckIn.feelings || [];
      if (feelings.includes('rejected')) {
        category = AffirmationCategory.REJECTION;
        moodTag = 'rejection';
      } else if (feelings.includes('lonely')) {
        category = AffirmationCategory.SELF_WORTH;
      }
    }

    const affirmations = await this.getAffirmations(category, moodTag, 1);
    return affirmations[0] || null;
  }

  // ==================== Reflection Prompts ====================

  /**
   * Get reflection prompts
   */
  async getReflectionPrompts(
    type?: ReflectionPromptType,
    category?: string
  ): Promise<ReflectionPrompt[]> {
    let query = this.db('reflection_prompts').where({ is_active: true });

    if (type) {
      query = query.where('prompt_type', type);
    }

    if (category) {
      query = query.where('category', category);
    }

    const results = await query.orderBy('order_index', 'asc');
    return results.map((r: any) => ({
      id: r.id,
      promptText: r.prompt_text,
      followUpText: r.follow_up_text,
      category: r.category,
      promptType: r.prompt_type,
    }));
  }

  /**
   * Get a random reflection prompt for the given type
   */
  async getRandomReflectionPrompt(type: ReflectionPromptType): Promise<ReflectionPrompt | null> {
    const result = await this.db('reflection_prompts')
      .where({ is_active: true, prompt_type: type })
      .orderByRaw('RANDOM()')
      .first();

    if (!result) return null;

    return {
      id: result.id,
      promptText: result.prompt_text,
      followUpText: result.follow_up_text,
      category: result.category,
      promptType: result.prompt_type,
    };
  }

  /**
   * Save a reflection response
   */
  async saveReflectionResponse(
    userId: string,
    promptId: string,
    response: string,
    checkInId?: string
  ): Promise<void> {
    const settings = await this.getOrCreateSettings(userId);

    const autoDeleteAt = new Date();
    autoDeleteAt.setDate(autoDeleteAt.getDate() + settings.dataRetentionDays);

    const encrypted = this.encryptData(response);

    await this.db('reflection_responses').insert({
      id: uuidv4(),
      user_id: userId,
      prompt_id: promptId,
      checkin_id: checkInId,
      response_encrypted: JSON.stringify(encrypted),
      encryption_key_id: encrypted.keyId,
      auto_delete_at: autoDeleteAt,
    });
  }

  // ==================== Distress Detection ====================

  /**
   * Detect distress signals from user's patterns
   */
  async detectDistressSignals(userId: string): Promise<DistressIndicators> {
    const config = DEFAULT_DISTRESS_CONFIG;
    const indicators: DistressIndicators['indicators'] = [];

    // Get recent check-ins
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const recentCheckIns = await this.db('mental_health_checkins')
      .where({ user_id: userId })
      .where('created_at', '>=', weekAgo)
      .orderBy('created_at', 'desc');

    if (recentCheckIns.length > 0) {
      // Check for low mood trend
      const avgMood = recentCheckIns.reduce((sum: number, c: any) => sum + c.mood_score, 0) / recentCheckIns.length;
      if (avgMood <= config.lowMoodThreshold) {
        indicators.push({
          type: DetectionType.LOW_MOOD_TREND,
          confidence: 0.8,
          severity: avgMood <= 2 ? 4 : 3,
          description: 'Consistently low mood scores over the past week',
        });
      }

      // Check for high anxiety
      const anxietyCheckIns = recentCheckIns.filter((c: any) => c.anxiety_level !== null);
      if (anxietyCheckIns.length > 0) {
        const avgAnxiety = anxietyCheckIns.reduce((sum: number, c: any) => sum + c.anxiety_level, 0) / anxietyCheckIns.length;
        if (avgAnxiety >= config.highAnxietyThreshold) {
          indicators.push({
            type: DetectionType.HIGH_ANXIETY,
            confidence: 0.75,
            severity: avgAnxiety >= 9 ? 4 : 3,
            description: 'High anxiety levels detected',
          });
        }
      }

      // Check for rapid decline
      if (recentCheckIns.length >= 3) {
        const recent = recentCheckIns[0].mood_score;
        const older = recentCheckIns[recentCheckIns.length - 1].mood_score;
        const decline = older - recent;

        if (decline >= config.rapidDeclineThreshold) {
          indicators.push({
            type: DetectionType.RAPID_DECLINE,
            confidence: 0.7,
            severity: decline >= 5 ? 5 : 4,
            description: 'Significant mood decline detected over the past week',
          });
        }
      }
    }

    // Check usage patterns
    const metrics = await this.getRecentUsageMetrics(userId, 7);
    if (metrics) {
      // Rejection accumulation
      if (metrics.rejectionsReceived >= config.rejectionAccumulationThreshold) {
        indicators.push({
          type: DetectionType.REJECTION_ACCUMULATION,
          confidence: 0.6,
          severity: 3,
          description: 'High number of rejections recently',
        });
      }

      // Social withdrawal (decreased engagement)
      if (metrics.engagementChange && metrics.engagementChange < -0.5) {
        indicators.push({
          type: DetectionType.SOCIAL_WITHDRAWAL,
          confidence: 0.5,
          severity: 2,
          description: 'Decreased app engagement detected',
        });
      }
    }

    // Determine recommended action
    let recommendedAction = DistressActionTaken.NONE;
    let crisisResourcesNeeded = false;

    if (indicators.length > 0) {
      const maxSeverity = Math.max(...indicators.map(i => i.severity));

      if (maxSeverity >= 5) {
        recommendedAction = DistressActionTaken.CRISIS_RESOURCES_SHOWN;
        crisisResourcesNeeded = true;
      } else if (maxSeverity >= 4) {
        recommendedAction = DistressActionTaken.BREAK_SUGGESTED;
      } else if (maxSeverity >= 3) {
        recommendedAction = DistressActionTaken.RESOURCES_SHOWN;
      }
    }

    return {
      userId,
      timestamp: new Date(),
      hasIndicators: indicators.length > 0,
      indicators,
      recommendedAction,
      crisisResourcesNeeded,
    };
  }

  // ==================== Settings ====================

  /**
   * Get or create wellness settings for a user
   */
  async getOrCreateSettings(userId: string): Promise<WellnessSettings> {
    let settings = await this.db('wellness_settings')
      .where({ user_id: userId })
      .first();

    if (!settings) {
      [settings] = await this.db('wellness_settings')
        .insert({
          id: uuidv4(),
          user_id: userId,
        })
        .returning('*');
    }

    return this.mapSettingsFromDb(settings);
  }

  /**
   * Update wellness settings
   */
  async updateSettings(
    userId: string,
    updates: UpdateWellnessSettingsRequest
  ): Promise<WellnessSettings> {
    const dbUpdates: Record<string, any> = {
      updated_at: new Date(),
    };

    if (updates.dailyCheckinEnabled !== undefined) {
      dbUpdates.daily_checkin_enabled = updates.dailyCheckinEnabled;
    }
    if (updates.weeklyCheckinEnabled !== undefined) {
      dbUpdates.weekly_checkin_enabled = updates.weeklyCheckinEnabled;
    }
    if (updates.preferredCheckinTime !== undefined) {
      dbUpdates.preferred_checkin_time = updates.preferredCheckinTime;
    }
    if (updates.timezone !== undefined) {
      dbUpdates.timezone = updates.timezone;
    }
    if (updates.checkinDays !== undefined) {
      dbUpdates.checkin_days = updates.checkinDays;
    }
    if (updates.reminderNotifications !== undefined) {
      dbUpdates.reminder_notifications = updates.reminderNotifications;
    }
    if (updates.affirmationNotifications !== undefined) {
      dbUpdates.affirmation_notifications = updates.affirmationNotifications;
    }
    if (updates.resourceSuggestions !== undefined) {
      dbUpdates.resource_suggestions = updates.resourceSuggestions;
    }
    if (updates.crisisDetectionEnabled !== undefined) {
      dbUpdates.crisis_detection_enabled = updates.crisisDetectionEnabled;
    }
    if (updates.suggestBreaks !== undefined) {
      dbUpdates.suggest_breaks = updates.suggestBreaks;
    }
    if (updates.breakSuggestionThreshold !== undefined) {
      dbUpdates.break_suggestion_threshold = updates.breakSuggestionThreshold;
    }
    if (updates.dataRetentionDays !== undefined) {
      dbUpdates.data_retention_days = updates.dataRetentionDays;
    }
    if (updates.shareAnonymousStats !== undefined) {
      dbUpdates.share_anonymous_stats = updates.shareAnonymousStats;
    }

    await this.db('wellness_settings')
      .where({ user_id: userId })
      .update(dbUpdates);

    return this.getOrCreateSettings(userId);
  }

  // ==================== Usage Tracking ====================

  /**
   * Record usage metrics for wellness analysis
   */
  async recordUsageMetrics(userId: string, metrics: Partial<UsageWellnessMetrics>): Promise<void> {
    const today = new Date().toISOString().split('T')[0];

    const existing = await this.db('usage_wellness_metrics')
      .where({ user_id: userId, metric_date: today })
      .first();

    if (existing) {
      // Update existing record
      await this.db('usage_wellness_metrics')
        .where({ user_id: userId, metric_date: today })
        .update({
          swipes_sent: this.db.raw('swipes_sent + ?', [metrics.swipesSent || 0]),
          matches_received: this.db.raw('matches_received + ?', [metrics.matchesReceived || 0]),
          rejections_received: this.db.raw('rejections_received + ?', [metrics.rejectionsReceived || 0]),
          messages_sent: this.db.raw('messages_sent + ?', [metrics.messagesSent || 0]),
          messages_received: this.db.raw('messages_received + ?', [metrics.messagesReceived || 0]),
          session_count: this.db.raw('session_count + ?', [metrics.sessionCount || 0]),
          total_session_minutes: this.db.raw('total_session_minutes + ?', [metrics.totalSessionMinutes || 0]),
          updated_at: new Date(),
        });
    } else {
      // Create new record
      await this.db('usage_wellness_metrics').insert({
        id: uuidv4(),
        user_id: userId,
        metric_date: today,
        swipes_sent: metrics.swipesSent || 0,
        matches_received: metrics.matchesReceived || 0,
        rejections_received: metrics.rejectionsReceived || 0,
        messages_sent: metrics.messagesSent || 0,
        messages_received: metrics.messagesReceived || 0,
        session_count: metrics.sessionCount || 0,
        total_session_minutes: metrics.totalSessionMinutes || 0,
      });
    }

    // Recalculate ratios
    await this.recalculateUsageRatios(userId, today);
  }

  // ==================== Data Privacy ====================

  /**
   * Delete all mental health data for a user (GDPR compliance)
   */
  async deleteAllUserData(userId: string): Promise<void> {
    await this.db.transaction(async (trx) => {
      await trx('reflection_responses').where({ user_id: userId }).delete();
      await trx('distress_detection_logs').where({ user_id: userId }).delete();
      await trx('usage_wellness_metrics').where({ user_id: userId }).delete();
      await trx('wellness_breaks').where({ user_id: userId }).delete();
      await trx('mental_health_checkins').where({ user_id: userId }).delete();
      await trx('wellness_settings').where({ user_id: userId }).delete();
    });

    logger.info('All mental health data deleted for user', { userId });
  }

  /**
   * Export user data (GDPR compliance)
   */
  async exportUserData(userId: string): Promise<Record<string, any>> {
    const settings = await this.db('wellness_settings')
      .where({ user_id: userId })
      .first();

    const checkIns = await this.db('mental_health_checkins')
      .where({ user_id: userId })
      .orderBy('created_at', 'desc');

    const breaks = await this.db('wellness_breaks')
      .where({ user_id: userId })
      .orderBy('started_at', 'desc');

    // Decrypt notes for export
    const checkInsWithDecryptedNotes = checkIns.map((c: any) => {
      const mapped = this.mapCheckInFromDb(c);
      if (c.reflection_notes_encrypted) {
        try {
          const encrypted = JSON.parse(c.reflection_notes_encrypted);
          (mapped as any).reflectionNotes = this.decryptData(encrypted);
        } catch {
          // Skip if decryption fails
        }
      }
      return mapped;
    });

    return {
      settings: settings ? this.mapSettingsFromDb(settings) : null,
      checkIns: checkInsWithDecryptedNotes,
      breaks: breaks.map((b: any) => this.mapBreakFromDb(b)),
      exportedAt: new Date().toISOString(),
    };
  }

  /**
   * Run cleanup for expired data
   */
  async cleanupExpiredData(): Promise<number> {
    const now = new Date();

    // Delete expired check-ins
    const checkInsDeleted = await this.db('mental_health_checkins')
      .where('auto_delete_at', '<=', now)
      .delete();

    // Delete expired reflection responses
    const responsesDeleted = await this.db('reflection_responses')
      .where('auto_delete_at', '<=', now)
      .delete();

    // Delete expired distress logs
    const logsDeleted = await this.db('distress_detection_logs')
      .where('auto_delete_at', '<=', now)
      .delete();

    const totalDeleted = checkInsDeleted + responsesDeleted + logsDeleted;

    if (totalDeleted > 0) {
      logger.info('Cleaned up expired mental health data', {
        checkInsDeleted,
        responsesDeleted,
        logsDeleted,
        totalDeleted,
      });
    }

    return totalDeleted;
  }

  // ==================== Private Helpers ====================

  private encryptData(plaintext: string): { ciphertext: string; iv: string; tag: string; keyId: string } {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);

    let ciphertext = cipher.update(plaintext, 'utf8', 'base64');
    ciphertext += cipher.final('base64');

    const tag = cipher.getAuthTag();

    return {
      ciphertext,
      iv: iv.toString('base64'),
      tag: tag.toString('base64'),
      keyId: 'v1', // Version for key rotation
    };
  }

  private decryptData(encrypted: { ciphertext: string; iv: string; tag: string }): string {
    const iv = Buffer.from(encrypted.iv, 'base64');
    const tag = Buffer.from(encrypted.tag, 'base64');

    const decipher = crypto.createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
    decipher.setAuthTag(tag);

    let plaintext = decipher.update(encrypted.ciphertext, 'base64', 'utf8');
    plaintext += decipher.final('utf8');

    return plaintext;
  }

  private async calculateCheckInStreak(userId: string): Promise<number> {
    const checkIns = await this.db('mental_health_checkins')
      .where({ user_id: userId })
      .select(this.db.raw("DATE(created_at) as check_date"))
      .groupBy(this.db.raw("DATE(created_at)"))
      .orderBy('check_date', 'desc')
      .limit(30);

    if (checkIns.length === 0) return 0;

    let streak = 0;
    const today = new Date().toISOString().split('T')[0];

    for (let i = 0; i < checkIns.length; i++) {
      const checkDate = new Date(checkIns[i].check_date).toISOString().split('T')[0];
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() - i);
      const expected = expectedDate.toISOString().split('T')[0];

      if (checkDate === expected) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }

  private calculateComponentScores(checkIns: CheckIn[]): WellnessScore['components'] {
    if (checkIns.length === 0) {
      return {
        moodStability: 50,
        anxietyManagement: 50,
        datingConfidence: 50,
        socialEngagement: 50,
        selfCareConsistency: 50,
      };
    }

    // Mood stability (lower variance = higher score)
    const moodScores = checkIns.map(c => c.moodScore);
    const avgMood = moodScores.reduce((a, b) => a + b, 0) / moodScores.length;
    const moodVariance = moodScores.reduce((sum, m) => sum + Math.pow(m - avgMood, 2), 0) / moodScores.length;
    const moodStability = Math.max(0, 100 - moodVariance * 10);

    // Anxiety management (inverse of average anxiety)
    const anxietyScores = checkIns.filter(c => c.anxietyLevel !== undefined).map(c => c.anxietyLevel!);
    const avgAnxiety = anxietyScores.length > 0
      ? anxietyScores.reduce((a, b) => a + b, 0) / anxietyScores.length
      : 5;
    const anxietyManagement = ((10 - avgAnxiety) / 10) * 100;

    // Dating confidence
    const confidenceScores = checkIns.filter(c => c.datingConfidence !== undefined).map(c => c.datingConfidence!);
    const avgConfidence = confidenceScores.length > 0
      ? confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length
      : 5;
    const datingConfidence = (avgConfidence / 10) * 100;

    // Social engagement (based on social satisfaction)
    const socialScores = checkIns.filter(c => c.socialSatisfaction !== undefined).map(c => c.socialSatisfaction!);
    const avgSocial = socialScores.length > 0
      ? socialScores.reduce((a, b) => a + b, 0) / socialScores.length
      : 5;
    const socialEngagement = (avgSocial / 10) * 100;

    // Self-care consistency (based on check-in frequency)
    const selfCareConsistency = Math.min(checkIns.length * 10, 100);

    return {
      moodStability: Math.round(moodStability),
      anxietyManagement: Math.round(anxietyManagement),
      datingConfidence: Math.round(datingConfidence),
      socialEngagement: Math.round(socialEngagement),
      selfCareConsistency: Math.round(selfCareConsistency),
    };
  }

  private async analyzeAndLogDistress(userId: string, checkIn: any): Promise<void> {
    const distress = await this.detectDistressSignals(userId);

    if (distress.hasIndicators) {
      const settings = await this.getOrCreateSettings(userId);
      const autoDeleteAt = new Date();
      autoDeleteAt.setDate(autoDeleteAt.getDate() + settings.dataRetentionDays);

      for (const indicator of distress.indicators) {
        await this.db('distress_detection_logs').insert({
          id: uuidv4(),
          user_id: userId,
          detection_type: indicator.type,
          confidence_score: indicator.confidence,
          severity_level: indicator.severity,
          action_taken: distress.recommendedAction,
          auto_delete_at: autoDeleteAt,
        });
      }

      logger.warn('Distress signals detected', {
        userId,
        indicatorCount: distress.indicators.length,
        maxSeverity: Math.max(...distress.indicators.map(i => i.severity)),
        recommendedAction: distress.recommendedAction,
      });
    }
  }

  private async getRecentUsageMetrics(userId: string, days: number): Promise<UsageWellnessMetrics | null> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const metrics = await this.db('usage_wellness_metrics')
      .where({ user_id: userId })
      .where('metric_date', '>=', startDate.toISOString().split('T')[0])
      .select(
        this.db.raw('SUM(swipes_sent) as total_swipes'),
        this.db.raw('SUM(matches_received) as total_matches'),
        this.db.raw('SUM(rejections_received) as total_rejections'),
        this.db.raw('SUM(messages_sent) as total_messages_sent'),
        this.db.raw('SUM(messages_received) as total_messages_received'),
        this.db.raw('SUM(session_count) as total_sessions'),
        this.db.raw('SUM(total_session_minutes) as total_minutes')
      )
      .first();

    if (!metrics || !metrics.total_swipes) return null;

    const rejectionRatio = metrics.total_matches > 0
      ? metrics.total_rejections / metrics.total_matches
      : 0;

    const responseRate = metrics.total_messages_sent > 0
      ? metrics.total_messages_received / metrics.total_messages_sent
      : 0;

    return {
      userId,
      metricDate: new Date(),
      swipesSent: parseInt(metrics.total_swipes) || 0,
      matchesReceived: parseInt(metrics.total_matches) || 0,
      rejectionsReceived: parseInt(metrics.total_rejections) || 0,
      messagesSent: parseInt(metrics.total_messages_sent) || 0,
      messagesReceived: parseInt(metrics.total_messages_received) || 0,
      sessionCount: parseInt(metrics.total_sessions) || 0,
      totalSessionMinutes: parseInt(metrics.total_minutes) || 0,
      rejectionRatio,
      responseRate,
    };
  }

  private async recalculateUsageRatios(userId: string, date: string): Promise<void> {
    const metrics = await this.db('usage_wellness_metrics')
      .where({ user_id: userId, metric_date: date })
      .first();

    if (!metrics) return;

    const rejectionRatio = metrics.matches_received > 0
      ? metrics.rejections_received / metrics.matches_received
      : null;

    const responseRate = metrics.messages_sent > 0
      ? metrics.messages_received / metrics.messages_sent
      : null;

    await this.db('usage_wellness_metrics')
      .where({ user_id: userId, metric_date: date })
      .update({
        rejection_ratio: rejectionRatio,
        response_rate: responseRate,
        updated_at: new Date(),
      });
  }

  private async setUserDiscoveryStatus(userId: string, visible: boolean): Promise<void> {
    // Update the user's profile to hide/show from discovery
    try {
      await this.db('profiles')
        .where({ user_id: userId })
        .update({
          is_discoverable: visible,
          updated_at: new Date(),
        });
    } catch (error) {
      // Table might not exist or have different structure
      logger.warn('Could not update discovery status', { userId, visible, error });
    }
  }

  // ==================== DB Mappers ====================

  private mapCheckInFromDb(row: any): CheckIn {
    return {
      id: row.id,
      userId: row.user_id,
      moodScore: row.mood_score,
      energyLevel: row.energy_level,
      anxietyLevel: row.anxiety_level,
      stressLevel: row.stress_level,
      datingConfidence: row.dating_confidence,
      socialSatisfaction: row.social_satisfaction,
      feelings: row.feelings || [],
      datingExperiences: row.dating_experiences || [],
      checkInType: row.check_in_type,
      triggerContext: row.trigger_context,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private mapCheckInWithReflectionFromDb(row: any): CheckInWithReflection {
    const checkIn = this.mapCheckInFromDb(row);
    let reflectionNotes: string | undefined;

    if (row.reflection_notes_encrypted) {
      try {
        const encrypted = JSON.parse(row.reflection_notes_encrypted);
        reflectionNotes = this.decryptData(encrypted);
      } catch {
        // Skip if decryption fails
      }
    }

    return {
      ...checkIn,
      reflectionNotes,
    };
  }

  private mapSettingsFromDb(row: any): WellnessSettings {
    return {
      userId: row.user_id,
      dailyCheckinEnabled: row.daily_checkin_enabled,
      weeklyCheckinEnabled: row.weekly_checkin_enabled,
      preferredCheckinTime: row.preferred_checkin_time,
      timezone: row.timezone,
      checkinDays: row.checkin_days || [1, 2, 3, 4, 5, 6, 7],
      reminderNotifications: row.reminder_notifications,
      affirmationNotifications: row.affirmation_notifications,
      resourceSuggestions: row.resource_suggestions,
      crisisDetectionEnabled: row.crisis_detection_enabled,
      suggestBreaks: row.suggest_breaks,
      breakSuggestionThreshold: row.break_suggestion_threshold,
      dataRetentionDays: row.data_retention_days,
      shareAnonymousStats: row.share_anonymous_stats,
      isOnBreak: row.is_on_break,
      breakStartedAt: row.break_started_at ? new Date(row.break_started_at) : undefined,
      breakEndsAt: row.break_ends_at ? new Date(row.break_ends_at) : undefined,
      breakReason: row.break_reason,
    };
  }

  private mapBreakFromDb(row: any): WellnessBreak {
    return {
      id: row.id,
      userId: row.user_id,
      startedAt: new Date(row.started_at),
      intendedEndAt: new Date(row.intended_end_at),
      actualEndAt: row.actual_end_at ? new Date(row.actual_end_at) : undefined,
      breakType: row.break_type,
      reason: row.reason_encrypted ? undefined : undefined, // Don't expose encrypted reason
      trigger: row.trigger,
      preBreakMoodScore: row.pre_break_mood_score,
      postBreakMoodScore: row.post_break_mood_score,
      wasExtended: row.was_extended,
      endedEarly: row.ended_early,
    };
  }

  private mapResourceFromDb(row: any): Resource {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      url: row.url,
      phoneNumber: row.phone_number,
      category: row.category,
      resourceType: row.resource_type,
      priority: row.priority,
      availableCountries: row.available_countries || [],
      languages: row.languages || ['en'],
      isCrisisResource: row.is_crisis_resource,
      isActive: row.is_active,
    };
  }
}
