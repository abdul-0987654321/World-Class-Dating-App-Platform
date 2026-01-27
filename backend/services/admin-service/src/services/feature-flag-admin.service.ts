import {
  FeatureFlag,
  FeatureFlagConfig,
  DEFAULT_FEATURE_FLAGS,
} from '@flamoral/backend-shared/src/platform-intelligence/feature-flags';

import { db } from '../infrastructure/database';
import { redis } from '../infrastructure/redis';
import {
  FeatureFlagDto,
  UpdateFeatureFlagDto,
  FeatureFlagMetricsDto,
  FeatureFlagOverrideDto,
  FeatureFlagListResponseDto,
  CategorySummaryDto,
  FeatureFlagHistoryDto,
  DailyEvaluationDto,
  SegmentEvaluationDto,
  RegionEvaluationDto,
} from '../dto/feature-flag.dto';
import { logger } from '../utils/logger';

// Redis key prefixes for feature flag storage
const REDIS_PREFIX = 'feature_flag:';
const OVERRIDE_PREFIX = `${REDIS_PREFIX}override:`;
const METRICS_PREFIX = `${REDIS_PREFIX}metrics:`;
const HISTORY_PREFIX = `${REDIS_PREFIX}history:`;

// Cache TTL in seconds
const CACHE_TTL = 300; // 5 minutes
const METRICS_TTL = 3600; // 1 hour

/**
 * Feature Flag Admin Service
 * Provides administrative capabilities for managing feature flags
 * including runtime overrides stored in Redis and metrics tracking
 */
export class FeatureFlagAdminService {
  private defaultFlags: FeatureFlagConfig;

  constructor() {
    this.defaultFlags = DEFAULT_FEATURE_FLAGS;
  }

  /**
   * Get all feature flags across all categories
   * Merges default config with any runtime overrides
   */
  async getAllFlags(): Promise<FeatureFlagListResponseDto> {
    const flags: FeatureFlagDto[] = [];
    const categorySummaries: CategorySummaryDto[] = [];

    for (const [category, categoryFlags] of Object.entries(this.defaultFlags)) {
      let enabledCount = 0;
      let disabledCount = 0;

      for (const [key, flag] of Object.entries(categoryFlags as Record<string, FeatureFlag>)) {
        // Check for runtime override
        const override = await this.getOverride(category, key);
        const mergedFlag = this.mergeWithOverride(flag, override);

        flags.push({
          ...mergedFlag,
          category,
          key,
        });

        if (mergedFlag.enabled) {
          enabledCount++;
        } else {
          disabledCount++;
        }
      }

      categorySummaries.push({
        name: category,
        totalFlags: enabledCount + disabledCount,
        enabledFlags: enabledCount,
        disabledFlags: disabledCount,
      });
    }

    return {
      flags,
      total: flags.length,
      categories: categorySummaries,
    };
  }

  /**
   * Get a specific feature flag by category and name
   */
  async getFlag(category: string, name: string): Promise<FeatureFlagDto | null> {
    const categoryFlags = this.defaultFlags[category as keyof FeatureFlagConfig];
    if (!categoryFlags) {
      return null;
    }

    const flag = (categoryFlags as Record<string, FeatureFlag>)[name];
    if (!flag) {
      return null;
    }

    // Check for runtime override
    const override = await this.getOverride(category, name);
    const mergedFlag = this.mergeWithOverride(flag, override);

    return {
      ...mergedFlag,
      category,
      key: name,
    };
  }

  /**
   * Update the rollout percentage for a feature flag
   */
  async updateRollout(
    category: string,
    name: string,
    percentage: number,
    adminId: string,
    reason?: string
  ): Promise<FeatureFlagDto> {
    const currentFlag = await this.getFlag(category, name);
    if (!currentFlag) {
      throw new Error(`Feature flag ${category}/${name} not found`);
    }

    const previousValue = { rolloutPercentage: currentFlag.rolloutPercentage };

    // Create or update override
    const override =
      (await this.getOverride(category, name)) || this.createEmptyOverride(category, name, adminId);
    override.rolloutPercentage = percentage;
    override.createdBy = adminId;
    override.createdAt = new Date().toISOString();
    override.reason = reason;

    await this.saveOverride(category, name, override);

    // Log history
    await this.logHistory({
      category,
      name,
      action: 'update_rollout',
      previousValue,
      newValue: { rolloutPercentage: percentage },
      changedBy: adminId,
      reason,
    });

    const updatedFlag = await this.getFlag(category, name);
    if (!updatedFlag) {
      throw new Error('Failed to retrieve updated flag');
    }
    return updatedFlag;
  }

  /**
   * Update the user segments for a feature flag
   */
  async updateSegments(
    category: string,
    name: string,
    segments: string[],
    adminId: string,
    reason?: string
  ): Promise<FeatureFlagDto> {
    const currentFlag = await this.getFlag(category, name);
    if (!currentFlag) {
      throw new Error(`Feature flag ${category}/${name} not found`);
    }

    const previousValue = { userSegments: currentFlag.userSegments };

    // Create or update override
    const override =
      (await this.getOverride(category, name)) || this.createEmptyOverride(category, name, adminId);
    override.userSegments = segments;
    override.createdBy = adminId;
    override.createdAt = new Date().toISOString();
    override.reason = reason;

    await this.saveOverride(category, name, override);

    // Log history
    await this.logHistory({
      category,
      name,
      action: 'update_segments',
      previousValue,
      newValue: { userSegments: segments },
      changedBy: adminId,
      reason,
    });

    const updatedFlag = await this.getFlag(category, name);
    if (!updatedFlag) {
      throw new Error('Failed to retrieve updated flag');
    }
    return updatedFlag;
  }

  /**
   * Update the regions for a feature flag
   */
  async updateRegions(
    category: string,
    name: string,
    regions: string[],
    adminId: string,
    reason?: string
  ): Promise<FeatureFlagDto> {
    const currentFlag = await this.getFlag(category, name);
    if (!currentFlag) {
      throw new Error(`Feature flag ${category}/${name} not found`);
    }

    const previousValue = { regions: currentFlag.regions };

    // Create or update override
    const override =
      (await this.getOverride(category, name)) || this.createEmptyOverride(category, name, adminId);
    override.regions = regions;
    override.createdBy = adminId;
    override.createdAt = new Date().toISOString();
    override.reason = reason;

    await this.saveOverride(category, name, override);

    // Log history
    await this.logHistory({
      category,
      name,
      action: 'update_regions',
      previousValue,
      newValue: { regions },
      changedBy: adminId,
      reason,
    });

    const updatedFlag = await this.getFlag(category, name);
    if (!updatedFlag) {
      throw new Error('Failed to retrieve updated flag');
    }
    return updatedFlag;
  }

  /**
   * Toggle feature flag enabled/disabled state
   */
  async toggleFlag(
    category: string,
    name: string,
    enabled: boolean,
    adminId: string,
    reason?: string
  ): Promise<FeatureFlagDto> {
    const currentFlag = await this.getFlag(category, name);
    if (!currentFlag) {
      throw new Error(`Feature flag ${category}/${name} not found`);
    }

    const previousValue = { enabled: currentFlag.enabled };

    // Create or update override
    const override =
      (await this.getOverride(category, name)) || this.createEmptyOverride(category, name, adminId);
    override.enabled = enabled;
    override.createdBy = adminId;
    override.createdAt = new Date().toISOString();
    override.reason = reason;

    await this.saveOverride(category, name, override);

    // Log history
    await this.logHistory({
      category,
      name,
      action: enabled ? 'enable' : 'disable',
      previousValue,
      newValue: { enabled },
      changedBy: adminId,
      reason,
    });

    logger.info(
      `Feature flag ${category}/${name} ${enabled ? 'enabled' : 'disabled'} by ${adminId}`
    );

    const updatedFlag = await this.getFlag(category, name);
    if (!updatedFlag) {
      throw new Error('Failed to retrieve updated flag');
    }
    return updatedFlag;
  }

  /**
   * Update multiple properties of a feature flag at once
   */
  async updateFlag(
    category: string,
    name: string,
    updates: UpdateFeatureFlagDto,
    adminId: string
  ): Promise<FeatureFlagDto> {
    const currentFlag = await this.getFlag(category, name);
    if (!currentFlag) {
      throw new Error(`Feature flag ${category}/${name} not found`);
    }

    const previousValue: Partial<FeatureFlagDto> = {};
    const newValue: Partial<FeatureFlagDto> = {};

    // Create or update override
    const override =
      (await this.getOverride(category, name)) || this.createEmptyOverride(category, name, adminId);

    if (updates.enabled !== undefined) {
      previousValue.enabled = currentFlag.enabled;
      newValue.enabled = updates.enabled;
      override.enabled = updates.enabled;
    }

    if (updates.rolloutPercentage !== undefined) {
      previousValue.rolloutPercentage = currentFlag.rolloutPercentage;
      newValue.rolloutPercentage = updates.rolloutPercentage;
      override.rolloutPercentage = updates.rolloutPercentage;
    }

    if (updates.regions !== undefined) {
      previousValue.regions = currentFlag.regions;
      newValue.regions = updates.regions;
      override.regions = updates.regions;
    }

    if (updates.userSegments !== undefined) {
      previousValue.userSegments = currentFlag.userSegments;
      newValue.userSegments = updates.userSegments;
      override.userSegments = updates.userSegments;
    }

    override.createdBy = adminId;
    override.createdAt = new Date().toISOString();
    override.reason = updates.reason;

    await this.saveOverride(category, name, override);

    // Log history
    await this.logHistory({
      category,
      name,
      action: 'update',
      previousValue,
      newValue,
      changedBy: adminId,
      reason: updates.reason,
    });

    const updatedFlag = await this.getFlag(category, name);
    if (!updatedFlag) {
      throw new Error('Failed to retrieve updated flag');
    }
    return updatedFlag;
  }

  /**
   * Get usage metrics for a feature flag
   */
  async getFeatureMetrics(category: string, name: string): Promise<FeatureFlagMetricsDto> {
    const flag = await this.getFlag(category, name);
    if (!flag) {
      throw new Error(`Feature flag ${category}/${name} not found`);
    }

    const metricsKey = `${METRICS_PREFIX}${category}:${name}`;

    // Try to get cached metrics
    const cachedMetrics = await redis.get(metricsKey);
    if (cachedMetrics) {
      return JSON.parse(cachedMetrics);
    }

    // Calculate metrics from database
    const metrics = await this.calculateMetrics(category, name);

    // Cache the results
    await redis.set(metricsKey, JSON.stringify(metrics), METRICS_TTL);

    return metrics;
  }

  /**
   * Get the history of changes for a feature flag
   */
  async getFlagHistory(
    category: string,
    name: string,
    limit: number = 50
  ): Promise<FeatureFlagHistoryDto[]> {
    try {
      const history = await db('feature_flag_history')
        .where({ category, flag_name: name })
        .orderBy('created_at', 'desc')
        .limit(limit)
        .select('*');

      return history.map((entry: any) => ({
        id: entry.id,
        category: entry.category,
        name: entry.flag_name,
        action: entry.action,
        previousValue: entry.previous_value,
        newValue: entry.new_value,
        changedBy: entry.changed_by,
        changedAt: entry.created_at,
        reason: entry.reason,
      }));
    } catch (error) {
      // If table doesn't exist, return empty array
      logger.warn('Feature flag history table not available:', error);
      return [];
    }
  }

  /**
   * Remove runtime override and revert to default config
   */
  async removeOverride(
    category: string,
    name: string,
    adminId: string,
    reason?: string
  ): Promise<FeatureFlagDto> {
    const currentFlag = await this.getFlag(category, name);
    if (!currentFlag) {
      throw new Error(`Feature flag ${category}/${name} not found`);
    }

    const overrideKey = `${OVERRIDE_PREFIX}${category}:${name}`;
    await redis.del(overrideKey);

    // Also remove from database if stored there
    try {
      await db('feature_flag_overrides').where({ category, flag_name: name }).delete();
    } catch (error) {
      // Table might not exist
      logger.warn('Could not remove override from database:', error);
    }

    // Log history
    await this.logHistory({
      category,
      name,
      action: 'remove_override',
      previousValue: currentFlag,
      newValue: undefined,
      changedBy: adminId,
      reason,
    });

    const revertedFlag = await this.getFlag(category, name);
    if (!revertedFlag) {
      throw new Error('Failed to retrieve reverted flag');
    }
    return revertedFlag;
  }

  /**
   * Get flags by category
   */
  async getFlagsByCategory(category: string): Promise<FeatureFlagDto[]> {
    const categoryFlags = this.defaultFlags[category as keyof FeatureFlagConfig];
    if (!categoryFlags) {
      throw new Error(`Category ${category} not found`);
    }

    const flags: FeatureFlagDto[] = [];

    for (const [key, flag] of Object.entries(categoryFlags as Record<string, FeatureFlag>)) {
      const override = await this.getOverride(category, key);
      const mergedFlag = this.mergeWithOverride(flag, override);

      flags.push({
        ...mergedFlag,
        category,
        key,
      });
    }

    return flags;
  }

  /**
   * Get list of all categories
   */
  getCategories(): string[] {
    return Object.keys(this.defaultFlags);
  }

  /**
   * Check if a feature flag exists
   */
  async flagExists(category: string, name: string): Promise<boolean> {
    const categoryFlags = this.defaultFlags[category as keyof FeatureFlagConfig];
    if (!categoryFlags) {
      return false;
    }
    return name in (categoryFlags as Record<string, FeatureFlag>);
  }

  // ==================== Private Helper Methods ====================

  /**
   * Get runtime override from Redis
   */
  private async getOverride(
    category: string,
    name: string
  ): Promise<FeatureFlagOverrideDto | null> {
    const overrideKey = `${OVERRIDE_PREFIX}${category}:${name}`;
    const overrideData = await redis.get(overrideKey);

    if (overrideData) {
      return JSON.parse(overrideData);
    }

    // Fallback to database if not in Redis
    try {
      const dbOverride = await db('feature_flag_overrides')
        .where({ category, flag_name: name })
        .first();

      if (dbOverride) {
        const override: FeatureFlagOverrideDto = {
          category: dbOverride.category,
          name: dbOverride.flag_name,
          enabled: dbOverride.enabled,
          rolloutPercentage: dbOverride.rollout_percentage,
          regions: dbOverride.regions,
          userSegments: dbOverride.user_segments,
          createdBy: dbOverride.created_by,
          createdAt: dbOverride.created_at,
          expiresAt: dbOverride.expires_at,
          reason: dbOverride.reason,
        };

        // Cache in Redis
        await redis.set(overrideKey, JSON.stringify(override), CACHE_TTL);
        return override;
      }
    } catch (error) {
      // Table might not exist
      logger.debug('Feature flag overrides table not available');
    }

    return null;
  }

  /**
   * Save runtime override to Redis and database
   */
  private async saveOverride(
    category: string,
    name: string,
    override: FeatureFlagOverrideDto
  ): Promise<void> {
    const overrideKey = `${OVERRIDE_PREFIX}${category}:${name}`;

    // Save to Redis
    await redis.set(overrideKey, JSON.stringify(override), CACHE_TTL);

    // Save to database for persistence
    try {
      await db('feature_flag_overrides')
        .insert({
          category,
          flag_name: name,
          enabled: override.enabled,
          rollout_percentage: override.rolloutPercentage,
          regions: JSON.stringify(override.regions),
          user_segments: JSON.stringify(override.userSegments),
          created_by: override.createdBy,
          created_at: override.createdAt,
          expires_at: override.expiresAt,
          reason: override.reason,
        })
        .onConflict(['category', 'flag_name'])
        .merge();
    } catch (error) {
      logger.warn('Could not save override to database:', error);
      // Continue anyway - Redis has the data
    }
  }

  /**
   * Merge default flag with override
   */
  private mergeWithOverride(
    flag: FeatureFlag,
    override: FeatureFlagOverrideDto | null
  ): FeatureFlag {
    if (!override) {
      return { ...flag };
    }

    return {
      ...flag,
      enabled: override.enabled !== undefined ? override.enabled : flag.enabled,
      rolloutPercentage:
        override.rolloutPercentage !== undefined
          ? override.rolloutPercentage
          : flag.rolloutPercentage,
      regions: override.regions !== undefined ? override.regions : flag.regions,
      userSegments: override.userSegments !== undefined ? override.userSegments : flag.userSegments,
      updatedAt: override.createdAt || flag.updatedAt,
    };
  }

  /**
   * Create empty override structure
   */
  private createEmptyOverride(
    category: string,
    name: string,
    adminId: string
  ): FeatureFlagOverrideDto {
    return {
      category,
      name,
      createdBy: adminId,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Log a change to feature flag history
   */
  private async logHistory(entry: {
    category: string;
    name: string;
    action: string;
    previousValue?: Partial<FeatureFlagDto>;
    newValue?: Partial<FeatureFlagDto>;
    changedBy: string;
    reason?: string;
  }): Promise<void> {
    try {
      await db('feature_flag_history').insert({
        category: entry.category,
        flag_name: entry.name,
        action: entry.action,
        previous_value: JSON.stringify(entry.previousValue),
        new_value: JSON.stringify(entry.newValue),
        changed_by: entry.changedBy,
        reason: entry.reason,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      // If table doesn't exist, just log to console
      logger.info('Feature flag history:', {
        ...entry,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Calculate metrics for a feature flag
   */
  private async calculateMetrics(category: string, name: string): Promise<FeatureFlagMetricsDto> {
    const flagKey = `${category}:${name}`;

    // Try to get real metrics from database
    let totalEvaluations = 0;
    let enabledEvaluations = 0;
    let disabledEvaluations = 0;
    let uniqueUsers = 0;
    let lastEvaluatedAt = new Date().toISOString();
    let evaluationsByDay: DailyEvaluationDto[] = [];
    let evaluationsBySegment: SegmentEvaluationDto[] = [];
    let evaluationsByRegion: RegionEvaluationDto[] = [];

    try {
      // Get aggregated metrics from feature_flag_evaluations table
      const metrics = (await db('feature_flag_evaluations')
        .where({ flag_key: flagKey })
        .select(
          db.raw('COUNT(*) as total'),
          db.raw('SUM(CASE WHEN result = true THEN 1 ELSE 0 END) as enabled'),
          db.raw('SUM(CASE WHEN result = false THEN 1 ELSE 0 END) as disabled'),
          db.raw('COUNT(DISTINCT user_id) as unique_users'),
          db.raw('MAX(evaluated_at) as last_evaluated')
        )
        .first()) as unknown as
        | {
            total: string;
            enabled: string;
            disabled: string;
            unique_users: string;
            last_evaluated: Date | null;
          }
        | undefined;

      if (metrics) {
        totalEvaluations = parseInt(metrics.total) || 0;
        enabledEvaluations = parseInt(metrics.enabled) || 0;
        disabledEvaluations = parseInt(metrics.disabled) || 0;
        uniqueUsers = parseInt(metrics.unique_users) || 0;
        lastEvaluatedAt = metrics.last_evaluated
          ? new Date(metrics.last_evaluated).toISOString()
          : lastEvaluatedAt;
      }

      // Get daily breakdown (last 30 days)
      const dailyMetrics = await db('feature_flag_evaluations')
        .where({ flag_key: flagKey })
        .where('evaluated_at', '>=', db.raw("NOW() - INTERVAL '30 days'"))
        .groupByRaw('DATE(evaluated_at)')
        .select(
          db.raw('DATE(evaluated_at) as date'),
          db.raw('COUNT(*) as total'),
          db.raw('SUM(CASE WHEN result = true THEN 1 ELSE 0 END) as enabled'),
          db.raw('SUM(CASE WHEN result = false THEN 1 ELSE 0 END) as disabled')
        )
        .orderBy('date', 'desc');

      evaluationsByDay = dailyMetrics.map((m: any) => ({
        date: m.date,
        total: parseInt(m.total) || 0,
        enabled: parseInt(m.enabled) || 0,
        disabled: parseInt(m.disabled) || 0,
      }));

      // Get segment breakdown
      const segmentMetrics = await db('feature_flag_evaluations')
        .where({ flag_key: flagKey })
        .whereNotNull('user_segment')
        .groupBy('user_segment')
        .select(
          'user_segment as segment',
          db.raw('COUNT(*) as total'),
          db.raw('SUM(CASE WHEN result = true THEN 1 ELSE 0 END) as enabled'),
          db.raw('SUM(CASE WHEN result = false THEN 1 ELSE 0 END) as disabled')
        );

      evaluationsBySegment = segmentMetrics.map((m: any) => ({
        segment: m.segment,
        total: parseInt(m.total) || 0,
        enabled: parseInt(m.enabled) || 0,
        disabled: parseInt(m.disabled) || 0,
      }));

      // Get region breakdown
      const regionMetrics = await db('feature_flag_evaluations')
        .where({ flag_key: flagKey })
        .whereNotNull('region')
        .groupBy('region')
        .select(
          'region',
          db.raw('COUNT(*) as total'),
          db.raw('SUM(CASE WHEN result = true THEN 1 ELSE 0 END) as enabled'),
          db.raw('SUM(CASE WHEN result = false THEN 1 ELSE 0 END) as disabled')
        );

      evaluationsByRegion = regionMetrics.map((m: any) => ({
        region: m.region,
        total: parseInt(m.total) || 0,
        enabled: parseInt(m.enabled) || 0,
        disabled: parseInt(m.disabled) || 0,
      }));
    } catch (error) {
      // Tables might not exist, return mock/empty metrics
      logger.debug('Feature flag metrics tables not available, returning empty metrics');
    }

    return {
      category,
      name,
      flagKey,
      totalEvaluations,
      enabledEvaluations,
      disabledEvaluations,
      uniqueUsers,
      enabledPercentage: totalEvaluations > 0 ? (enabledEvaluations / totalEvaluations) * 100 : 0,
      lastEvaluatedAt,
      evaluationsByDay,
      evaluationsBySegment,
      evaluationsByRegion,
    };
  }

  /**
   * Record a feature flag evaluation for metrics
   */
  async recordEvaluation(
    category: string,
    name: string,
    userId: string,
    result: boolean,
    context?: {
      region?: string;
      userSegment?: string;
    }
  ): Promise<void> {
    try {
      await db('feature_flag_evaluations').insert({
        flag_key: `${category}:${name}`,
        user_id: userId,
        result,
        region: context?.region,
        user_segment: context?.userSegment,
        evaluated_at: new Date().toISOString(),
      });
    } catch (error) {
      // Log error but don't fail the evaluation
      logger.debug('Could not record feature flag evaluation:', error);
    }
  }
}

// Export singleton instance
export const featureFlagAdminService = new FeatureFlagAdminService();
