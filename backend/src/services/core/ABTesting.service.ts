/**
 * A/B Testing Service
 * Framework for running experiments on features, pricing, and UX
 */

import { logger } from '../../utils/logger';
import crypto from 'crypto';

// Types
export interface Experiment {
  id: string;
  name: string;
  description: string;
  type: ExperimentType;
  status: ExperimentStatus;
  variants: ExperimentVariant[];
  targeting: ExperimentTargeting;
  metrics: string[];
  startDate: Date;
  endDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface ExperimentVariant {
  id: string;
  name: string;
  description: string;
  weight: number; // 0-100, percentage of traffic
  isControl: boolean;
  config: Record<string, unknown>;
}

export interface ExperimentTargeting {
  userTiers?: string[];
  countries?: string[];
  platforms?: ('ios' | 'android' | 'web')[];
  minAppVersion?: string;
  maxAppVersion?: string;
  userPercentage?: number;
  newUsersOnly?: boolean;
  registeredAfter?: Date;
  registeredBefore?: Date;
  customRules?: Array<{
    field: string;
    operator: 'eq' | 'neq' | 'gt' | 'lt' | 'in' | 'contains';
    value: unknown;
  }>;
}

export interface UserAssignment {
  experimentId: string;
  userId: string;
  variantId: string;
  assignedAt: Date;
  exposedAt?: Date;
}

export interface ExperimentEvent {
  experimentId: string;
  variantId: string;
  userId: string;
  eventType: string;
  eventData?: Record<string, unknown>;
  timestamp: Date;
}

export interface ExperimentResults {
  experimentId: string;
  variants: Array<{
    variantId: string;
    name: string;
    sampleSize: number;
    metrics: Record<string, {
      value: number;
      confidence?: number;
      improvement?: number; // vs control
    }>;
  }>;
  statisticalSignificance?: number;
  recommendedVariant?: string;
  calculatedAt: Date;
}

export type ExperimentType =
  | 'feature'
  | 'pricing'
  | 'ui'
  | 'content'
  | 'algorithm'
  | 'notification';

export type ExperimentStatus =
  | 'draft'
  | 'running'
  | 'paused'
  | 'completed'
  | 'archived';

interface UserContext {
  userId: string;
  tier?: string;
  country?: string;
  platform?: 'ios' | 'android' | 'web';
  appVersion?: string;
  registeredAt?: Date;
  customAttributes?: Record<string, unknown>;
}

class ABTestingService {
  private experiments: Map<string, Experiment> = new Map();
  private assignments: Map<string, UserAssignment[]> = new Map(); // userId -> assignments
  private events: ExperimentEvent[] = [];

  constructor() {
    // Initialize with some default experiments
    this.initializeDefaultExperiments();
  }

  /**
   * Create a new experiment
   */
  async createExperiment(
    experiment: Omit<Experiment, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Experiment> {
    const id = `exp_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    const fullExperiment: Experiment = {
      ...experiment,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Validate variant weights sum to 100
    const totalWeight = fullExperiment.variants.reduce((sum, v) => sum + v.weight, 0);
    if (totalWeight !== 100) {
      throw new Error(`Variant weights must sum to 100, got ${totalWeight}`);
    }

    // Ensure exactly one control variant
    const controlVariants = fullExperiment.variants.filter(v => v.isControl);
    if (controlVariants.length !== 1) {
      throw new Error('Experiment must have exactly one control variant');
    }

    this.experiments.set(id, fullExperiment);
    logger.info(`Created experiment: ${fullExperiment.name} (${id})`);

    return fullExperiment;
  }

  /**
   * Start an experiment
   */
  async startExperiment(experimentId: string): Promise<Experiment> {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) {
      throw new Error(`Experiment not found: ${experimentId}`);
    }

    experiment.status = 'running';
    experiment.startDate = new Date();
    experiment.updatedAt = new Date();

    this.experiments.set(experimentId, experiment);
    logger.info(`Started experiment: ${experiment.name}`);

    return experiment;
  }

  /**
   * Stop/complete an experiment
   */
  async stopExperiment(experimentId: string): Promise<Experiment> {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) {
      throw new Error(`Experiment not found: ${experimentId}`);
    }

    experiment.status = 'completed';
    experiment.endDate = new Date();
    experiment.updatedAt = new Date();

    this.experiments.set(experimentId, experiment);
    logger.info(`Stopped experiment: ${experiment.name}`);

    return experiment;
  }

  /**
   * Get variant assignment for a user
   */
  async getVariant(
    experimentKey: string,
    userContext: UserContext
  ): Promise<{
    variant: ExperimentVariant | null;
    isInExperiment: boolean;
    experimentId?: string;
  }> {
    // Find experiment by name or ID
    const experiment = Array.from(this.experiments.values())
      .find(e => e.name === experimentKey || e.id === experimentKey);

    if (!experiment || experiment.status !== 'running') {
      return { variant: null, isInExperiment: false };
    }

    // Check targeting rules
    if (!this.matchesTargeting(userContext, experiment.targeting)) {
      return { variant: null, isInExperiment: false };
    }

    // Check for existing assignment
    const userAssignments = this.assignments.get(userContext.userId) || [];
    let assignment = userAssignments.find(a => a.experimentId === experiment.id);

    if (!assignment) {
      // Assign user to variant
      const variant = this.selectVariant(userContext.userId, experiment);
      assignment = {
        experimentId: experiment.id,
        userId: userContext.userId,
        variantId: variant.id,
        assignedAt: new Date(),
      };

      userAssignments.push(assignment);
      this.assignments.set(userContext.userId, userAssignments);

      // Track assignment event
      await this.trackEvent(experiment.id, variant.id, userContext.userId, 'assigned');

      logger.debug(`Assigned user ${userContext.userId} to variant ${variant.name} in experiment ${experiment.name}`);
    }

    const variant = experiment.variants.find(v => v.id === assignment!.variantId)!;

    return {
      variant,
      isInExperiment: true,
      experimentId: experiment.id,
    };
  }

  /**
   * Get feature flag value (convenience method)
   */
  async getFeatureFlag<T>(
    featureName: string,
    userContext: UserContext,
    defaultValue: T
  ): Promise<T> {
    const { variant, isInExperiment } = await this.getVariant(featureName, userContext);

    if (!isInExperiment || !variant) {
      return defaultValue;
    }

    return (variant.config.value as T) ?? defaultValue;
  }

  /**
   * Track experiment event
   */
  async trackEvent(
    experimentId: string,
    variantId: string,
    userId: string,
    eventType: string,
    eventData?: Record<string, unknown>
  ): Promise<void> {
    const event: ExperimentEvent = {
      experimentId,
      variantId,
      userId,
      eventType,
      eventData,
      timestamp: new Date(),
    };

    this.events.push(event);

    logger.debug(`Tracked event: ${eventType} for experiment ${experimentId}`);
  }

  /**
   * Track conversion event
   */
  async trackConversion(
    userId: string,
    conversionType: string,
    value?: number
  ): Promise<void> {
    const userAssignments = this.assignments.get(userId) || [];

    for (const assignment of userAssignments) {
      await this.trackEvent(
        assignment.experimentId,
        assignment.variantId,
        userId,
        `conversion_${conversionType}`,
        { value }
      );
    }
  }

  /**
   * Get experiment results
   */
  async getExperimentResults(experimentId: string): Promise<ExperimentResults> {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) {
      throw new Error(`Experiment not found: ${experimentId}`);
    }

    const experimentEvents = this.events.filter(e => e.experimentId === experimentId);

    const variantResults = experiment.variants.map(variant => {
      const variantEvents = experimentEvents.filter(e => e.variantId === variant.id);
      const uniqueUsers = new Set(variantEvents.map(e => e.userId)).size;

      // Calculate metrics
      const assignments = variantEvents.filter(e => e.eventType === 'assigned').length;
      const conversions = variantEvents.filter(e => e.eventType.startsWith('conversion_')).length;
      const conversionRate = assignments > 0 ? (conversions / assignments) * 100 : 0;

      return {
        variantId: variant.id,
        name: variant.name,
        sampleSize: uniqueUsers,
        metrics: {
          assignments: { value: assignments },
          conversions: { value: conversions },
          conversionRate: { value: conversionRate, improvement: 0 },
        },
      };
    });

    // Calculate improvement vs control
    const controlVariant = variantResults.find(v =>
      experiment.variants.find(ev => ev.id === v.variantId)?.isControl
    );

    if (controlVariant) {
      const controlRate = controlVariant.metrics.conversionRate.value;
      for (const variant of variantResults) {
        if (variant.variantId !== controlVariant.variantId) {
          const improvement = controlRate > 0
            ? ((variant.metrics.conversionRate.value - controlRate) / controlRate) * 100
            : 0;
          variant.metrics.conversionRate.improvement = improvement;
        }
      }
    }

    return {
      experimentId,
      variants: variantResults,
      calculatedAt: new Date(),
    };
  }

  /**
   * List all experiments
   */
  async listExperiments(filters?: {
    status?: ExperimentStatus;
    type?: ExperimentType;
  }): Promise<Experiment[]> {
    let experiments = Array.from(this.experiments.values());

    if (filters?.status) {
      experiments = experiments.filter(e => e.status === filters.status);
    }
    if (filters?.type) {
      experiments = experiments.filter(e => e.type === filters.type);
    }

    return experiments.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Get experiment by ID
   */
  async getExperiment(experimentId: string): Promise<Experiment | null> {
    return this.experiments.get(experimentId) || null;
  }

  // Private helper methods

  private matchesTargeting(user: UserContext, targeting: ExperimentTargeting): boolean {
    // Check tier
    if (targeting.userTiers && user.tier && !targeting.userTiers.includes(user.tier)) {
      return false;
    }

    // Check country
    if (targeting.countries && user.country && !targeting.countries.includes(user.country)) {
      return false;
    }

    // Check platform
    if (targeting.platforms && user.platform && !targeting.platforms.includes(user.platform)) {
      return false;
    }

    // Check user percentage (deterministic based on user ID)
    if (targeting.userPercentage && targeting.userPercentage < 100) {
      const hash = this.hashUserId(user.userId, 'targeting');
      if ((hash % 100) >= targeting.userPercentage) {
        return false;
      }
    }

    // Check new users only
    if (targeting.newUsersOnly && user.registeredAt) {
      const daysSinceRegistration = Math.floor(
        (Date.now() - user.registeredAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceRegistration > 7) {
        return false;
      }
    }

    // Check registration date
    if (targeting.registeredAfter && user.registeredAt && user.registeredAt < targeting.registeredAfter) {
      return false;
    }
    if (targeting.registeredBefore && user.registeredAt && user.registeredAt > targeting.registeredBefore) {
      return false;
    }

    // Check custom rules
    if (targeting.customRules && user.customAttributes) {
      for (const rule of targeting.customRules) {
        const value = user.customAttributes[rule.field];
        if (!this.evaluateRule(value, rule.operator, rule.value)) {
          return false;
        }
      }
    }

    return true;
  }

  private evaluateRule(
    userValue: unknown,
    operator: string,
    ruleValue: unknown
  ): boolean {
    switch (operator) {
      case 'eq':
        return userValue === ruleValue;
      case 'neq':
        return userValue !== ruleValue;
      case 'gt':
        return typeof userValue === 'number' && typeof ruleValue === 'number' && userValue > ruleValue;
      case 'lt':
        return typeof userValue === 'number' && typeof ruleValue === 'number' && userValue < ruleValue;
      case 'in':
        return Array.isArray(ruleValue) && ruleValue.includes(userValue);
      case 'contains':
        return typeof userValue === 'string' && typeof ruleValue === 'string' && userValue.includes(ruleValue);
      default:
        return true;
    }
  }

  private selectVariant(userId: string, experiment: Experiment): ExperimentVariant {
    // Deterministic selection based on user ID and experiment ID
    const hash = this.hashUserId(userId, experiment.id);
    const bucket = hash % 100;

    let cumulative = 0;
    for (const variant of experiment.variants) {
      cumulative += variant.weight;
      if (bucket < cumulative) {
        return variant;
      }
    }

    // Fallback to last variant
    return experiment.variants[experiment.variants.length - 1];
  }

  private hashUserId(userId: string, salt: string): number {
    const hash = crypto.createHash('md5')
      .update(`${userId}:${salt}`)
      .digest('hex');
    return parseInt(hash.slice(0, 8), 16);
  }

  private initializeDefaultExperiments(): void {
    // Pricing experiment
    this.experiments.set('exp_pricing_v2', {
      id: 'exp_pricing_v2',
      name: 'subscription_pricing_v2',
      description: 'Test new subscription pricing tiers',
      type: 'pricing',
      status: 'running',
      variants: [
        {
          id: 'control',
          name: 'Control (Current Pricing)',
          description: 'Current pricing structure',
          weight: 50,
          isControl: true,
          config: {
            gold: 29.99,
            platinum: 49.99,
            diamond: 99.99,
          },
        },
        {
          id: 'variant_a',
          name: 'Variant A (Lower Entry)',
          description: 'Lower entry price, higher premium',
          weight: 50,
          isControl: false,
          config: {
            gold: 19.99,
            platinum: 44.99,
            diamond: 109.99,
          },
        },
      ],
      targeting: {
        userPercentage: 100,
        newUsersOnly: false,
      },
      metrics: ['subscription_conversion', 'revenue_per_user', 'churn_rate'],
      startDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system',
    });

    // Super Like position experiment
    this.experiments.set('exp_super_like_position', {
      id: 'exp_super_like_position',
      name: 'super_like_button_position',
      description: 'Test different positions for super like button',
      type: 'ui',
      status: 'running',
      variants: [
        {
          id: 'control',
          name: 'Control (Top)',
          description: 'Super like button at top',
          weight: 34,
          isControl: true,
          config: {
            position: 'top',
          },
        },
        {
          id: 'variant_center',
          name: 'Variant Center',
          description: 'Super like button in center',
          weight: 33,
          isControl: false,
          config: {
            position: 'center',
          },
        },
        {
          id: 'variant_swipe',
          name: 'Variant Swipe Up',
          description: 'Super like via swipe up gesture',
          weight: 33,
          isControl: false,
          config: {
            position: 'swipe_up',
          },
        },
      ],
      targeting: {
        platforms: ['ios', 'android'],
        userPercentage: 50,
      },
      metrics: ['super_like_usage', 'match_rate', 'engagement'],
      startDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system',
    });

    // AI matchmaking experiment
    this.experiments.set('exp_ai_matching_v2', {
      id: 'exp_ai_matching_v2',
      name: 'ai_matchmaking_algorithm_v2',
      description: 'Test enhanced AI matching algorithm',
      type: 'algorithm',
      status: 'running',
      variants: [
        {
          id: 'control',
          name: 'Control (V1)',
          description: 'Current matching algorithm',
          weight: 50,
          isControl: true,
          config: {
            algorithm: 'v1',
            useEmbeddings: false,
          },
        },
        {
          id: 'variant_v2',
          name: 'Variant V2',
          description: 'New embedding-based algorithm',
          weight: 50,
          isControl: false,
          config: {
            algorithm: 'v2',
            useEmbeddings: true,
            similarityThreshold: 0.75,
          },
        },
      ],
      targeting: {
        userTiers: ['GOLD', 'PLATINUM', 'DIAMOND'],
        userPercentage: 100,
      },
      metrics: ['match_rate', 'message_rate', 'conversation_length', 'unmatch_rate'],
      startDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system',
    });
  }
}

export const abTestingService = new ABTestingService();
